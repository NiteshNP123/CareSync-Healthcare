# CareSync — Full-Stack Transformation Implementation Plan

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  
**Lead Roles:** Software Architect, Full-Stack Engineer, Healthcare UX Designer, Motion Designer, Security Engineer  
**Date:** August 31, 2026  

---

## 1. Current Architecture

```
[ Frontend: React 19 + Vite + Tailwind v4 + Wouter ]
                 │
                 ▼ (REST /api)
[ Express 5 Server (api-server) ]
                 │
                 ▼
[ In-Memory Ephemeral State (Zero DB Persistence) ]
```

- **Frontend:** Single-file monolithic application (`App.tsx`) with basic patient overview and simulated hardcoded interactions.
- **Backend:** Express 5 app (`api-server`) holding mock JS arrays in memory with no session management or auth.
- **Database:** Drizzle ORM configured with node-postgres, but zero schema tables or migrations defined (`lib/db/src/schema/index.ts` is empty).
- **API Spec & Codegen:** OpenAPI 3.1 YAML (`openapi.yaml`) with 7 endpoints powering typed React Query hooks.

---

## 2. Existing Features

- Public landing page introducing the CareSync continuous care concept and disclaimer.
- Patient overview dashboard showing static vitals, mock upcoming appointment, and hardcoded stage.
- Journey timeline displaying mock historical consultations and lab events.
- Doctor discovery list with basic date/time booking modal.
- Consent & access request approval/denial toggle.
- Pharmacy orders read-only list with mock delivery status bar.
- Patient profile page with mock edit fields.

---

## 3. Missing Features

1. **Authentication & Session System:**
   - Multi-role registration & login (Patient, Doctor, Lab Staff, Pharmacy Staff, Caregiver, Admin).
   - JWT / Session cookie management with secure role-switching for rapid demo evaluation.
2. **Healthcare Journey Engine (The HERO Interaction):**
   - True unified living timeline automatically synthesized from linked consultations, lab orders, lab reports, prescriptions, pharmacy orders, and referrals.
   - Interactive detail drawer/modal for every journey node with original documents and AI insights.
3. **Doctor Clinical Workstation:**
   - Provider dashboard with appointment queue, patient lookup, access requests, consultation notes editor, ICD-style assessment builder, prescription generator, and diagnostic lab test ordering.
   - Doctor verification workflow (document upload -> admin review -> verified doctor badge).
   - Doctor-to-Doctor appointment booking and referral management.
   - Weekly availability and time slot configuration.
4. **Diagnostic Laboratory Portal:**
   - Organization setup, technician queue, test requisition verification, sample collection tracking, structured lab report builder (with reference ranges & critical flags), and report publication.
5. **Pharmacy Fulfillment Portal:**
   - Organization setup, prescription incoming queue, stock availability verification, itemized quote/billing generator, order preparation, dispatch, and delivery tracking.
6. **Caregiver Delegated Access:**
   - Patient-initiated caregiver invitation, granular permission grants (Appointments, Tasks, Medications, Journey progress), and non-clinical access boundaries.
7. **Consent Management & Step-Up OTP:**
   - Doctor search & access request flow.
   - Patient approval/denial modal with simulated OTP verification and customizable data scope selection.
8. **Sandbox Payments & Invoicing:**
   - Payment request creation for appointments and pharmacy orders.
   - Realistic multi-state payment modal (Pending -> Processing -> Paid / Failed) with printable PDF-style receipt invoice.
9. **AI Information Assistant & Safety Layer:**
   - Timeline synthesis & care stage identification.
   - "Explain Report" module breaking down medical parameters into plain English with reference ranges.
   - Natural Language Health Search over permitted patient records.
   - Strict medical safety guardrails (No autonomous diagnosis or prescription modifications).
10. **Health Analytics & Vitals Visualizer:**
    - Interactive trends for Blood Pressure, Blood Glucose, HbA1c, and Heart Rate using Recharts.
