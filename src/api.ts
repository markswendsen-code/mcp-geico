import { loadSession, saveSession, SessionInfo } from "./auth.js";

const GEICO_API_BASE = "https://api.geico.com/v1";

export interface QuoteRequest {
  type: "auto" | "motorcycle" | "rv" | "homeowners";
  // Auto / Motorcycle / RV
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  // Homeowners
  propertyAddress?: string;
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  // Common
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  address: string;
  city: string;
  state: string;
  zipCode: string;
  currentlyInsured?: boolean;
}

export interface QuoteResult {
  quoteId: string;
  type: string;
  monthlyPremium: number;
  annualPremium: number;
  coverageDetails: Record<string, string>;
  validUntil: string;
  referenceNumber: string;
}

export interface Policy {
  policyNumber: string;
  type: string;
  status: "active" | "cancelled" | "pending" | "expired";
  effectiveDate: string;
  expirationDate: string;
  premiumAmount: number;
  paymentFrequency: string;
  insuredItems: Array<{ description: string; details: Record<string, string> }>;
  coverages: Array<{ name: string; limit: string; deductible?: string }>;
}

export interface Claim {
  claimNumber: string;
  policyNumber: string;
  type: string;
  status: "open" | "under_review" | "approved" | "denied" | "closed";
  dateOfLoss: string;
  dateReported: string;
  description: string;
  estimatedAmount?: number;
  adjuster?: { name: string; phone: string; email: string };
  lastUpdated: string;
}

export interface ClaimFilingRequest {
  policyNumber: string;
  dateOfLoss: string; // YYYY-MM-DD
  typeOfLoss: string;
  description: string;
  locationOfLoss?: string;
  injuriesInvolved?: boolean;
  otherVehiclesInvolved?: boolean;
  policeReportNumber?: string;
}

export interface Payment {
  paymentId: string;
  policyNumber: string;
  amount: number;
  date: string;
  method: string;
  status: "completed" | "pending" | "failed";
  confirmationNumber?: string;
}

export interface ScheduledPayment {
  policyNumber: string;
  amount: number;
  scheduledDate: string; // YYYY-MM-DD
  paymentMethod: "bank_account" | "credit_card" | "debit_card";
}

export interface DigitalIdCard {
  policyNumber: string;
  type: string;
  insuredName: string;
  vehicleInfo?: { year: number; make: string; model: string; vin: string };
  propertyAddress?: string;
  effectiveDate: string;
  expirationDate: string;
  policyId: string;
  downloadUrl?: string;
}

export interface RoadsideRequest {
  policyNumber: string;
  serviceType: "tow" | "jump_start" | "flat_tire" | "lockout" | "fuel_delivery" | "winch_out";
  currentLocation: string;
  vehicleDescription: string;
  additionalNotes?: string;
  callbackPhone: string;
}

export interface AccidentReport {
  policyNumber: string;
  dateOfAccident: string; // YYYY-MM-DD
  timeOfAccident?: string; // HH:MM
  locationOfAccident: string;
  descriptionOfAccident: string;
  vehiclesInvolved: Array<{
    licensePlate?: string;
    make?: string;
    model?: string;
    year?: number;
    driverName?: string;
    insuranceCompany?: string;
    policyNumber?: string;
  }>;
  witnessInfo?: Array<{ name: string; phone: string }>;
  policeReport?: { reportNumber: string; department: string };
  injuries?: Array<{ name: string; description: string }>;
  photos?: string[]; // base64 or URLs
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  requiresAuth = true
): Promise<T> {
  const session = loadSession();

  if (requiresAuth && !session.accessToken) {
    throw new Error("Not authenticated. Please log in to your GEICO account first.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "striderlabs-mcp-geico/1.0.0",
  };

  if (session.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  const response = await fetch(`${GEICO_API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    throw new Error("Authentication expired. Please log in again.");
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      errorMessage = errorBody.message || errorBody.error || errorMessage;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(email: string, password: string): Promise<SessionInfo> {
  const data = await apiRequest<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    customer_id: string;
  }>(
    "POST",
    "/auth/login",
    { email, password },
    false
  );

  const session: SessionInfo = {
    isLoggedIn: true,
    email,
    customerId: data.customer_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: Date.now() + data.expires_in * 1000,
  };

  saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("POST", "/auth/logout", {});
  } catch {
    // best-effort
  }
  const { clearSession } = await import("./auth.js");
  clearSession();
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

export async function getQuote(request: QuoteRequest): Promise<QuoteResult> {
  return apiRequest<QuoteResult>("POST", "/quotes", request, false);
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export async function listPolicies(): Promise<Policy[]> {
  return apiRequest<Policy[]>("GET", "/policies");
}

export async function getPolicy(policyNumber: string): Promise<Policy> {
  return apiRequest<Policy>(`GET`, `/policies/${encodeURIComponent(policyNumber)}`);
}

export async function updatePolicy(
  policyNumber: string,
  updates: Partial<Pick<Policy, "insuredItems" | "coverages">>
): Promise<Policy> {
  return apiRequest<Policy>("PATCH", `/policies/${encodeURIComponent(policyNumber)}`, updates);
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function listClaims(policyNumber?: string): Promise<Claim[]> {
  const query = policyNumber ? `?policyNumber=${encodeURIComponent(policyNumber)}` : "";
  return apiRequest<Claim[]>("GET", `/claims${query}`);
}

export async function getClaim(claimNumber: string): Promise<Claim> {
  return apiRequest<Claim>("GET", `/claims/${encodeURIComponent(claimNumber)}`);
}

export async function fileClaim(request: ClaimFilingRequest): Promise<Claim> {
  return apiRequest<Claim>("POST", "/claims", request);
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function getPaymentHistory(policyNumber: string, limit = 12): Promise<Payment[]> {
  return apiRequest<Payment[]>(
    "GET",
    `/payments?policyNumber=${encodeURIComponent(policyNumber)}&limit=${limit}`
  );
}

export async function schedulePayment(request: ScheduledPayment): Promise<Payment> {
  return apiRequest<Payment>("POST", "/payments/schedule", request);
}

export async function makePayment(
  policyNumber: string,
  amount: number,
  paymentMethod: string
): Promise<Payment> {
  return apiRequest<Payment>("POST", "/payments", { policyNumber, amount, paymentMethod });
}

// ---------------------------------------------------------------------------
// Digital ID Cards
// ---------------------------------------------------------------------------

export async function getDigitalIdCards(policyNumber?: string): Promise<DigitalIdCard[]> {
  const query = policyNumber ? `?policyNumber=${encodeURIComponent(policyNumber)}` : "";
  return apiRequest<DigitalIdCard[]>("GET", `/id-cards${query}`);
}

// ---------------------------------------------------------------------------
// Roadside Assistance
// ---------------------------------------------------------------------------

export async function requestRoadsideAssistance(
  request: RoadsideRequest
): Promise<{ requestId: string; eta: string; dispatchedTo: string; trackingUrl: string }> {
  return apiRequest("POST", "/roadside/request", request);
}

export async function getRoadsideStatus(
  requestId: string
): Promise<{ status: string; eta: string; provider: string; notes: string }> {
  return apiRequest("GET", `/roadside/requests/${encodeURIComponent(requestId)}`);
}

// ---------------------------------------------------------------------------
// Accident Reporting
// ---------------------------------------------------------------------------

export async function reportAccident(
  report: AccidentReport
): Promise<{ reportId: string; claimNumber?: string; referenceNumber: string; nextSteps: string[] }> {
  return apiRequest("POST", "/accidents/report", report);
}
