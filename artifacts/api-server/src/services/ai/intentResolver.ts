import type { AssistantIntent } from "./types";

/**
 * Deterministic Intent Classifier for CareSync Assistant.
 * Classifies user messages into structured clinical intents without granting data access.
 */
export function resolveIntent(message: string): AssistantIntent {
  const normalized = message.trim().toLowerCase();

  // 1. Safety Filter: Prompt Injection & Cross-Patient Exfiltration
  if (
    normalized.includes("ignore previous") ||
    normalized.includes("ignore your instructions") ||
    normalized.includes("system prompt") ||
    normalized.includes("act as admin") ||
    normalized.includes("show all patients") ||
    normalized.includes("other patient") ||
    normalized.includes("another patient") ||
    /patient\s*(cs-|\d+)/i.test(normalized) ||
    normalized.includes("bypass") ||
    normalized.includes("jailbreak")
  ) {
    return "PROMPT_INJECTION_ATTEMPT";
  }

  // 2. Safety Filter: Medication / Dosage Modification Demands
  if (
    (normalized.includes("stop") && (normalized.includes("med") || normalized.includes("pill") || normalized.includes("tablet") || normalized.includes("metformin") || normalized.includes("dose"))) ||
    (normalized.includes("change") && (normalized.includes("dose") || normalized.includes("dosage") || normalized.includes("prescription"))) ||
    normalized.includes("double my dose") ||
    normalized.includes("increase dose") ||
    normalized.includes("decrease dose") ||
    normalized.includes("skip dose") ||
    normalized.includes("prescribe me") ||
    normalized.includes("give me a prescription")
  ) {
    return "UNSAFE_MEDICATION_CHANGE";
  }

  // 3. Safety Filter: Independent Diagnosis Inquiries
  if (
    normalized.includes("do i have diabetes") ||
    normalized.includes("do i have cancer") ||
    normalized.includes("diagnose me") ||
    normalized.includes("am i sick") ||
    normalized.includes("what disease do i have") ||
    normalized.includes("is my condition terminal")
  ) {
    return "UNSAFE_DIAGNOSIS_REQUEST";
  }

  // 4. Appointments, Consultations & Doctor Visits
  if (
    normalized.includes("appointment") ||
    normalized.includes("consultant") ||
    normalized.includes("consultation") ||
    normalized.includes("next visit") ||
    normalized.includes("upcoming visit") ||
    normalized.includes("doctor visit") ||
    normalized.includes("visit") ||
    normalized.includes("when do i see") ||
    normalized.includes("seeing") ||
    normalized.includes("who is my doctor") ||
    normalized.includes("who is my next") ||
    normalized.includes("what doctor") ||
    normalized.includes("which doctor") ||
    normalized.includes("next doctor") ||
    normalized.includes("my doctor") ||
    normalized.includes("doctor am i seeing") ||
    normalized.includes("schedule") ||
    normalized.includes("slot")
  ) {
    return "APPOINTMENT";
  }

  // 5. Healthcare Journey & History Summary
  if (
    normalized.includes("journey") ||
    normalized.includes("timeline") ||
    normalized.includes("summarize my care") ||
    normalized.includes("summary of my care") ||
    normalized.includes("recent care") ||
    normalized.includes("history") ||
    normalized.includes("what happened") ||
    normalized.includes("last consultation")
  ) {
    return "JOURNEY_SUMMARY";
  }

  // 6. Report & Diagnostic Explanation
  if (
    normalized.includes("report") ||
    normalized.includes("explain my") ||
    normalized.includes("hba1c") ||
    normalized.includes("glucose") ||
    normalized.includes("lipid") ||
    normalized.includes("cholesterol") ||
    normalized.includes("lab result") ||
    normalized.includes("blood test") ||
    normalized.includes("test result")
  ) {
    return "REPORT_EXPLANATION";
  }

  // 7. Medications & Prescriptions
  if (
    normalized.includes("medication") ||
    normalized.includes("medicine") ||
    normalized.includes("prescription") ||
    normalized.includes("drugs") ||
    normalized.includes("metformin") ||
    normalized.includes("rx")
  ) {
    return "MEDICATION_LOOKUP";
  }

  // 8. Pending Tasks / Next Steps
  if (
    normalized.includes("what's next") ||
    normalized.includes("what is next") ||
    normalized.includes("pending") ||
    normalized.includes("next step") ||
    normalized.includes("to do") ||
    normalized.includes("todo") ||
    normalized.includes("follow up") ||
    normalized.includes("action")
  ) {
    return "PENDING_CARE";
  }

  // 9. Doctor Discovery & Referral
  if (
    normalized.includes("find a doctor") ||
    normalized.includes("cardiologist") ||
    normalized.includes("specialist") ||
    normalized.includes("physician") ||
    normalized.includes("endocrinologist") ||
    normalized.includes("referral")
  ) {
    return "DOCTOR_DISCOVERY";
  }

  // 10. Navigation & Portal Hub
  if (
    normalized.includes("orders") ||
    normalized.includes("pharmacy") ||
    normalized.includes("consent") ||
    normalized.includes("access request") ||
    normalized.includes("profile") ||
    normalized.includes("go to") ||
    normalized.includes("show me")
  ) {
    return "NAVIGATION";
  }

  // 11. General Health Education
  if (
    normalized.includes("what is blood pressure") ||
    normalized.includes("what is hypertension") ||
    normalized.includes("what does creatinine mean") ||
    normalized.includes("normal glucose") ||
    normalized.includes("healthy diet")
  ) {
    return "GENERAL_HEALTH_EDUCATION";
  }

  // Default fallback
  return "GENERAL_ASSISTANCE";
}
