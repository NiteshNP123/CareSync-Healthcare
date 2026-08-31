# CareSync — Patient Experience & Healthcare Journey Architecture

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  

---

## 1. The Connected Healthcare Journey Model

CareSync is designed around the central premise that **"Your healthcare journey should never start from zero."**

```
PATIENT
  ↓
CONSULTATION (Clinical Assessment & Diagnosis)
  ↓
INVESTIGATION (Diagnostic Requisition & Sample Collection)
  ↓
LABORATORY REPORT (NABL Calibrated Structured Values & Reference Intervals)
  ↓
TREATMENT & PRESCRIPTION (Dosage, Administration Instructions)
  ↓
PHARMACY DISPENSING (Verification, Bill Quote, Sandbox Payment & Delivery)
  ↓
FOLLOW-UP & SPECIALIST REFERRAL (Contextual Hand-off without losing clinical records)
  ↓
CONTINUOUS CARE & AI SYNTHESIS
```

---

## 2. Key Interactive Experience Modules

### 1. Hero Patient Dashboard
- **Current Care Stage Tracker:** Clearly indicates current milestone and step progress (e.g. *Step 4 of 6 · Cardiometabolic Monitoring*).
- **"What's Next?" Action Card:** Directly driven by active pending tasks (appointments, blood tests, prescription refills).
- **Hero Healthcare Journey:** Interactive clickable nodes that reveal deep clinical summaries, ordering physicians, and source documents.
- **Longitudinal AI Summary:** Highlights key trends with strict non-diagnostic labels and a direct "View Source Records" escape hatch.

### 2. Interactive Journey Event Modal (`JourneyDetailModal`)
- Displays clinical provider details, facility license, exact timestamps, and related documents.
- Features NABL structured parameters preview with high/normal flags.
- Displays active prescription medicines with dosage instructions.

### 3. Doctor Transfer & Granular Consent Workflow (`ShareTransferModal`)
- Enables instant multi-specialist hand-offs.
- Allows patient to select specific data scopes:
  - `Consultations & Assessments`
  - `Laboratory Diagnostic Reports`
  - `Prescriptions & Active Medications`
  - `Vitals & Longitudinal Trends`
  - `Care Journey Timeline`
- Authorizes via simulated 6-digit OTP verification (`749201`).

### 4. AI Medical Report Explainer (`ExplainReportModal`)
- Plain-English breakdown of complex diagnostic markers (HbA1c, Fasting Glucose, Lipid Panel, Creatinine).
- Displays exact NABL reference ranges without making autonomous clinical diagnoses.
- Enforces medical safety disclaimers across all AI outputs.

### 5. Transparent Sandbox Payment & Invoicing (`SandboxPaymentModal`)
- State machine tracking `Payment Required` &rarr; `Processing` &rarr; `Paid` or `Declined`.
- Itemizes GST tax breakdown and issues invoice reference numbers (`INV-2048-...`).

---

## 3. Multi-Role Portals

| Role Persona | Core Workflow & Experience |
|---|---|
| **Patient (`Rahul Sharma`)** | Hero Journey, What’s Next actions, physician search, consent management, pharmacy tracking, and profile. |
| **Doctor (`Dr. Rahul Mehta`)** | Patient chart inspection, AI longitudinal synthesis, biometrics (HbA1c/BP), encounter documentation, and specialist referrals. |
| **Diagnostic Lab (`ABC Diagnostics`)** | Requisitions queue, sample collection status updates, structured NABL report publishing. |
| **Pharmacy (`XYZ Pharmacy`)** | Prescription fulfillment queue, stock review, bill quote generation, sandbox payment requests, dispatch timeline. |
| **Caregiver (`Priya Sharma`)** | Delegated view of family member health journey, medication schedule, appointment alerts. |
| **Governance (`CareSync Compliance`)** | Tamper-evident immutable audit logs and physician credential verification. |
