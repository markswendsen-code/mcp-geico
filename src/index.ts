#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  login,
  logout,
  getQuote,
  listPolicies,
  getPolicy,
  updatePolicy,
  listClaims,
  getClaim,
  fileClaim,
  getPaymentHistory,
  schedulePayment,
  makePayment,
  getDigitalIdCards,
  requestRoadsideAssistance,
  getRoadsideStatus,
  reportAccident,
  type QuoteRequest,
  type ClaimFilingRequest,
  type RoadsideRequest,
  type AccidentReport,
  type ScheduledPayment,
} from "./api.js";
import { loadSession, clearSession } from "./auth.js";

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "geico", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Auth
    {
      name: "geico_status",
      description: "Check GEICO account login status",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "geico_login",
      description: "Log in to a GEICO account with email and password",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "GEICO account email address" },
          password: { type: "string", description: "GEICO account password" },
        },
        required: ["email", "password"],
      },
    },
    {
      name: "geico_logout",
      description: "Log out of the current GEICO account and clear saved session",
      inputSchema: { type: "object", properties: {}, required: [] },
    },

    // Quotes
    {
      name: "geico_get_quote",
      description:
        "Get an insurance quote for auto, motorcycle, RV, or homeowners coverage. No login required.",
      inputSchema: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["auto", "motorcycle", "rv", "homeowners"],
            description: "Type of insurance to quote",
          },
          firstName: { type: "string", description: "Applicant first name" },
          lastName: { type: "string", description: "Applicant last name" },
          dateOfBirth: { type: "string", description: "Date of birth (YYYY-MM-DD)" },
          address: { type: "string", description: "Street address" },
          city: { type: "string", description: "City" },
          state: { type: "string", description: "2-letter state code (e.g. CA)" },
          zipCode: { type: "string", description: "ZIP code" },
          currentlyInsured: {
            type: "boolean",
            description: "Whether applicant currently has insurance",
          },
          // Vehicle fields
          vehicleYear: { type: "number", description: "Vehicle model year (auto/motorcycle/rv)" },
          vehicleMake: { type: "string", description: "Vehicle make (e.g. Toyota)" },
          vehicleModel: { type: "string", description: "Vehicle model (e.g. Camry)" },
          vehicleVin: { type: "string", description: "Vehicle VIN (optional)" },
          // Homeowners fields
          propertyAddress: {
            type: "string",
            description: "Property address if different from mailing address",
          },
          propertyType: {
            type: "string",
            enum: ["house", "condo", "mobile_home", "rental"],
            description: "Type of property (homeowners only)",
          },
          yearBuilt: { type: "number", description: "Year property was built (homeowners only)" },
          squareFootage: {
            type: "number",
            description: "Square footage of home (homeowners only)",
          },
        },
        required: ["type", "firstName", "lastName", "dateOfBirth", "address", "city", "state", "zipCode"],
      },
    },

    // Policies
    {
      name: "geico_list_policies",
      description: "List all insurance policies associated with the logged-in GEICO account",
      inputSchema: { type: "object", properties: {}, required: [] },
    },
    {
      name: "geico_get_policy",
      description: "Get detailed information about a specific policy by policy number",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number (e.g. 4082-44-25-11)" },
        },
        required: ["policyNumber"],
      },
    },
    {
      name: "geico_update_policy",
      description: "Update coverage details or insured items on an existing policy",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number to update" },
          coverages: {
            type: "array",
            description: "Updated coverage list",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                limit: { type: "string" },
                deductible: { type: "string" },
              },
              required: ["name", "limit"],
            },
          },
        },
        required: ["policyNumber"],
      },
    },

    // Claims
    {
      name: "geico_list_claims",
      description: "List claims for the account, optionally filtered by policy number",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: {
            type: "string",
            description: "Optional: filter by specific policy number",
          },
        },
        required: [],
      },
    },
    {
      name: "geico_get_claim",
      description: "Get the status and details of a specific claim by claim number",
      inputSchema: {
        type: "object",
        properties: {
          claimNumber: { type: "string", description: "Claim number (e.g. 0449456791010006)" },
        },
        required: ["claimNumber"],
      },
    },
    {
      name: "geico_file_claim",
      description: "File a new insurance claim for a loss event",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number to file claim under" },
          dateOfLoss: { type: "string", description: "Date of loss event (YYYY-MM-DD)" },
          typeOfLoss: {
            type: "string",
            enum: [
              "collision",
              "comprehensive",
              "liability",
              "theft",
              "weather",
              "fire",
              "vandalism",
              "water_damage",
              "other",
            ],
            description: "Type of loss",
          },
          description: { type: "string", description: "Detailed description of what happened" },
          locationOfLoss: { type: "string", description: "Address or description of loss location" },
          injuriesInvolved: { type: "boolean", description: "Were any injuries involved?" },
          otherVehiclesInvolved: {
            type: "boolean",
            description: "Were other vehicles involved?",
          },
          policeReportNumber: {
            type: "string",
            description: "Police report number if applicable",
          },
        },
        required: ["policyNumber", "dateOfLoss", "typeOfLoss", "description"],
      },
    },

    // Payments
    {
      name: "geico_payment_history",
      description: "Get payment history for a policy",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number" },
          limit: {
            type: "number",
            description: "Number of recent payments to return (default: 12)",
          },
        },
        required: ["policyNumber"],
      },
    },
    {
      name: "geico_make_payment",
      description: "Make an immediate payment on a policy",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number to pay" },
          amount: { type: "number", description: "Payment amount in USD" },
          paymentMethod: {
            type: "string",
            description: "Payment method: 'bank_account', 'credit_card', or 'debit_card'",
          },
        },
        required: ["policyNumber", "amount", "paymentMethod"],
      },
    },
    {
      name: "geico_schedule_payment",
      description: "Schedule a future payment for a policy",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Policy number" },
          amount: { type: "number", description: "Payment amount in USD" },
          scheduledDate: { type: "string", description: "Date to process payment (YYYY-MM-DD)" },
          paymentMethod: {
            type: "string",
            enum: ["bank_account", "credit_card", "debit_card"],
            description: "Payment method to use",
          },
        },
        required: ["policyNumber", "amount", "scheduledDate", "paymentMethod"],
      },
    },

    // Digital ID Cards
    {
      name: "geico_get_id_cards",
      description:
        "Retrieve digital insurance ID cards for all policies or a specific policy. Returns card details and download URLs.",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: {
            type: "string",
            description: "Optional: get ID card for a specific policy",
          },
        },
        required: [],
      },
    },

    // Roadside Assistance
    {
      name: "geico_request_roadside",
      description:
        "Request roadside assistance (tow, jump start, flat tire, lockout, fuel delivery, or winch out)",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: {
            type: "string",
            description: "Policy number with roadside assistance coverage",
          },
          serviceType: {
            type: "string",
            enum: ["tow", "jump_start", "flat_tire", "lockout", "fuel_delivery", "winch_out"],
            description: "Type of roadside service needed",
          },
          currentLocation: {
            type: "string",
            description: "Current location (address or description)",
          },
          vehicleDescription: {
            type: "string",
            description: "Description of the vehicle needing assistance",
          },
          callbackPhone: {
            type: "string",
            description: "Phone number for the service provider to call",
          },
          additionalNotes: { type: "string", description: "Any additional information" },
        },
        required: [
          "policyNumber",
          "serviceType",
          "currentLocation",
          "vehicleDescription",
          "callbackPhone",
        ],
      },
    },
    {
      name: "geico_roadside_status",
      description: "Check the status of an active roadside assistance request",
      inputSchema: {
        type: "object",
        properties: {
          requestId: { type: "string", description: "Roadside request ID from geico_request_roadside" },
        },
        required: ["requestId"],
      },
    },

    // Accident Reporting
    {
      name: "geico_report_accident",
      description:
        "Report an accident or loss event to GEICO. This creates a detailed incident report and may automatically open a claim.",
      inputSchema: {
        type: "object",
        properties: {
          policyNumber: { type: "string", description: "Your GEICO policy number" },
          dateOfAccident: { type: "string", description: "Date of accident (YYYY-MM-DD)" },
          timeOfAccident: {
            type: "string",
            description: "Time of accident (HH:MM, 24-hour format)",
          },
          locationOfAccident: {
            type: "string",
            description: "Address or intersection where accident occurred",
          },
          descriptionOfAccident: {
            type: "string",
            description: "Detailed description of how the accident occurred",
          },
          vehiclesInvolved: {
            type: "array",
            description: "List of other vehicles involved (include your own if multi-vehicle)",
            items: {
              type: "object",
              properties: {
                licensePlate: { type: "string" },
                make: { type: "string" },
                model: { type: "string" },
                year: { type: "number" },
                driverName: { type: "string" },
                insuranceCompany: { type: "string" },
                policyNumber: { type: "string" },
              },
            },
          },
          witnessInfo: {
            type: "array",
            description: "Witness contact information",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                phone: { type: "string" },
              },
              required: ["name", "phone"],
            },
          },
          policeReport: {
            type: "object",
            description: "Police report information if applicable",
            properties: {
              reportNumber: { type: "string" },
              department: { type: "string" },
            },
            required: ["reportNumber", "department"],
          },
          injuries: {
            type: "array",
            description: "Any injuries reported at the scene",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
              },
              required: ["name", "description"],
            },
          },
        },
        required: [
          "policyNumber",
          "dateOfAccident",
          "locationOfAccident",
          "descriptionOfAccident",
          "vehiclesInvolved",
        ],
      },
    },
  ],
}));

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

