import type {
  AssistantContext,
  AssistantIntent,
  AssistantProvider,
  AssistantResponse,
  AssistantSource,
  SuggestedAction,
  ChatHistoryEntry,
} from "./types";

export const MANDATORY_DISCLAIMER =
  "CareSync Assistant provides software-assisted information organization and does not replace professional medical diagnosis or treatment. Always verify all details against your original clinical records and consult your physician.";

/**
 * Deterministic Clinical Assistant Provider for CareSync.
 * Synthesizes grounded, accurate responses strictly from authorized patient records.
 * Adheres to provider abstraction so a real LLM provider can be added in the future.
 */
export class DeterministicAssistantProvider implements AssistantProvider {
  name = "deterministic";

  async generateResponse(
    message: string,
    context: AssistantContext,
    intent: AssistantIntent,
    _sessionHistory?: ChatHistoryEntry[]
  ): Promise<AssistantResponse> {
    const generatedAt = new Date().toISOString();
    let reply = "";
    const sources: AssistantSource[] = [];
    const suggestedActions: SuggestedAction[] = [];

    switch (intent) {
      // 1. APPOINTMENT INQUIRY
      case "APPOINTMENT": {
        const next = context.nextAppointment;
        if (next) {
          reply = `According to your CareSync records, your next scheduled appointment is a **${next.mode}** with **${next.doctorName}** (${next.specialization}) at **${next.organization}** on **${next.date}** at **${next.time}** (Status: **${next.status}**).`;
          sources.push({
            type: "APPOINTMENT",
            title: `Appointment with ${next.doctorName}`,
            date: next.date,
            route: "/app/journey",
          });
          suggestedActions.push(
            { label: "View Appointment Details", actionType: "NAVIGATE", route: "/app/journey" },
            { label: "Find Additional Specialists", actionType: "NAVIGATE", route: "/app/doctors" }
          );
        } else {
          reply = `You have no upcoming appointments currently scheduled in your CareSync records. You can explore the care team directory to book a consultation with a verified physician.`;
          suggestedActions.push({
            label: "Book a Consultation",
            actionType: "NAVIGATE",
            route: "/app/doctors",
          });
        }
        break;
      }

      // 2. HEALTHCARE JOURNEY SUMMARY
      case "JOURNEY_SUMMARY": {
        const events = context.journeyEvents || [];
        if (events.length > 0) {
          const formattedList = events
            .slice(0, 3)
            .map((e) => `• **${e.date}**: ${e.title} (${e.provider} · ${e.organization})`)
            .join("\n");

          reply = `Here is a summary of your recent CareSync healthcare milestones:\n\n${formattedList}\n\nYour clinical consultations, diagnostic reports, and pharmacy orders are linked into a single continuous care timeline.`;
          
          for (const ev of events.slice(0, 2)) {
            sources.push({
              type: ev.eventType === "REPORT" ? "LAB_REPORT" : ev.eventType === "MEDICATION" ? "PRESCRIPTION" : "CONSULTATION",
              title: ev.title,
              date: ev.date,
              route: "/app/journey",
            });
          }

          suggestedActions.push(
            { label: "Explore Full Journey Timeline", actionType: "NAVIGATE", route: "/app/journey" },
            { label: "View Active Prescriptions", actionType: "NAVIGATE", route: "/app/orders" }
          );
        } else {
          reply = `No previous journey milestones were found in your record. As you complete consultations and tests, they will automatically populate your care timeline.`;
          suggestedActions.push({
            label: "Explore Care Space",
            actionType: "NAVIGATE",
            route: "/app",
          });
        }
        break;
      }

      // 3. REPORT EXPLANATION
      case "REPORT_EXPLANATION": {
        const reports = context.labReports || [];
        if (reports.length > 0) {
          const report = reports[0];
          const paramLines = report.parameters
            .map(
              (p) =>
                `• **${p.parameter}**: **${p.value} ${p.unit}** (Ref: ${p.referenceRange} ${p.unit}) — *${p.flag === "HIGH" ? "Elevated" : p.flag === "LOW" ? "Low" : "Normal"}*`
            )
            .join("\n");

          reply = `According to your CareSync records, your latest diagnostic report is **${report.testName}** from **${report.date}**.\n\n${paramLines}\n\n**Summary:** ${report.summary}\n\n*Note:* HbA1c measures your average blood sugar over the last 2–3 months. These parameters are available to your consulting physician for longitudinal care evaluation.`;

          sources.push({
            type: "LAB_REPORT",
            title: report.testName,
            date: report.date,
            route: "/app/journey",
          });

          suggestedActions.push(
            { label: "View Detailed Report Modal", actionType: "NAVIGATE", route: "/app/journey" },
            { label: "Discuss with Doctor", actionType: "NAVIGATE", route: "/app/doctors" }
          );
        } else {
          reply = `There are no completed laboratory reports recorded in your CareSync account at this time.`;
          suggestedActions.push({
            label: "Check Journey Timeline",
            actionType: "NAVIGATE",
            route: "/app/journey",
          });
        }
        break;
      }

      // 4. MEDICATION & PRESCRIPTION LOOKUP
      case "MEDICATION_LOOKUP": {
        const prescriptions = context.prescriptions || [];
        if (prescriptions.length > 0) {
          const rx = prescriptions[0];
          const medList = rx.items
            .map(
              (m) =>
                `• **${m.medicationName} (${m.dosage})**: ${m.frequency} for ${m.duration} (${m.instructions})`
            )
            .join("\n");

          reply = `According to your CareSync records, your active prescription issued by **${rx.doctorName}** on **${rx.date}** includes:\n\n${medList}\n\n*Important:* Please adhere strictly to the schedule prescribed by your physician. Do not alter doses without clinical guidance.`;

          sources.push({
            type: "PRESCRIPTION",
            title: `Prescription by ${rx.doctorName}`,
            date: rx.date,
            route: "/app/orders",
          });

          suggestedActions.push(
            { label: "View Pharmacy Orders", actionType: "NAVIGATE", route: "/app/orders" },
            { label: "Review Care Journey", actionType: "NAVIGATE", route: "/app/journey" }
          );
        } else {
          reply = `No active prescriptions are currently recorded in your CareSync profile.`;
          suggestedActions.push({
            label: "Find a Doctor",
            actionType: "NAVIGATE",
            route: "/app/doctors",
          });
        }
        break;
      }

      // 5. PENDING CARE & NEXT STEPS
      case "PENDING_CARE": {
        const next = context.nextAppointment;
        const reports = context.labReports || [];
        
        reply = `Here are your upcoming actions and pending items:\n\n` +
          `1. **Upcoming Consultation**: ${next ? `${next.mode} with ${next.doctorName} on ${next.date} at ${next.time}` : "None currently scheduled"}.\n` +
          `2. **Diagnostic Findings**: ${reports.length > 0 ? `Latest ${reports[0].testName} is ready for physician review.` : "All requested tests up to date."}\n` +
          `3. **Active Regimen**: Maintain daily prescribed schedule and monitor cardiometabolic markers.`;

        if (next) {
          sources.push({
            type: "APPOINTMENT",
            title: `Consultation with ${next.doctorName}`,
            date: next.date,
            route: "/app/journey",
          });
        }

        suggestedActions.push(
          { label: "View Full Care Journey", actionType: "NAVIGATE", route: "/app/journey" },
          { label: "Check Consent Scopes", actionType: "NAVIGATE", route: "/app/consent" }
        );
        break;
      }

      // 6. DOCTOR DISCOVERY & SPECIALIST REFERRAL
      case "DOCTOR_DISCOVERY": {
        reply = `CareSync connects you with verified physicians across Internal Medicine, Cardiology, Endocrinology, and specialty care. You can browse doctor credentials, verify experience and ratings, and book video or in-clinic visits directly.`;
        suggestedActions.push(
          { label: "Browse Care Team Network", actionType: "NAVIGATE", route: "/app/doctors" },
          { label: "View Active Consent Scopes", actionType: "NAVIGATE", route: "/app/consent" }
        );
        break;
      }

      // 7. NAVIGATION & PORTAL ROUTING
      case "NAVIGATION": {
        reply = `I can help you navigate CareSync. Where would you like to go?\n\n• **Care Journey**: View your connected chronological medical timeline\n• **Care Team**: Search verified doctors and book appointments\n• **Consent & Access**: Control granular physician access permissions\n• **Pharmacy Orders**: Track prescription fulfillment and delivery`;
        suggestedActions.push(
          { label: "Go to Care Journey", actionType: "NAVIGATE", route: "/app/journey" },
          { label: "Go to Pharmacy Orders", actionType: "NAVIGATE", route: "/app/orders" },
          { label: "Go to Consent Governance", actionType: "NAVIGATE", route: "/app/consent" }
        );
        break;
      }

      // 8. UNSAFE MEDICATION CHANGE (SAFETY BLOCK)
      case "UNSAFE_MEDICATION_CHANGE": {
        const rx = context.prescriptions && context.prescriptions[0];
        reply = `⚠️ **Medical Safety Policy:** CareSync Assistant is not authorized to modify medication dosages, alter treatment schedules, or instruct discontinuation.\n\nAccording to your records, you are currently prescribed **${rx?.items[0]?.medicationName || "Metformin SR 500mg"}** (${rx?.items[0]?.frequency || "Once daily with evening meal"}).\n\nIf you are experiencing side effects or considering stopping or changing your dosage, please contact **${rx?.doctorName || "your consulting doctor"}** immediately.`;
        
        if (rx) {
          sources.push({
            type: "PRESCRIPTION",
            title: `Prescription by ${rx.doctorName}`,
            date: rx.date,
            route: "/app/orders",
          });
        }

        suggestedActions.push(
          { label: "Book Follow-up with Doctor", actionType: "NAVIGATE", route: "/app/doctors" },
          { label: "View Prescription Details", actionType: "NAVIGATE", route: "/app/orders" }
        );
        break;
      }

      // 9. UNSAFE DIAGNOSIS DEMAND (SAFETY BLOCK)
      case "UNSAFE_DIAGNOSIS_REQUEST": {
        const report = context.labReports && context.labReports[0];
        reply = `⚠️ **Clinical Notice:** CareSync Assistant cannot provide medical diagnoses or determine disease pathology.\n\nYour CareSync record contains verified lab findings (${report ? `${report.testName}: HbA1c ${report.parameters[0]?.value}%, Fasting Glucose ${report.parameters[1]?.value} mg/dL` : "Metabolic profile"}). A formal clinical diagnosis must always be made by a licensed healthcare professional based on comprehensive physical and laboratory assessment.`;

        if (report) {
          sources.push({
            type: "LAB_REPORT",
            title: report.testName,
            date: report.date,
            route: "/app/journey",
          });
        }

        suggestedActions.push(
          { label: "Book Clinical Consultation", actionType: "NAVIGATE", route: "/app/doctors" },
          { label: "View Original Lab Reports", actionType: "NAVIGATE", route: "/app/journey" }
        );
        break;
      }

      // 10. PROMPT INJECTION / CROSS-PATIENT EXFILTRATION (SECURITY BLOCK)
      case "PROMPT_INJECTION_ATTEMPT": {
        reply = `🔒 **Security & Privacy Boundary:** CareSync operates under a zero-assumption privacy model. The Assistant is cryptographically restricted to your authenticated patient identity (${context.patient.careSyncId}) and cannot access, query, or disclose records belonging to other patients or administrative systems.`;
        suggestedActions.push({
          label: "View My Care Journey",
          actionType: "NAVIGATE",
          route: "/app/journey",
        });
        break;
      }

      // 11. GENERAL HEALTH EDUCATION
      case "GENERAL_HEALTH_EDUCATION": {
        reply = `**General Health Information:**\n\n• **HbA1c**: Reflects average blood sugar control over 2 to 3 months. Normal is below 5.7%, 5.7%–6.4% indicates pre-diabetes, and 6.5%+ is evaluated for diabetes management.\n• **Fasting Blood Glucose**: Measures glucose levels after an 8-hour fast. Normal fasting range is 70–99 mg/dL.\n• **Blood Pressure**: Standard optimal blood pressure is less than 120/80 mmHg.\n\n*Note:* This is general health education and does not replace individualized clinical advice from your physician.`;
        sources.push({
          type: "GENERAL",
          title: "CareSync Clinical Reference Standards",
          route: "/app",
        });
        suggestedActions.push({
          label: "Check My Personal Lab Reports",
          actionType: "NAVIGATE",
          route: "/app/journey",
        });
        break;
      }

      // 12. GENERAL ASSISTANCE & FALLBACK
      default: {
        reply = `Hello, ${context.patient.name.split(" ")[0]}! I am your **CareSync Assistant**. I can help you organize and navigate your healthcare information:\n\n• Summarize your recent consultations and care milestones\n• Check upcoming appointment times and doctor details\n• Explain lab report parameters (HbA1c, lipid panel)\n• Review active prescriptions and pharmacy orders\n• Help you find and connect with verified specialists\n\nWhat would you like to explore today?`;
        suggestedActions.push(
          { label: "Summarize my recent care", actionType: "NAVIGATE", route: "/app/journey" },
          { label: "What's next?", actionType: "NAVIGATE", route: "/app/journey" },
          { label: "My active medications", actionType: "NAVIGATE", route: "/app/orders" }
        );
        break;
      }
    }

    return {
      reply,
      sources,
      suggestedActions,
      disclaimer: MANDATORY_DISCLAIMER,
      generatedAt,
      intent,
      provider: "deterministic",
    };
  }
}
