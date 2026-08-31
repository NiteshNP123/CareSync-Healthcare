# CareSync — Architecture & Codebase Audit Report

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  
**Tagline:** *“Your healthcare journey should never start from zero.”*  
**Auditor:** Lead Software Architect, Senior Full-Stack Engineer, Security Engineer, Healthcare UX Designer  
**Date:** August 31, 2026  

---

## 1. Executive Summary

CareSync is conceptualized as a continuous healthcare coordination and journey management platform connecting Patients, Doctors, Laboratories, Pharmacies, Caregivers, and Administrators. 

A thorough inspection of the repository (`CareSync-Healthcare-Coordination`) reveals that the current repository contains a **single-page prototype shell** with high visual fidelity on the landing page and basic patient overview, but lacks core multi-role workflows, real database persistence, authentication, authorization, role-based access controls (RBAC), and interconnected healthcare events.

This document details the exhaustive audit across all layers of the codebase to establish a baseline before executing the complete full-stack transformation.

---

## 2. Frontend Inspection (`artifacts/caresync`)

### 2.1 Component Structure & Architecture
- **Monolithic Single File:** The majority of the frontend application is contained in a single 431-line file (`artifacts/caresync/src/App.tsx`). This includes routing, state management, UI components (Landing, Dashboard, Journey, Doctors list, Consent modal, Orders, Profile), and fallback mock datasets.
- **Missing Role Views:** There are zero interfaces or routes for:
  - Doctor Dashboard & Clinical Workstation (Consultations, Prescriptions, Test Orders, Availability setup, Patient records review, Doctor-to-doctor referrals)
  - Laboratory Portal (Test requisition queue, sample collection status, structured report builder, report verification, release)
  - Pharmacy Portal (Prescription fulfillment queue, inventory availability check, bill/invoice generator, order lifecycle management)
  - Caregiver Access Portal (Delegated patient view, permission-gated metrics, emergency contacts, reminders)
  - Administrator Portal (Doctor verification review, Lab/Pharmacy organization credentialing, system audit logs)
- **Routing:** Uses `wouter` with basic client routes (`/`, `/app`, `/app/journey`, `/app/doctors`, `/app/consent`, `/app/orders`, `/app/profile`). No route guards, role protection, or session state verification exists.

### 2.2 Hooks and State Management
- Uses `@tanstack/react-query` with generated hooks from `@workspace/api-client-react`.
- Local UI state is managed with isolated `useState` calls in `App.tsx`.
- No global user/session context or auth provider exists. Role switching or session management cannot be performed dynamically.

### 2.3 UI & Design System
- **Tailwind CSS v4:** Configured via `@tailwindcss/vite` in `artifacts/caresync/src/index.css`.
- **Typography:** Uses DM Sans (`--font-sans`) and Fraunces serif (`--font-serif`).
- **Color Palette:** Warm, calming clinical tones (deep teal `--primary`, soft sand `--secondary`, gentle coral `--accent`, dark slate `--sidebar`).
- **Component Primitives:** Contains a comprehensive set of Radix UI primitives in `artifacts/caresync/src/components/ui/`, but most remain unused in the current monolithic `App.tsx`.

---

## 3. Backend & API Inspection (`artifacts/api-server`)

### 3.1 Server Architecture
- **Framework:** Express 5 (`express: ^5.2.1`) in ESM mode with `pino-http` logging and `cors`.
- **Routes:** Only two route files exist:
  1. `health.ts` (`GET /api/healthz`)
  2. `caresync.ts` (`/api/caresync/*`)
- **Current Endpoints in `caresync.ts`:**
  - `GET /api/caresync/dashboard`
  - `GET /api/caresync/journey`
  - `GET /api/caresync/doctors`
  - `GET /api/caresync/access-requests`
  - `POST /api/caresync/access-requests/:id/decision`
  - `GET /api/caresync/appointments`
  - `POST /api/caresync/appointments`
  - `GET /api/caresync/pharmacy-orders`
  - `GET /api/caresync/ai-summary`

### 3.2 In-Memory Mocking & Data Loss
- All backend data is stored in ephemeral in-memory variables (`let appointments = [...]`, `let accessRequests = [...]`, `const doctors = [...]`).
- Server restarts completely wipe any booked appointments or consent decisions.
- There is no linkage between appointments, consultations, prescriptions, lab orders, pharmacy orders, and journey events.

### 3.3 Missing Backend Capabilities
- **Authentication System:** No `/auth/register`, `/auth/login`, `/auth/me`, `/auth/logout`, `/auth/switch-role`, or password hashing (`bcrypt`/`argon2`).
- **Clinical Endpoints:** No endpoints for creating consultations, drafting prescriptions, ordering diagnostic tests, or uploading/verifying lab reports.
- **Doctor Availability:** No endpoint to fetch or configure doctor weekly slots or check double-booking conflicts.
- **Doctor Verification & Admin:** No document submission or credential review endpoints.
- **Caregiver & Consent:** No OTP generation/verification endpoints for step-up consent, and no granular access scope filter.
- **Payments & Billing:** No endpoints for creating payment requests, sandbox checkout transitions, or generating invoices.
- **Audit Logging:** Zero audit logging middleware or endpoints to record data access or state mutations.

---

## 4. Database Layer Inspection (`lib/db`)

### 4.1 ORM & Driver
- Drizzle ORM (`drizzle-orm: ^0.45.2`) and node-postgres (`pg: ^8.16.x`).
- `lib/db/src/index.ts` creates a connection pool from `process.env.DATABASE_URL`.