11. **System Audit Logging & Compliance:**
    - Immutable audit log tracking all patient record access, consent approvals/revocations, doctor verifications, and document views.

---

## 4. Technical Debt & Codebase Cleanup

- **Decompose `App.tsx`:** Refactor the 431-line monolithic frontend into a modular feature-based architecture (`features/auth`, `features/patient`, `features/doctor`, `features/lab`, `features/pharmacy`, `features/caregiver`, `features/admin`, `components/journey`, `components/motion`).
- **Eliminate In-Memory Backend State:** Move all business data to PostgreSQL with Drizzle ORM transactions.
- **Unified API Client & Validation:** Implement Zod schemas across all routes with error handling and status codes.
- **Centralize Design & Motion Primitives:** Implement Framer Motion primitives replacing ad-hoc CSS keyframes.

---

## 5. Security & RBAC Architecture

1. **Authentication & Password Security:**
   - Passwords hashed with `bcryptjs` / `scrypt`.
   - Signed JWT auth tokens stored in secure HttpOnly cookies or Authorization headers.
2. **Role-Based & Object-Level Access Control (RBAC & ABAC):**
   - Middleware `requireAuth` and `requireRole(['PATIENT', 'DOCTOR', 'LAB', 'PHARMACY', 'CAREGIVER', 'ADMIN'])`.
   - Resource access filters: A doctor can only read patient records if an active, unexpired `ConsentRecord` exists for the requested data scopes.
3. **Data Protection & Disclaimers:**
   - Explicit disclaimer in headers/footers: *"CareSync is an independent healthcare software project and is not affiliated with or endorsed by the Government of India, ABDM, ABHA, eSanjeevani, or any government authority."*
   - Clear medical disclaimer: *"CareSync provides software-assisted healthcare information management and does not replace professional medical diagnosis or treatment."*
4. **Audit Trail:**
   - Every read and write to health entities automatically writes to `audit_logs`.

---

## 6. Target System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CareSync Frontend (Vite / React 19)              │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────────────────┐   │
│  │ Patient Portal│ │Doctor Station │ │  Lab Portal   │ │Pharmacy Portal │   │
│  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └────────┬───────┘   │
│  ┌───────┴───────┐ ┌───────┴───────┐ ┌───────┴───────┐          │           │
│  │Caregiver View │ │ Admin Portal  │ │ Motion System │ ◄────────┘           │
│  └───────────────┘ └───────────────┘ └───────────────┘                      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST / API (JSON + Auth)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                        Express 5 Application Server                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Security & RBAC Middleware (JWT Auth, Role Check, Consent Validator)   │ │
│  └───────────────────────────────────┬────────────────────────────────────┘ │
│  ┌──────────────┬──────────────┬─────┴────────┬──────────────┬────────────┐ │
│  │ Auth Service │Patient Engine│Doctor Service│ Lab Service  │Pharmacy Svc│ │
│  ├──────────────┼──────────────┼──────────────┼──────────────┼────────────┤ │
│  │Consent Engine│Payment (demo)│  AI Service  │Journey Engine│ Audit Log  │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┴────────────┘ │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Drizzle ORM
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                     PostgreSQL Database (Relational Store)                  │
│  users, patients, doctors, laboratories, pharmacies, appointments,          │
│  consultations, prescriptions, investigations, lab_reports, consent_records,│
│  pharmacy_orders, payments, healthcare_journey_events, audit_logs           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Database Changes (`lib/db/src/schema`)

The following relational entities will be established in Drizzle ORM:

