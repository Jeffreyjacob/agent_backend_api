import {
  Booking,
  Subscription,
  SubscriptionDuration,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@prisma/client";
import { stripe } from "../../config/stripe";
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  TRIAL_LIMIT,
} from "../../shared/constants/subscriptionPlans";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/error";
import { PropertyRepository } from "../property/property.repository";
import { UserRepositrory } from "../users/user.repository";
import {
  ICancelSubscriptionPayload,
  IChangePlanPayload,
  IConfirmSubscriptionIntentPayload,
  IPaymentMethodPayload,
  IPaymentMethodResponse,
  IRestartSubscriptionPayload,
  ISetupIntentResponse,
  ISubscriptionResponse,
} from "./subscription.interface";
import { SubscriptionRepository } from "./subscription.repository";
import Stripe from "stripe";
import { prisma } from "../../config/database";
import { generateSubscriptionCycleId } from "../../shared/utils/helper";
import { logger } from "../../config/logger";
import { getSubscriptionQueue } from "../../jobs/queues/subscription";
import { getEmailQueue } from "../../jobs/queues/email";
import { subscriptionActiveEmail } from "../../shared/utils/emailTemplate/subscriptionActiveEmail";
import { bookingCancelledBuyerEmail } from "../../shared/utils/emailTemplate/bookingCancelledBuyerEmail";

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepo: SubscriptionRepository,
    private readonly userRepo: UserRepositrory,
    private readonly propertyRepo: PropertyRepository,
  ) {}

  async setupIntent(userId: string): Promise<ISetupIntentResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("unable to find user");

    const existingSubscription = await this.subscriptionRepo.findByUser(userId);
    if (
      existingSubscription &&
      (existingSubscription.status === "ACTIVE" ||
        existingSubscription.status === "TRIAL")
    )
      throw new ConflictError("you already have an active subscription");

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });

      stripeCustomerId = customer.id;

      await this.userRepo.update(
        {
          id: userId,
        },
        {
          stripeCustomerId: customer.id,
        },
      );
    }

    // Case 2: Returning user — check if they already have a payment method
    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
    });

    const hasPaymentMethod = existingPaymentMethods.data.length > 0;

    if (hasPaymentMethod) {
      // Return existing payment methods so frontend can let user pick one
      // or use the default
      const customer = (await stripe.customers.retrieve(
        stripeCustomerId,
      )) as Stripe.Customer;
      const defaultPaymentMethodId = customer.invoice_settings
        ?.default_payment_method as string;

      return {
        requiresPaymentMethod: false,
        customerId: stripeCustomerId,
        paymentMethod:
          defaultPaymentMethodId || existingPaymentMethods.data[0].id,
      };
    }

    // Case 1: New user — no payment method, create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      metadata: { userId },
    });

    return {
      requiresPaymentMethod: true,
      clientSecret: setupIntent.client_secret!,
      customerId: stripeCustomerId,
    };
  }

  private async formatSubscriptionResponse(
    subscription: Subscription,
    userId: any,
  ): Promise<ISubscriptionResponse> {
    const currentPackage = await prisma.packageRecord.findFirst({
      where: {
        subscriptionId: subscription.id,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    return {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      price: subscription.price,
      usage: {
        propertiesUsed: currentPackage?.propertiesUsed ?? 0,
        maxProperties: subscription.maxProperties,
        featuredListingUsed: currentPackage?.featuredListingsUsed ?? 0,
        maxFeaturedListings: subscription.maxFeatureListings!,
      },
    };
  }

  async confirmSubscription(
    userId: string,
    data: IConfirmSubscriptionIntentPayload,
  ): Promise<ISubscriptionResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("unable to find user");

    if (!user.stripeCustomerId) {
      throw new BadRequestError("Please complete card setup first");
    }

    const subscription = await this.subscriptionRepo.findOne({
      userId,
    });

    if (subscription)
      throw new BadRequestError(
        "This user already have an existing subscription, if subscription is already cancelled, user the  resubscribe endpoint to restart subscription",
      );

    const setupIntent = await stripe.setupIntents.retrieve(data.setupIntentId);
    if (setupIntent.status !== "succeeded") {
      throw new BadRequestError(
        "Card setup was not completed.Please add your card first",
      );
    }

    const planLimits = PLAN_LIMITS[data.plan];
    const planStripeId = PLAN_PRICES[data.plan][data.durartion];
    if (!planStripeId) throw new BadRequestError("Invalid plan selected");

    const customer = (await stripe.customers.retrieve(
      user.stripeCustomerId,
    )) as Stripe.Customer;

    const paymentMethodId = setupIntent.payment_method as string;

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const now = new Date();
    const trialEnd = new Date(
      now.getTime() + planLimits.trialDays * 24 * 60 * 60 * 1000,
    );

    const stripeSubscription = await stripe.subscriptions.create(
      {
        customer: user.stripeCustomerId,
        items: [{ price: planStripeId! }],
        trial_end: Math.floor(trialEnd.getTime() / 1000),
        default_payment_method: paymentMethodId,
        metadata: { userId, plan: data.plan },
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      },
      {
        idempotencyKey: `subscription:create:${userId}:${data.plan}`,
      },
    );

    const subscriptionCycleId = generateSubscriptionCycleId(
      stripeSubscription.id,
      now,
    );

    const subscrtiption = await this.subscriptionRepo.create({
      userId,
      plan: data.plan,
      status: SubscriptionStatus.TRIAL,
      duration: data.durartion,
      stripeSubscriptionId: stripeSubscription.id,
      subscriptionCycleId,
      price: planLimits.price[data.durartion],
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      maxProperties: TRIAL_LIMIT[data.plan].maxProperties,
      maxFeatureListings: TRIAL_LIMIT[data.plan].maxFeaturedListings,
    });

    await prisma.packageRecord.create({
      data: {
        userId,
        subscriptionId: subscrtiption.id,
        subscriptionCycleId: subscriptionCycleId,
        plan: data.plan,
        stripeSubscriptionid: stripeSubscription.id,
        isTrial: true,
        startDate: now,
        endDate: trialEnd,
      },
    });

    const reminderTIme = new Date(trialEnd.getTime() - 3 * 24 * 60 * 60 * 1000);
    const reminderDelay = reminderTIme.getTime() - Date.now();

    if (reminderDelay > 0) {
      try {
        const subQueue = getSubscriptionQueue();
        await subQueue.add(
          "trialEndingReminder",
          {
            subscrtiptionId: subscrtiption.id,
            userId,
          },
          {
            delay: reminderDelay,
          },
        );
      } catch (error: any) {
        logger.warn({ err: error }, "unable to schedule trial ending reminder");
      }
    }
    // send welcome email
    try {
      const emailQueue = getEmailQueue();
      await emailQueue.add("email", {
        email: user.email,
        subject: "Welcome! Your free trial has started",
        html: subscriptionActiveEmail({
          firstName: user.firstName,
          plan: data.plan,
          trialEndDate: trialEnd.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          maxProperties: planLimits.maxProperties!,
          maxFeaturedListings: planLimits.maxFeaturedListings!,
        }),
      });
    } catch (err: any) {
      logger.warn({ err }, "unable to send subscription welcome email");
    }

    return this.formatSubscriptionResponse(subscrtiption, userId);
  }

  async resubscribe(
    userId: string,
    data: IRestartSubscriptionPayload,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    if (!user.stripeCustomerId)
      throw new NotFoundError("No stripe customer found");

    const subscription = await this.subscriptionRepo.findOne({
      userId,
    });

    if (!subscription)
      throw new NotFoundError("unable to find user subscription");

    if (subscription.status === "ACTIVE" || subscription.status === "TRIAL")
      throw new BadRequestError("You already have an active subscription");

    const planLimit = PLAN_LIMITS[data.plan];
    const planStripeId = PLAN_PRICES[data.plan][data.durartion];
    if (!planStripeId) throw new BadRequestError("Invalid plan selected");

    const customer = (await stripe.customers.retrieve(
      user.stripeCustomerId,
    )) as Stripe.Customer;

    const default_payment_method =
      customer.invoice_settings.default_payment_method;

    if (!default_payment_method)
      throw new BadRequestError(
        "No payment method found. Please add a payment method first",
      );

    const stripeSubscription = await stripe.subscriptions.create(
      {
        customer: user.stripeCustomerId,
        items: [{ price: planStripeId }],
        default_payment_method: default_payment_method as string,
        payment_behavior: "default_incomplete",
      },
      {
        idempotencyKey: `subscription:resubscribe:${userId}:${data.plan}:${subscription.id}`,
      },
    );

    const updatedSubscription = await this.subscriptionRepo.update(
      {
        id: subscription.id,
      },
      {
        duration: data.durartion,
        plan: data.plan,
        status: SubscriptionStatus.INCOMPLETE,
        price: planLimit.price[data.durartion],
        stripeSubscriptionId: stripeSubscription.id,
      },
    );

    if (!updatedSubscription)
      throw new BadRequestError("unable to update subscription");

    return {
      message:
        "Your request is being processed and you will notified onnce your subscription is actived",
    };
  }

  async getMySubscription(userId: string): Promise<ISubscriptionResponse> {
    const subscription = await this.subscriptionRepo.findByUser(userId);
    if (!subscription) throw new NotFoundError("No active subscription found");
    return this.formatSubscriptionResponse(subscription, userId);
  }

  async cancelSubscription(
    userId: string,
    data: ICancelSubscriptionPayload,
  ): Promise<{ message: string }> {
    const subscription = await this.subscriptionRepo.findByUser(userId);
    if (!subscription) throw new NotFoundError("No active subscription found");

    if (
      subscription.status === SubscriptionStatus.CANCELLED ||
      subscription.status === SubscriptionStatus.EXPIRED
    )
      throw new BadRequestError("subscription is already cancelled");

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestError("Invalid subscription state");
    }

    if (data.cancelImmediately) {
      // cancel now - agent losses access immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
        cancellation_details: { comment: "Cancelled by agent" },
      });

      await this.subscriptionRepo.update(
        {
          id: subscription.id,
        },
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      );

      await this.deactivateAgentListings(userId);
    } else {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await this.subscriptionRepo.update(
        {
          id: subscription.id,
        },
        { cancelRequested: true },
      );
    }

    return {
      message: data.cancelImmediately
        ? "Subscription cancelled immediately. Your listings have been deactived."
        : "Subscription will be cancelled at the end of your billing period",
    };
  }

  async resumeSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepo.findOne({
      userId,
      cancelRequested: true,
    });
    if (!subscription)
      throw new NotFoundError("No cancel subscription to resume");

    if (!subscription.stripeSubscriptionId)
      throw new NotFoundError("No stripe subscription id ");

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    const updatedSubscription = await this.subscriptionRepo.update(
      {
        id: subscription.id,
      },
      {
        cancelRequested: false,
        cancelledAt: null,
      },
    );

    if (!updatedSubscription)
      throw new BadRequestError("unable to update subscription");

    return updatedSubscription;
  }

  async changePlan(
    userId: string,
    data: IChangePlanPayload,
  ): Promise<ISubscriptionResponse> {
    const subscription = await this.subscriptionRepo.findByUser(userId);
    if (!subscription) throw new NotFoundError("no active subscription found");

    if (subscription.plan === data.newPlan) {
      throw new BadRequestError("You are already on this plan");
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestError("Invalid subscription state");
    }

    const newPlanLimits = PLAN_LIMITS[data.newPlan];
    const stripePriceId = PLAN_PRICES[data.newPlan][data.duration];
    if (!stripePriceId) {
      throw new BadRequestError("invalid plan selected");
    }

    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
    );

    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSub.items.data[0].id,
            price: stripePriceId,
          },
        ],
        proration_behavior: "create_prorations",
        metadata: { plan: data.newPlan },
      },
      {
        idempotencyKey: `subscription:plan_change:${userId}:${data.newPlan}:${Date.now()}`,
      },
    );

    const isDowngrade =
      subscription.plan === "PREMIUM" && data.newPlan === "BASIC";

    if (isDowngrade) {
      await this.handleDowngrade(userId, data.newPlan);
    }

    const updatedSubscription = await this.subscriptionRepo.update(
      { id: subscription.id },
      {
        plan: data.newPlan,
        price: newPlanLimits.price[data.duration],
        maxProperties: newPlanLimits.maxProperties,
        maxFeatureListings: newPlanLimits.maxFeaturedListings,
      },
    );

    return this.formatSubscriptionResponse(updatedSubscription, userId);
  }

  async initiatePaymentMethod(
    userId: string,
  ): Promise<{ clientSecret: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
        },
      });

      stripeCustomerId = customer.id;

      await this.userRepo.update(
        {
          id: user.id,
        },
        {
          stripeCustomerId: customer.id,
        },
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: "off_session",
      payment_method_types: ["card"],
    });

    return {
      clientSecret: setupIntent.client_secret!,
    };
  }

  async confirmAddPaymentMethod(
    userId: string,
    data: IPaymentMethodPayload,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user?.stripeCustomerId)
      throw new NotFoundError("no stripe customer found");

    const newPaymentMethod = await stripe.paymentMethods.retrieve(
      data.paymenMethodId,
    );

    const newFingerprint = newPaymentMethod.card?.fingerprint;
    if (!newFingerprint)
      throw new BadRequestError(
        "Could not retrieve card fingerprint of this payment method",
      );

    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const existingMatch = existingPaymentMethods.data.find(
      (pm) => pm.card?.fingerprint === newFingerprint,
    );

    if (existingMatch) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: existingMatch.id },
      });

      return {
        message: "Payment method already exists and has been set as default",
      };
    }

    await stripe.paymentMethods.attach(data.paymenMethodId, {
      customer: user.stripeCustomerId,
    });

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: data.paymenMethodId },
    });

    return {
      message: "Payment method has been added ",
    };
  }

  async setDefaultPaymentMethod(
    userId: string,
    data: IPaymentMethodPayload,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    if (!user.stripeCustomerId)
      throw new NotFoundError("No stripe customer found");

    const pm = await stripe.paymentMethods.retrieve(data.paymenMethodId);

    if (pm.customer !== user.stripeCustomerId)
      throw new BadRequestError("Card does not belong to customer");

    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: data.paymenMethodId },
    });

    return {
      message: "Default card has been updated",
    };
  }

  async deletePaymentMethod(
    userId: string,
    data: IPaymentMethodPayload,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    if (!user.stripeCustomerId)
      throw new NotFoundError("No stripe customer found");

    const existingPaymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const checkIfPaymentExist = existingPaymentMethods.data.find(
      (pm) => pm.id === data.paymenMethodId,
    );

    if (!checkIfPaymentExist)
      throw new NotFoundError(
        "unable to find payment method in customer payment method list",
      );

    const customer = (await stripe.customers.retrieve(
      user.stripeCustomerId,
    )) as Stripe.Customer;

    const default_payment_method =
      customer.invoice_settings.default_payment_method;

    if (data.paymenMethodId === default_payment_method)
      throw new BadRequestError("You can't delete your default payment method");

    await stripe.paymentMethods.detach(data.paymenMethodId);

    return {
      message: "payment method has been deleted",
    };
  }

  async getCustomerCards(userId: string): Promise<IPaymentMethodResponse[]> {
    const user = await this.userRepo.findById(userId);

    if (!user) throw new NotFoundError("unable to find user");

    if (!user.stripeCustomerId)
      throw new NotFoundError("No stripe customer found");

    const method = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });

    const customer = (await stripe.customers.retrieve(
      user.stripeCustomerId,
    )) as Stripe.Customer;

    const default_payment_method =
      customer.invoice_settings.default_payment_method;

    const cards = method.data.map((pm) => ({
      id: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      exp_month: pm.card!.exp_month,
      exp_year: pm.card!.exp_year,
      isDefault: pm.id === default_payment_method,
    }));

    return cards;
  }

  async deactivateAgentListings(userId: string): Promise<void> {
    let bookings: Booking[] = [];
    await prisma.$transaction(async (tx) => {
      await this.propertyRepo.updateMany({
        where: {
          agentId: userId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
        data: { status: "INACTIVE" },
      });

      bookings = await prisma.booking.findMany({
        where: {
          agentId: userId,
          status: "PENDING",
        },
      });

      await tx.booking.updateMany({
        where: {
          agentId: userId,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
          cancelReason: "Agent subscription expired",
        },
      });
    });

    const emailJob = getEmailQueue();

    for (const booking of bookings) {
      const buyer = await this.userRepo.findById(booking.buyerId);
      if (!buyer) continue;

      const property = await this.propertyRepo.findById(booking.propertyId);
      if (!property) continue;

      try {
        await emailJob.add("email", {
          email: buyer.email,
          subject: "Booking Cancelled",
          html: bookingCancelledBuyerEmail({
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            bookingId: booking.id,
            agentName: booking.agentId,
            propertyTitle: property.title,
            propertyAddress: property.address,
            viewingDate: booking.startTime.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            viewingTime: booking.startTime.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cancelReason: booking.cancelReason,
          }),
        });
      } catch (error: any) {
        logger.warn({ err: error }, "unable to add cancel email job to queue");
      }
    }
  }

  private async handleDowngrade(
    userId: string,
    newPlan: SubscriptionPlan,
  ): Promise<void> {
    const newLimits = PLAN_LIMITS[newPlan];

    if (newLimits.maxProperties !== null) {
      const activeProperties = await this.propertyRepo.count({
        agentId: userId,
        status: { in: ["ACTIVE", "PENDING"] },
      });

      if (activeProperties > newLimits.maxProperties) {
        const excessCount = activeProperties - newLimits.maxProperties;
        const propertiesToDeactivate = await this.propertyRepo.findMany({
          where: {
            agentId: userId,
            status: { in: ["ACTIVE", "PENDING"] },
          },
          orderBy: { createdAt: "asc" },
          limit: excessCount,
        });

        await this.propertyRepo.updateMany({
          where: {
            id: { in: propertiesToDeactivate.data.map((p) => p.id) },
          },
          data: { status: "INACTIVE" },
        });

        logger.info(
          { userId, deactivated: excessCount },
          "Deactivated excess properties due to plan downgrade",
        );
      }
    }
  }
}