### 4.2 Schema State
- `lib/db/src/schema/index.ts` contains only `export {}`.
- **Zero database tables exist in the repository.**
- No migrations, seeds, or relation definitions are present.

---

## 5. Security & RBAC Audit

### 5.1 Critical Security Deficiencies
1. **No Authentication or Session Validation:** Anyone can call any API endpoint without headers, cookies, or tokens.
2. **No Object-Level Authorization:** No mechanism to ensure a patient only accesses their own health records, or that a doctor only accesses consented patient data.
3. **No Role-Based Access Control (RBAC):** There is no distinction between patient, doctor, technician, pharmacist, caregiver, or admin privileges on the backend.
4. **No Audit Trail:** Access to sensitive health records is unlogged, violating standard healthcare software security principles.
5. **No Input Sanitization / Strict Validation:** In-memory endpoints do basic Zod parsing for a few fields, but lack relational validation (e.g., verifying `doctorId` exists in database before booking).

---

## 6. AI Features & Safety Audit

### 6.1 Current State
- The AI summary is a static hardcoded endpoint (`/caresync/ai-summary`) returning fixed strings:
  - *Headline:* "Your care is moving forward"
  - *Body:* "Your recent blood work has been received..."
  - *Next Step:* "Review your HbA1c report..."
- No dynamic analysis of patient records or timeline exists.
- No Report Explanation tool (`"Explain Report"`).
- No Intelligent Natural Language Search (`"Show blood reports from the last six months"`).
- No AI Consultation Summarization tool.

### 6.2 AI Safety & Medical Disclaimer
- Static disclaimer is present in the mock JSON: *"AI-generated information may contain errors. Verify important information against the original record and consult a qualified healthcare professional."*
- Needs systematic enforcement: AI must strictly assist information synthesis and explanation of user-accessible records, never provide diagnosis, prescription, or clinical directives.

---

## 7. Motion & Animation Audit

### 7.1 Current Animations
- Currently uses minimal CSS keyframes in `index.css`: `.fade-up`, `.fade-in`, `.modal-in`.
- `framer-motion` is in the workspace catalog but is not utilized.
- Timeline transitions are static; when items change or are added, they do not animate.
- Workflow progress indicators (e.g. Lab stages, Pharmacy order tracker) are static CSS bars without state transition animation.

### 7.2 Accessibility & Reduced Motion
- No `prefers-reduced-motion` media queries or MotionConfig controls in the frontend components.

---

## 8. Dependencies & Tooling Audit

| Package / Tool | Version / Status | Notes |
|---|---|---|
| Node.js | v24 | Supported |
| TypeScript | v5.9.3 | Strict mode configured |
| Express | v5.2.1 | Modern async routing |
| Drizzle ORM | v0.45.2 | Configured, schema empty |
| React | v19.1.0 | Latest React 19 architecture |
| Tailwind CSS | v4.1.14 | Using modern `@theme` inline tokens |
| Framer Motion | v12.23.24 | Available in catalog |
| Lucide React | v0.545.0 | Available |
| Recharts | v2.15.2 | Available, currently unused |
| Wouter | v3.3.5 | Client routing |
| Orval / Zod | Configured | Used for contract codegen |

---

## 9. Incomplete & Missing Feature Matrix

| Feature Area | Current Status | Target Requirement |
|---|---|---|
| **Multi-Role Authentication** | None (1 hardcoded mock patient) | Real auth with JWT/session, demo quick-switch, 6 distinct roles |
| **Database Persistence** | Empty (`export {}`) | Complete PostgreSQL / Drizzle schema with 20+ relational entities |
| **Patient Journey Timeline** | Static array in backend memory | Dynamic, living timeline connected to consultations, tests, reports, medications |
| **Doctor Workstation** | None | Full doctor dashboard, appointment manager, consultation creation, prescription & test ordering |
| **Lab Management** | None | Diagnostic center portal, requisition queue, report builder with reference ranges, verification |
| **Pharmacy Management** | Static read-only order list | Pharmacist queue, bill generation, prescription verification, interactive delivery tracker |
| **Appointments & Availability** | In-memory booking | Slot scheduling, doctor availability rules, double-booking prevention, Patient-to-Doctor & Doctor-to-Doctor types |
| **Consent & Access Requests** | Binary mock switch | OTP verification flow, granular data scopes, consent revocation, doctor search & request |
| **Caregiver Portal** | Static toggle in settings | Caregiver invitation, role delegation, access restrictions (non-clinical modification) |
| **Payments (Sandbox)** | None | Sandbox payment modal, state transitions (Pending -> Paid -> Receipt), invoice generation |
| **AI Assistant** | Static mock text | Dynamic journey summarization, report explanation, structured search, clear safety guardrails |
| **Health Analytics** | None | Vitals & lab trends visualizations (Blood pressure, glucose, HbA1c, heart rate) using Recharts |
| **Motion System** | 3 basic CSS keyframes | Centralized Framer Motion primitives, journey animations, reduced-motion compliance |
| **Audit Logging** | None | Immutable tamper-evident audit log of all record views, consent changes, and clinical edits |

---

## 10. Audit Conclusion

The current codebase provides a clean visual aesthetic and workspace scaffolding, but is effectively an early UI mock with zero database persistence, no authentication, no clinical workflows, and no role separation.

A systematic, phased transformation is required to elevate CareSync into an enterprise-grade, realistic, modern full-stack healthcare coordination platform.
