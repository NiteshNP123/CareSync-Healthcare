# CareSync — REST API Specification & Route Reference

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  
**Base URL:** `/api`  
**Authentication:** Bearer JWT Token or `auth_token` HttpOnly Cookie  

---

## 1. Authentication & Session Management

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Register new user + patient/doctor profile |
| `/api/auth/login` | `POST` | Public | Sign in with email & password, returns JWT |
| `/api/auth/me` | `GET` | Authenticated | Retrieve authenticated user profile & roles |
| `/api/auth/demo-switch` | `POST` | Public / Demo | Quick switch between personas (Patient, Doctor, Lab, Pharmacy, Caregiver, Admin) |
| `/api/auth/logout` | `POST` | Authenticated | Invalidate session cookie |

---

## 2. Patients & Clinical Profile

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/patients/:id/dashboard` | `GET` | Patient / Doctor (Consented) / Admin | Retrieve care stage, next appointment, pending tests, active medicines |
| `/api/patients/:id/vitals` | `GET` | Patient / Doctor (Consented) | Retrieve longitudinal vital history (BP, Glucose, Heart Rate, Weight) |
| `/api/patients/:id/vitals` | `POST` | Patient / Doctor | Record new vital sign measurement |
| `/api/patients/:id/caregivers` | `GET` | Patient / Admin | List authorized family caregivers |
| `/api/patients/:id/caregivers` | `POST` | Patient | Invite and activate caregiver delegation |

---

## 3. Doctors & Clinical Workstation

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/doctors` | `GET` | Public | Search verified doctor directory with filters |
| `/api/doctors/:id` | `GET` | Public | Get doctor credentials, bio, and weekly availability |
| `/api/doctors/:id/availability` | `POST` | Doctor / Admin | Configure weekly consultation slots and break hours |
| `/api/doctors/:id/verify` | `POST` | Doctor / Admin | Upload credential documents or admin approval |

---

## 4. Appointments & Scheduling

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/appointments` | `GET` | Authenticated | List appointments filtered by role context |
| `/api/appointments` | `POST` | Authenticated | Book Patient-to-Doctor or Doctor-to-Doctor appointment with double-booking prevention |
| `/api/appointments/:id/status` | `PATCH` | Authenticated | Update status (`CONFIRMED`, `IN_CONSULTATION`, `COMPLETED`, `CANCELLED`) |

---

## 5. Consultations, Prescriptions & Diagnostics

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/consultations` | `GET` | Authenticated | List clinical consultation encounters |
| `/api/consultations/:id` | `GET` | Authenticated | Get detailed consultation with linked Rx & investigations |
| `/api/consultations` | `POST` | Doctor Only | Create clinical consultation notes; automatically updates Healthcare Journey |
| `/api/prescriptions` | `GET` | Authenticated | List prescriptions (Patient, Doctor, or Pharmacy view) |
| `/api/prescriptions/:id` | `GET` | Authenticated | View prescription with dosage & duration items |
| `/api/investigations` | `GET` | Authenticated | List diagnostic requisitions |
| `/api/investigations` | `POST` | Doctor Only | Order diagnostic laboratory investigations |
| `/api/investigations/:id/status` | `PATCH` | Authenticated | Update investigation status |

---

## 6. Diagnostic Laboratory Portal

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/lab/reports` | `GET` | Authenticated | List published diagnostic reports |
| `/api/lab/reports/:id` | `GET` | Authenticated | View structured lab report with parameters and reference ranges |
| `/api/lab/investigations/:id/sample` | `PATCH` | Lab Staff | Mark diagnostic sample collected or processing |
| `/api/lab/reports` | `POST` | Lab Staff | Publish verified structured report; notifies patient and ordering physician |

---

## 7. Pharmacy Fulfillment & Dispensing

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/pharmacies` | `GET` | Public | List verified pharmacy network |
| `/api/pharmacy/orders` | `GET` | Authenticated | List pharmacy dispensing orders |
| `/api/pharmacy/orders/:id` | `GET` | Authenticated | View itemized pharmacy order & tracking timeline |
| `/api/pharmacy/orders` | `POST` | Patient | Place prescription order for home delivery |
| `/api/pharmacy/orders/:id/status` | `PATCH` | Pharmacy Staff | Advance status (`REVIEWED`, `QUOTE_ISSUED`, `PAID`, `PREPARING`, `DISPATCHED`, `DELIVERED`) |

---

## 8. Patient Access & Consent Governance

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/access-requests` | `GET` | Authenticated | List consent requests |
| `/api/patients/lookup/:careSyncId` | `GET` | Doctor | Redacted patient lookup by CareSync ID before requesting access |
| `/api/access-requests` | `POST` | Doctor | Request access with clinical purpose and requested data scopes |
| `/api/access-requests/:id/decision` | `POST` | Patient | Verify simulated OTP and grant/deny consent |
| `/api/consent-records/:id/revoke` | `POST` | Patient | Revoke doctor's access immediately |

---

## 9. Sandbox Payments & Invoicing

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/payments` | `GET` | Authenticated | List payments for user |
| `/api/payments/create` | `POST` | Authenticated | Create sandbox payment request for appointment or pharmacy order |
| `/api/payments/:id/process` | `POST` | Authenticated | Simulate gateway execution (`PENDING` -> `PAID`), generates invoice |
| `/api/payments/:id/invoice` | `GET` | Authenticated | Retrieve itemized invoice receipt |

---

## 10. Healthcare Journey (The Hero Narrative)

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/patients/:id/journey` | `GET` | Authenticated | Retrieve dynamically reconstructed chronological care narrative |
| `/api/patients/:id/journey/events` | `POST` | Authenticated | Log personal care milestone or symptom observation |

---

## 11. AI Information Assistant & Safety

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/ai/journey-summary` | `POST` | Authenticated | Synthesize care timeline and generate next steps |
| `/api/ai/explain-report` | `POST` | Authenticated | Plain English explanation of diagnostic parameters against biological reference ranges |
| `/api/ai/search` | `POST` | Authenticated | Natural language query across authorized health history |

---

## 12. Notifications & Security Audit

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/api/notifications` | `GET` | Authenticated | Retrieve user notifications |
| `/api/notifications/:id/read` | `PATCH` | Authenticated | Mark notification read |
| `/api/audit-logs` | `GET` | Admin Only | Inspect tamper-evident security audit logs |
