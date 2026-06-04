import { Prisma, WebhookEvent } from "@prisma/client";
import { BaseRepository } from "../../shared/repository/baseRepository";
import { prisma } from "../../config/database";

export class WebHookEventRepository extends BaseRepository<
  Prisma.WebhookEventDelegate,
  WebhookEvent
> {
  constructor() {
    super(prisma.webhookEvent as any);
  }

  async findByEventId(eventId: string): Promise<WebhookEvent | null> {
    return await this.findById(eventId);
  }

  async eventUpsert(data: {
    eventId: string;
    eventType: string;
    payload: any;
    status: string;
  }): Promise<WebhookEvent> {
    return await this.upsert({
      where: { eventId: data.eventId },
      create: data,
      update: { status: data.status },
    });
  }

  async updateStatus(
    eventId: string,
    status: string,
    error?: string,
  ): Promise<void> {
    await this.update(
      {
        eventId,
      },
      {
        status,
        ...(error && { error }),
        ...(status === "PROCESSED" && { processedAt: new Date() }),
      },
    );
  }

  async findWebhookEvents(options: {
    status?: string;
    page?: number;
    limit: number;
  }): Promise<{
    data: WebhookEvent[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let where: Prisma.Args<Prisma.WebhookEventDelegate, "findMany">["where"] =
      {};

    if (options.status) {
      where.status = options.status;
    }

    return this.findMany({
      where,
      page: options.page,
      limit: options.limit,
    });
  }
}
