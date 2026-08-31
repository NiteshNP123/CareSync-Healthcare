export type AssistantIntent =
  | "RECORD_LOOKUP"
  | "JOURNEY_SUMMARY"
  | "APPOINTMENT"
  | "REPORT_EXPLANATION"
  | "MEDICATION_LOOKUP"
  | "PENDING_CARE"
  | "DOCTOR_DISCOVERY"
  | "NAVIGATION"
  | "GENERAL_HEALTH_EDUCATION"
  | "UNSAFE_MEDICATION_CHANGE"
  | "UNSAFE_DIAGNOSIS_REQUEST"
  | "PROMPT_INJECTION_ATTEMPT"
  | "UNSUPPORTED_CLINICAL_REQUEST"
  | "GENERAL_ASSISTANCE";

export interface AssistantSource {
  type: "CONSULTATION" | "LAB_REPORT" | "PRESCRIPTION" | "APPOINTMENT" | "ORDER" | "GENERAL";
  title: string;
  date?: string;
  route: string;
}

export interface SuggestedAction {
  label: string;
  actionType: "NAVIGATE";
  route: string;
}

export type GeminiFallbackReason =
  | "GEMINI_NOT_CONFIGURED"
  | "GEMINI_RATE_LIMIT"
  | "GEMINI_AUTH"
  | "GEMINI_TIMEOUT"
  | "GEMINI_MODEL_NOT_FOUND"
  | "GEMINI_NETWORK"
  | "GEMINI_INVALID_RESPONSE";

export interface AssistantResponse {
  reply: string;
  sources: AssistantSource[];
  suggestedActions: SuggestedAction[];
  disclaimer: string;
  generatedAt: string;
  intent: AssistantIntent;
  provider?: "gemini" | "deterministic" | "deterministic-fallback" | string;
  fallbackReason?: GeminiFallbackReason;
}

export interface ScopedPatientProfile {
  id: number;
  name: string;
  careSyncId: string;
  bloodGroup?: string | null;
  allergies?: string[] | null;
  chronicConditions?: string[] | null;
}

export interface ScopedJourneyEvent {
  id: number;
  title: string;
  eventType: string;
  date: string;
  provider: string;
  organization: string;
  description: string;
  status: string;
}

export interface ScopedAppointment {
  id: number;
  doctorName: string;
  specialization: string;
  organization: string;
  date: string;
  time: string;
  mode: string;
  status: string;
}

export interface ScopedLabReport {
  id: number;
  testName: string;
  date: string;
  summary: string;
  parameters: Array<{
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
    flag: string;
  }>;
}

export interface ScopedPrescription {
  id: number;
  doctorName: string;
  date: string;
  status: string;
  items: Array<{
    medicationName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }>;
}

export interface ScopedPharmacyOrder {
  orderNumber: string;
  pharmacyName: string;
  status: string;
  itemCount: number;
  totalAmount: number;
}

export interface AssistantContext {
  patient: ScopedPatientProfile;
  journeyEvents?: ScopedJourneyEvent[];
  nextAppointment?: ScopedAppointment | null;
  allAppointments?: ScopedAppointment[];
  labReports?: ScopedLabReport[];
  prescriptions?: ScopedPrescription[];
  pharmacyOrders?: ScopedPharmacyOrder[];
  pendingTasksCount: number;
  activeRoute?: string;
}

export interface ChatHistoryEntry {
  role: "user" | "assistant";
  text: string;
}

/**
 * Common abstraction for CareSync AI providers.
 * - DeterministicAssistantProvider (Rule-based clinical synthesizer)
 * - GeminiAssistantProvider (Official Google GenAI SDK @google/genai Interactions API)
 */
export interface AssistantProvider {
  name: string;
  generateResponse(
    message: string,
    context: AssistantContext,
    intent: AssistantIntent,
    sessionHistory?: ChatHistoryEntry[]
  ): Promise<AssistantResponse>;
}