1. `users` (id, email, passwordHash, role, fullName, phone, avatarUrl, createdAt)
2. `patients` (id, userId, careSyncId [e.g. `CS-2048-7392`], dateOfBirth, gender, bloodGroup, emergencyContact, idStatus)
3. `doctors` (id, userId, fullName, specialization, qualification, licenseNumber, experienceYears, organization, location, fee, rating, verifiedStatus, nextSlot)
4. `laboratories` (id, name, licenseNumber, address, contactPhone, verificationStatus)
5. `pharmacies` (id, name, licenseNumber, address, branches, contactPhone, verificationStatus)
6. `organization_members` (id, orgId, orgType, userId, role)
7. `caregivers` (id, patientId, caregiverUserId, relationship, permissions, status)
8. `doctor_availability` (id, doctorId, dayOfWeek, startTime, endTime, slotDurationMinutes, mode)
9. `appointments` (id, patientId, doctorId, bookedByDoctorId, appointmentType [`PATIENT_TO_DOCTOR`, `DOCTOR_TO_DOCTOR`], date, time, mode, status, fee, notes)
10. `consultations` (id, appointmentId, patientId, doctorId, symptoms, clinicalObservations, assessmentDiagnosis, treatmentPlan, followUpDate, notes, createdAt)
11. `prescriptions` (id, consultationId, patientId, doctorId, status, instructions, createdAt)
12. `prescription_items` (id, prescriptionId, medicineName, dosage, frequency, duration, instructions)
13. `investigations` (id, consultationId, patientId, doctorId, testName, reason, priority, instructions, status, createdAt)
14. `lab_reports` (id, investigationId, patientId, labId, testName, category, summary, structuredResults, referenceRanges, fileUrl, status, verifiedBy, verifiedAt, createdAt)
15. `medical_documents` (id, patientId, title, category, fileUrl, mimeType, sizeBytes, metadata, uploadedByUserId, createdAt)
16. `access_requests` (id, patientId, requesterDoctorId, purpose, dataScopes, status, otpCode, requestedAt, respondedAt)
17. `consent_records` (id, patientId, doctorId, grantedScopes, status, grantedAt, expiresAt, revokedAt)
18. `pharmacy_orders` (id, orderNumber [e.g. `PS-2048`], patientId, pharmacyId, prescriptionId, status, subtotal, tax, totalAmount, deliveryAddress, timeline, createdAt, updatedAt)
19. `pharmacy_order_items` (id, orderId, medicineName, quantity, unitPrice, totalPrice)
20. `payments` (id, patientId, orderId, appointmentId, amount, currency, status, paymentMethod, transactionRef, paidAt, createdAt)
21. `invoices` (id, paymentId, invoiceNumber, billingDetails, lineItems, totalAmount, issueDate)
22. `healthcare_journey_events` (id, patientId, eventType, sourceEntity, sourceEntityId, title, provider, organization, date, status, description, accent, metadata, createdAt)
23. `notifications` (id, userId, title, message, type, link, isRead, createdAt)
24. `audit_logs` (id, actorId, actorRole, action, entityType, entityId, patientId, organizationId, ipAddress, result, metadata, timestamp)

---

## 8. API Specification & Endpoints

