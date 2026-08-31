# CareSync — 8-to-12 Minute Live Demonstration Guide

**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  
**Target Audience:** Evaluators, Healthcare UX Reviewers, Technical Architects  
**Estimated Demo Time:** 8–12 Minutes  

---

## 1. Demo Credentials & Seeded Personas

| Persona | Role | Email | Password | CareSync Identifier |
|---|---|---|---|---|
| **Rahul Sharma** | Patient | `rahul.sharma@example.com` | `demoPassword` | `CS-2048-7392` |
| **Dr. Rahul Mehta** | Primary Physician | `dr.rahul.mehta@northstarmed.com` | `demoPassword` | Internal Medicine · Verified |
| **Dr. Ananya Sharma**| Cardiologist (Specialist) | `dr.ananya.sharma@astergrove.com` | `demoPassword` | Cardiology · Verified |
| **ABC Diagnostics** | Laboratory Staff | Demo Switch (`LAB_STAFF`) | — | Richmond Road Branch |
| **XYZ Pharmacy** | Pharmacy Staff | Demo Switch (`PHARMACY_STAFF`) | — | Indiranagar Branch |
| **Priya Sharma** | Family Caregiver | Demo Switch (`CAREGIVER`) | — | Authorized Delegate |
| **Compliance Team** | System Admin | Demo Switch (`ADMIN`) | — | Audit & Verification |

---

## 2. Recommended Walkthrough Flow

### Step 1: Public Welcome & Positioning (1 min)
- Visit `/` (Landing Page).
- Highlight headline: *"Your healthcare journey should never start from zero."*
- Review the 6-stage lifecycle graphic (*Patient &rarr; Doctor &rarr; Lab &rarr; Report &rarr; Pharmacy &rarr; Follow-up*).
- Point out the independent prototype disclaimer.

### Step 2: Patient Hero Dashboard (2 mins)
- Click **"Open Care Space"** or navigate to `/app`.
- Highlight **Current Care Stage** (*Step 4 of 6 · Cardiometabolic Monitoring*).
- Inspect **"What's Next?"** hero action card with direct video appointment link.
- Review **CareSync AI Assistive Summary** with non-diagnostic badge and safety disclaimer.

### Step 3: Interactive Healthcare Journey (2 mins)
- Navigate to **"My Journey"** (`/app/journey`).
- Click on any milestone node (e.g. *HbA1c & Lipid Report*).
- The `JourneyDetailModal` opens showing clinical narrative, NABL verified parameter values (HbA1c 6.6% with High flag), and source record link.
- Click **"Explain with AI"** to open `ExplainReportModal` detailing parameter definitions, reference intervals, and safety disclaimers.

### Step 4: Doctor Transfer & Scoped Consent (2 mins)
- From the Dashboard, click **"Share with Another Doctor"**.
- Select **Dr. Ananya Sharma** (Cardiologist).
- Choose granular scopes: `[x] Consultations`, `[x] Lab Reports`, `[x] Prescriptions`, `[x] Vitals`, `[x] Journey`.
- Enter demo OTP `749201` & click **"Grant Authorized Consent"**.
- View `<SuccessAnimation />` confirmation.

### Step 5: Switch to Doctor Clinical Workstation (2 mins)
- In the sidebar role switcher, click **"Doctor"**.
- Notice the immediate UI reflow into a high-density clinical workstation.
- Dr. Rahul Mehta sees consented patient *Rahul Sharma (32M)*, AI longitudinal summary, biometric tiles, and encounter documentation tool.

### Step 6: Diagnostic Lab & Pharmacy Portals (2 mins)
- Switch role to **"Diagnostics"**: view the requisitions queue and report publisher.
- Switch role to **"Pharmacy"**: view active orders, stock verification, and sandbox checkout.
- Click **"Request Sandbox Payment"** to trigger the `SandboxPaymentModal` generating invoice `INV-2048-...`.

### Step 7: Caregiver & Governance Audit (1 min)
- Switch role to **"Caregiver"**: view the calm, delegated family timeline.
- Switch role to **"Governance"**: view the immutable security audit trail recording every encounter, lab publication, payment, and consent decision.
