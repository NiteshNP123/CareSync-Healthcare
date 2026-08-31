import { MANDATORY_DISCLAIMER } from "./deterministicProvider";
import type { AssistantResponse, AssistantContext, AssistantSource, SuggestedAction } from "./types";

export const ALLOWED_ACTION_ROUTES = new Set([
  "/app",
  "/app/journey",
  "/app/doctors",
  "/app/consent",
  "/app/orders",
  "/app/profile",
]);

/**
 * Output Safety, Sanitization & Verification Layer for CareSync Assistant.
 * Validates generated responses before delivery to ensure medical compliance,
 * non-diagnostic framing, allowed navigation routes, and authentic source citations.
 */
export class AssistantSafetyLayer {
  static validateAndSanitize(
    response: AssistantResponse,
    context?: AssistantContext
  ): AssistantResponse {
    let sanitizedReply = response.reply || "";

    // 1. Enforce Mandatory Clinical Disclaimer
    const disclaimer = response.disclaimer || MANDATORY_DISCLAIMER;

    // 2. Strip any potential internal raw database IDs or artifacts
    sanitizedReply = sanitizedReply.replace(/patient_id_\d+/gi, "[Patient Reference]");
    sanitizedReply = sanitizedReply.replace(/seed_user_\d+/gi, "[User Reference]");

    // 3. Ensure no autonomous action claims
    if (
      sanitizedReply.includes("I have booked your appointment") ||
      sanitizedReply.includes("I booked your appointment") ||
      sanitizedReply.includes("I placed your order") ||
      sanitizedReply.includes("I have placed your order")
    ) {
      sanitizedReply = sanitizedReply
        .replace(
          /I (have )?booked your appointment/g,
          "You can book your appointment by clicking the button below"
        )
        .replace(
          /I (have )?placed your order/g,
          "You can review and place your order in the Pharmacy portal"
        );
    }

    // 4. Sanitize and Validate Sources against Authorized Context
    const rawSources = response.sources || [];
    const validatedSources: AssistantSource[] = [];

    for (const src of rawSources) {
      if (!src.title || !src.route || typeof src.route !== "string") continue;

      // Validate route
      const cleanRoute = src.route.split("?")[0];
      if (!ALLOWED_ACTION_ROUTES.has(cleanRoute)) continue;

      // If context is available, verify citation against real records
      if (context) {
        let isAuthentic = false;

        if (src.type === "APPOINTMENT") {
          const hasAppt =
            (context.nextAppointment && src.title.toLowerCase().includes(context.nextAppointment.doctorName.toLowerCase())) ||
            (context.allAppointments &&
              context.allAppointments.some((a) =>
                src.title.toLowerCase().includes(a.doctorName.toLowerCase()) || src.title.toLowerCase().includes("appointment")
              ));
          isAuthentic = !!hasAppt;
        } else if (src.type === "LAB_REPORT") {
          const hasReport =
            context.labReports &&
            context.labReports.some((r) =>
              src.title.toLowerCase().includes(r.testName.toLowerCase()) || src.title.toLowerCase().includes("report") || src.title.toLowerCase().includes("lab")
            );
          isAuthentic = !!hasReport;
        } else if (src.type === "PRESCRIPTION") {
          const hasPrescription =
            context.prescriptions &&
            context.prescriptions.some((p) =>
              p.items.some((i) => src.title.toLowerCase().includes(i.medicationName.toLowerCase())) ||
              src.title.toLowerCase().includes("prescription") ||
              src.title.toLowerCase().includes("medication")
            );
          isAuthentic = !!hasPrescription;
        } else if (src.type === "CONSULTATION") {
          const hasEvent =
            context.journeyEvents &&
            context.journeyEvents.some((e) =>
              src.title.toLowerCase().includes(e.provider.toLowerCase()) ||
              src.title.toLowerCase().includes(e.title.toLowerCase()) ||
              src.title.toLowerCase().includes("consultation")
            );
          isAuthentic = !!hasEvent;
        } else {
          isAuthentic = true;
        }

        if (isAuthentic) {
          validatedSources.push(src);
        }
      } else {
        validatedSources.push(src);
      }
    }

    // 5. Sanitize Suggested Actions against Allowlist
    const rawActions = response.suggestedActions || [];
    const validatedActions: SuggestedAction[] = [];

    for (const act of rawActions) {
      if (!act.label || !act.route || act.actionType !== "NAVIGATE") continue;
      const cleanRoute = act.route.split("?")[0];
      if (ALLOWED_ACTION_ROUTES.has(cleanRoute)) {
        validatedActions.push({
          label: act.label.trim(),
          actionType: "NAVIGATE",
          route: cleanRoute,
        });
      }
    }

    // Ensure fallback actions if none provided
    if (validatedActions.length === 0) {
      validatedActions.push({
        label: "View Care Journey",
        actionType: "NAVIGATE",
        route: "/app/journey",
      });
    }

    return {
      reply: sanitizedReply,
      sources: validatedSources,
      suggestedActions: validatedActions,
      disclaimer,
      generatedAt: response.generatedAt || new Date().toISOString(),
      intent: response.intent,
      provider: response.provider || "deterministic",
      fallbackReason: response.fallbackReason,
    };
  }
}