### 8.1 Authentication & Profile
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/demo-switch` (Switch active session role effortlessly for demonstration)
- `POST /api/auth/logout`

### 8.2 Healthcare Journey & Patient Dashboard
- `GET /api/patients/:id/dashboard`
- `GET /api/patients/:id/journey`
- `POST /api/patients/:id/journey/events` (Manual or system event logging)
- `GET /api/patients/:id/analytics` (Vitals & metric history)

### 8.3 Doctor Workstation & Consultations
- `GET /api/doctors` (Directory search with filters)
- `GET /api/doctors/:id`
- `GET /api/doctors/:id/availability`
- `POST /api/doctors/:id/availability`
- `GET /api/doctor/appointments` (Doctor's appointment schedule)
- `POST /api/consultations` (Creates consultation, issues prescriptions, orders tests, auto-appends to journey)
- `GET /api/consultations/:id`
- `GET /api/prescriptions`
- `GET /api/prescriptions/:id`

### 8.4 Diagnostics & Laboratory Management
- `GET /api/lab/investigations` (Pending & in-progress requisitions queue)
- `PATCH /api/lab/investigations/:id/status` (Sample collected, processing, etc.)
- `POST /api/lab/reports` (Structured report creation with parameters & verification)
- `GET /api/lab/reports/:id`

### 8.5 Pharmacy Fulfillment & Orders
- `GET /api/pharmacies`
- `GET /api/pharmacy/orders` (Orders queue for dispensing)
- `POST /api/pharmacy/orders` (Patient submits prescription to pharmacy)
- `PATCH /api/pharmacy/orders/:id/status` (Review -> Bill -> Prep -> Ready -> Dispatched -> Delivered)
- `GET /api/pharmacy/orders/:id`

### 8.6 Appointments & Doctor-to-Doctor Booking
- `GET /api/appointments`
- `POST /api/appointments` (Patient-to-Doctor and Doctor-to-Doctor)
- `PATCH /api/appointments/:id/status` (Confirmed, In-Consultation, Completed, Cancelled)

### 8.7 Consent & Access Governance
- `GET /api/access-requests`
- `POST /api/access-requests` (Doctor requests access to a patient)
- `POST /api/access-requests/:id/verify-otp` (Simulated secure OTP check)
- `POST /api/access-requests/:id/decision` (Allow selected scopes / Deny)
- `POST /api/consent-records/:id/revoke`

### 8.8 Caregiver Delegated Access
- `GET /api/caregivers`
- `POST /api/caregivers/invite`
- `PATCH /api/caregivers/:id/permissions`
- `DELETE /api/caregivers/:id`

### 8.9 Demo Payments & Billing
- `POST /api/payments/create`
- `POST /api/payments/:id/process` (Simulated gateway state change)
- `GET /api/payments/:id/invoice`

### 8.10 AI Healthcare Information Assistant
- `POST /api/ai/journey-summary` (Dynamic synthesis of recent care events)
- `POST /api/ai/explain-report` (Plain English breakdown of lab parameters & reference ranges)
- `POST /api/ai/search` (Natural language search across patient's permitted records)

### 8.11 Notifications & Audit Logs
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/audit-logs` (Filtered by role permissions)

---

## 9. UX & Design System Plan

1. **Role Switcher & Interactive Navigation:**
   - Quick role switcher bar in demo mode allowing instant preview as:
     - **Patient:** Rahul Sharma (`CS-2048-7392`)
     - **Doctor (Cardiologist):** Dr. Ananya Sharma (Verified)
     - **Doctor (GP):** Dr. Rahul Mehta (Verified)
     - **Lab Technician:** ABC Diagnostics
     - **Pharmacist:** XYZ Pharmacy
     - **Caregiver:** Priya Sharma
     - **Administrator:** CareSync System Admin
2. **Journey Mode (Hero Visual Interaction):**
   - Progressive horizontal node flow on desktop, vertical responsive branch on mobile.
   - Status transitions (Pending -> In Progress -> Completed) with color badges and icon indicators.
   - Expandable modal/drawer for every event showing clinical notes, tests, and AI summary.
3. **Clinical Workstation UI:**
   - Fast, information-dense consultation form with multi-tab structure (Vitals, Clinical Assessment, Rx, Diagnostic Orders, Referral, Follow-up).
4. **Diagnostic & Pharmacy Trackers:**
   - Animated step progression bars for lab tests and pharmacy orders.
5. **Sandbox Payment Modal:**
   - Clean checkout drawer with itemized receipt, simulated payment processing animation, and downloadable invoice format.
6. **AI Assistant Panels:**
   - Subtle shimmer indicator while synthesizing, structured card display, clear source citation ("View Original Record"), and mandatory disclaimer footer.

---

## 10. Motion & Animation Plan

Using **Framer Motion (`framer-motion`)**:

- **Centralized Primitives (`/src/components/motion`):**
  - `PageTransition`: Gentle opacity and Y-translation (300ms easeOut).
  - `FadeIn` / `SlideIn` / `ScaleIn`: Micro-interactions for cards and modals.
  - `StaggerContainer` & `StaggerItem`: Sequenced appearance of list items and metric tiles.
  - `TimelineAnimation`: Animated line drawing and node pop-in for the Healthcare Journey.
  - `ProgressAnimation`: Smooth linear width transitions for lab & pharmacy stages.
  - `SkeletonAnimation`: Shimmer states for loading.