type ToolArgs = Record<string, unknown>;

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const a = args as ToolArgs;

  try {
    switch (name) {
      // ---- Auth ----
      case "geico_status": {
        const session = loadSession();
        if (session.isLoggedIn) {
          return ok({
            loggedIn: true,
            email: session.email,
            customerId: session.customerId,
          });
        }
        return ok({ loggedIn: false, message: "Not logged in. Use geico_login to authenticate." });
      }

      case "geico_login": {
        const session = await login(a.email as string, a.password as string);
        return ok({
          success: true,
          message: `Successfully logged in as ${session.email}`,
          customerId: session.customerId,
        });
      }

      case "geico_logout": {
        await logout();
        return ok({ success: true, message: "Logged out successfully." });
      }

      // ---- Quotes ----
      case "geico_get_quote": {
        const quote = await getQuote(a as unknown as QuoteRequest);
        return ok(quote);
      }

      // ---- Policies ----
      case "geico_list_policies": {
        const policies = await listPolicies();
        return ok({ count: policies.length, policies });
      }

      case "geico_get_policy": {
        const policy = await getPolicy(a.policyNumber as string);
        return ok(policy);
      }

      case "geico_update_policy": {
        const { policyNumber, ...updates } = a;
        const policy = await updatePolicy(policyNumber as string, updates as Parameters<typeof updatePolicy>[1]);
        return ok({ success: true, policy });
      }

      // ---- Claims ----
      case "geico_list_claims": {
        const claims = await listClaims(a.policyNumber as string | undefined);
        return ok({ count: claims.length, claims });
      }

      case "geico_get_claim": {
        const claim = await getClaim(a.claimNumber as string);
        return ok(claim);
      }

      case "geico_file_claim": {
        const claim = await fileClaim(a as unknown as ClaimFilingRequest);
        return ok({
          success: true,
          message: "Claim filed successfully.",
          claim,
        });
      }

      // ---- Payments ----
      case "geico_payment_history": {
        const payments = await getPaymentHistory(
          a.policyNumber as string,
          (a.limit as number) || 12
        );
        return ok({ count: payments.length, payments });
      }

      case "geico_make_payment": {
        const payment = await makePayment(
          a.policyNumber as string,
          a.amount as number,
          a.paymentMethod as string
        );
        return ok({
          success: true,
          message: `Payment of $${a.amount} processed.`,
          payment,
        });
      }

      case "geico_schedule_payment": {
        const payment = await schedulePayment(a as unknown as ScheduledPayment);
        return ok({
          success: true,
          message: `Payment of $${a.amount} scheduled for ${a.scheduledDate}.`,
          payment,
        });
      }

      // ---- ID Cards ----
      case "geico_get_id_cards": {
        const cards = await getDigitalIdCards(a.policyNumber as string | undefined);
        return ok({ count: cards.length, idCards: cards });
      }

      // ---- Roadside ----
      case "geico_request_roadside": {
        const result = await requestRoadsideAssistance(a as unknown as RoadsideRequest);
        return ok({
          success: true,
          message: `Roadside assistance dispatched. ETA: ${result.eta}`,
          ...result,
        });
      }

      case "geico_roadside_status": {
        const status = await getRoadsideStatus(a.requestId as string);
        return ok(status);
      }

      // ---- Accident Reporting ----
      case "geico_report_accident": {
        const result = await reportAccident(a as unknown as AccidentReport);
        return ok({
          success: true,
          message: "Accident report submitted successfully.",
          ...result,
        });
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(message);
  }
});

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
