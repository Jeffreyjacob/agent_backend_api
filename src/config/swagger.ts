import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Real Estate API",
      version: "1.0.0",
      description: `

Production-grade Real Estate REST API.

## How to Authenticate
1. Register an account via \`POST /auth/register/buyer\` or \`POST /auth/register/agent\`
2. Verify your email via \`POST /auth/verify-email\`
3. Login via \`POST /auth/login\` — copy the \`accessToken\` from the response
4. Click **Authorize** button above → paste the token → click Authorize

## Stripe Payment Endpoints
Some endpoints require Stripe.js on the frontend and **cannot be tested in Swagger UI**.
These are marked with ⚠️ in their description.

### Test Cards (Stripe Test Mode)
| Card Number | Scenario |
|---|---|
| 4242 4242 4242 4242 | Payment succeeds |
| 4000 0025 0000 3155 | Requires 3D Secure |
| 4000 0000 0000 9995 | Payment declined |

Use any future expiry date and any 3-digit CVV.

### Testing Webhooks Locally
\`\`\`
stripe listen --forward-to localhost:3000/api/v1/payments/webhook
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
\`\`\`

## Rate Limits
| Limit Type | Max Requests | Window |
|---|---|---|
| Global (per IP) | 100 | 15 minutes |
| Auth endpoints | 10 | 15 minutes |
| Authenticated users | 200 | 15 minutes |
      `,
      contact: {
        name: "RealNest Support",
        email: "support@realnest.com",
      },
    },
    servers: [
      {
        url:
          env.NODE_ENV === "production"
            ? "https://your-app.railway.app/api/v1"
            : `http://localhost:${env.PORT}/api/v1`,
        description:
          env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "JWT access token from POST /auth/login. Expires in 15 minutes.",
        },
      },
      schemas: {
        // ── Base Response Shapes (matching ResponseHelper) ─────────────────

        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Operation successful" },
            data: { type: "object" },
          },
        },

        SuccessResponseWithMeta: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: {
              type: "array",
              items: { type: "object" },
            },
            meta: {
              type: "object",
              properties: {
                total: { type: "integer", example: 100 },
                page: { type: "integer", example: 1 },
                totalPages: { type: "integer", example: 7 },
              },
            },
          },
        },

        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "NOT_FOUND" },
                details: {
                  type: "array",
                  items: { type: "object" },
                },
              },
            },
          },
        },

        // ── Domain Schemas ─────────────────────────────────────────────────

        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            role: {
              type: "string",
              enum: ["BUYER", "AGENT", "ADMIN"],
            },
            isActive: { type: "boolean" },
            emailVerified: { type: "boolean" },
            defaultViewingDuration: {
              type: "integer",
              nullable: true,
              description: "Agent only — default viewing duration in minutes",
            },
            lastLogin: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Property: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["FOR_SALE", "FOR_RENT"] },
            category: {
              type: "string",
              enum: [
                "APARTMENT",
                "HOUSE",
                "DUPLEX",
                "LAND",
                "COMMERCIAL",
                "WAREHOUSE",
              ],
            },
            status: {
              type: "string",
              enum: [
                "DRAFT",
                "ACTIVE",
                "PENDING",
                "SOLD",
                "RENTED",
                "INACTIVE",
              ],
            },
            price: { type: "number", example: 85000000 },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            country: { type: "string" },
            latitude: { type: "number", nullable: true },
            longitude: { type: "number", nullable: true },
            bedrooms: { type: "integer", nullable: true },
            bathrooms: { type: "integer", nullable: true },
            squareFootage: { type: "number", nullable: true },
            viewingDuration: {
              type: "integer",
              nullable: true,
              description: "Minutes. Overrides agent default.",
            },
            featured: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            agent: {
              type: "object",
              properties: {
                id: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                email: { type: "string" },
              },
            },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  url: { type: "string" },
                  isPrimary: { type: "boolean" },
                },
              },
            },
          },
        },

        Booking: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            propertyId: { type: "string" },
            buyerId: { type: "string" },
            agentId: { type: "string" },
            status: {
              type: "string",
              enum: [
                "PENDING",
                "CONFIRMED",
                "CANCELLED",
                "COMPLETED",
                "NO_SHOW",
              ],
            },
            startTime: { type: "string", format: "date-time" },
            endTime: { type: "string", format: "date-time" },
            notes: { type: "string", nullable: true },
            cancelReason: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Review: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            rating: { type: "number", minimum: 0.5, maximum: 5 },
            comment: { type: "string" },
            user: {
              type: "object",
              properties: {
                firstName: { type: "string" },
                lastName: { type: "string" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        Subscription: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            plan: { type: "string", enum: ["BASIC", "PREMIUM"] },
            status: {
              type: "string",
              enum: [
                "TRIALING",
                "ACTIVE",
                "PAST_DUE",
                "GRACE_PERIOD",
                "CANCELLED",
                "EXPIRED",
              ],
            },
            currentPeriodStart: { type: "string", format: "date-time" },
            currentPeriodEnd: { type: "string", format: "date-time" },
            price: { type: "number" },
            usage: {
              type: "object",
              properties: {
                propertiesUsed: { type: "integer" },
                maxProperties: { type: "integer", nullable: true },
                featuredListingUsed: { type: "integer" },
                maxFeaturedListings: { type: "integer" },
              },
            },
          },
        },

        WebhookEvent: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventId: { type: "string", example: "evt_1ABC..." },
            eventType: {
              type: "string",
              example: "invoice.paid",
            },
            status: {
              type: "string",
              enum: ["PENDING", "PROCESSED", "FAILED"],
            },
            error: { type: "string", nullable: true },
            processedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        PaymentMethod: {
          type: "object",
          properties: {
            id: {
              type: "string",
              example: "pm_1ABC123def456",
              description: "Stripe payment method ID",
            },
            brand: {
              type: "string",
              example: "visa",
              description: "Card brand — visa, mastercard, amex",
            },
            last4: {
              type: "string",
              example: "4242",
              description: "Last 4 digits of card",
            },
            exp_month: { type: "integer", example: 12 },
            exp_year: { type: "integer", example: 2027 },
            isDefault: {
              type: "boolean",
              description: "Whether this is the default payment method",
            },
          },
        },
      },

      // ── Reusable Responses ───────────────────────────────────────────────
      responses: {
        Unauthorized: {
          description: "Access token missing or invalid",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "No token provided, you must log in",
                error: { code: "UNAUTHORIZED" },
              },
            },
          },
        },
        Forbidden: {
          description: "Insufficient permissions for this action",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "You don't have permission to this endpoint",
                error: { code: "FORBIDDEN" },
              },
            },
          },
        },
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Resource not found",
                error: { code: "NOT_FOUND" },
              },
            },
          },
        },
        ValidationError: {
          description: "Request validation failed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Validation failed",
                error: {
                  code: "VALIDATION_ERROR",
                  details: [
                    {
                      field: "email",
                      message: "email must be a valid email",
                    },
                  ],
                },
              },
            },
          },
        },
        Conflict: {
          description: "Resource already exists",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Resource already exists",
                error: { code: "CONFLICT" },
              },
            },
          },
        },
        TooManyRequests: {
          description: "Rate limit exceeded",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: {
                success: false,
                message: "Too many requests, please try again later",
                error: { code: "TOO_MANY_REQUESTS" },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/**/*.ts", "./dist/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