- **Timing Standards:**
  - Micro-interactions: 150–220ms
  - Page Transitions: 250–350ms
  - Journey Timeline Expansions: 400–600ms
- **Reduced Motion Support:**
  - Standard `useReducedMotion()` wrapper disabling physical translations when `prefers-reduced-motion: reduce` is detected.

---

## 11. Testing & QA Plan

1. **Automated Backend & Integration Tests:**
   - Unit tests for DB schemas and transaction helpers.
   - API route tests for Authentication, Consent scoping, Consultation creation, Lab reporting, Pharmacy fulfillment, and Payments.
2. **End-to-End Workflow Verification:**
   - Complete seamless demo journey test:
     1. Patient registers & receives CareSync ID (`CS-2048-7392`).
     2. Patient books appointment with Dr. Rahul Mehta.
     3. Demo payment processed.
     4. Dr. Rahul Mehta conducts consultation, issues prescription & orders lipid panel lab test.
     5. ABC Diagnostics collects sample, processes test, and publishes lab report.
     6. Patient & Doctor receive notification; Lab report attaches to Journey timeline.
     7. AI generates plain English report explanation.
     8. Prescription sent to XYZ Pharmacy; Pharmacy confirms stock, quotes ₹850, patient pays in demo mode, order fulfilled.
     9. Doctor refers to specialist Dr. Ananya Sharma; specialist requests access, patient verifies with OTP and grants access.
     10. Dr. Ananya Sharma reviews full continuous journey with AI summary and continues care.
3. **Cross-Device & Accessibility Testing:**
   - Responsive layout on desktop (1920x1080, 1440x900) and mobile viewports (390x844).
   - Keyboard focus rings, ARIA labels, semantic landmark elements, contrast ratios.

---

## 12. Implementation Phases

| Phase | Description | Deliverables |
|---|---|---|
| **Phase 1: Foundation & Data Layer** | Establish complete PostgreSQL Drizzle schema, seeding realistic demo data (Rahul Sharma, Dr. Ananya Sharma, Dr. Rahul Mehta, ABC Diagnostics, XYZ Pharmacy, Caregiver, Admin), and authentication & session middleware. | `lib/db/src/schema/*`, seed script, `auth` middleware |
| **Phase 2: Core Backend Engine** | Implement RESTful API routes for Consultations, Prescriptions, Lab Investigations, Pharmacy Orders, Appointments, Consent with OTP, Payments, AI Assistance, and Audit Logging. | `artifacts/api-server/src/routes/*`, services |
| **Phase 3: Motion System & Primitives** | Centralize Framer Motion components (`FadeIn`, `StaggerContainer`, `TimelineAnimation`, `ProgressAnimation`, reduced motion). | `artifacts/caresync/src/components/motion/*` |
| **Phase 4: Multi-Role Frontends** | Build role-specific workstations (Patient Portal with Hero Journey, Doctor Workstation, Lab Tech Portal, Pharmacist Station, Caregiver View, Admin Verification). | `artifacts/caresync/src/features/*`, UI views |
| **Phase 5: Interconnected Features** | Connect live workflows: Consultation -> Rx + Lab Order -> Lab Report -> Pharmacy Dispensing -> Specialist Referral -> Consent with OTP -> Sandbox Payment -> AI Explanations. | Integrated frontend & query mutations |
| **Phase 6: Quality, Polish & Documentation** | Verification on desktop & mobile, audit trail inspection, test suite execution, developer documentation (`ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `AI_SAFETY.md`, `DEMO_GUIDE.md`, `MOTION_GUIDELINES.md`, `IMPLEMENTATION_STATUS.md`). | Complete documentation, build & typecheck |

---

## 13. Next Immediate Step

Upon approval of this implementation plan, proceed directly to **Phase 1: Database Schema & Relational Models Definition**.
