# CareSync — Security & Governance Architecture

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  

---

## 1. Security Principles

1. **Patient-Controlled Consent Over Direct Access:**
   - Knowing a CareSync ID (e.g. `CS-2048-7392`) does not grant a physician immediate access to medical history.
   - Access requires an active `ConsentRecord` authorized by the patient with specific data scopes (`CONSULTATIONS`, `PRESCRIPTIONS`, `LAB_REPORTS`, `JOURNEY`, `VITALS`, `ORDERS`).
2. **Backend-Enforced Role-Based Access Control (RBAC):**
   - All authorization checks are executed at the server middleware layer (`requireAuth`, `requireRole`, `verifyPatientAccess`).
   - Frontend route hiding is never treated as a security boundary.
3. **Tamper-Evident Audit Logging:**
   - All access to health records, consent approvals/revocations, clinical note creation, lab report publishing, and credential reviews write to immutable `audit_logs`.
4. **Independent Healthcare Prototype Positioning:**
   - CareSync is an independent healthcare coordination software project and is not affiliated with the Government of India, ABDM, ABHA, eSanjeevani, or any government authority.
   - Prototype identity verification uses a simulated abstraction and never stores raw government identification numbers.

---

## 2. Authentication & Session Security

- **Password Security:** Hashed with cryptographic salts (`crypto.scryptSync`). Plaintext passwords are never stored.
- **Signed Tokens:** Signed with HMAC SHA256 (`HS256`) including role claims, user identifiers, and expiration timestamps.
- **Cookie Security:** Delivered in `HttpOnly` and `SameSite=Lax` cookies to prevent XSS exfiltration.

---

## 3. Role-Based Access Control Matrix

| Resource | Patient | Doctor | Lab Staff | Pharmacy Staff | Caregiver | Admin |
|---|---|---|---|---|---|---|
| **Own Health Journey** | Full (Read/Write) | Consented Only | No | No | Read (Delegated) | Read |
| **Doctor Consultations** | Read Own | Create / Read Consented | No | No | Read (Delegated) | Read |
| **Prescription Items** | Read Own | Create / Edit Own | No | Read Only | Read (Delegated) | Read |
| **Diagnostic Requisitions** | Read Own | Create / Read Consented | Full (Process) | No | Read (Delegated) | Read |
| **Structured Lab Reports** | Read Own | Read Consented | Create / Publish | No | Read (Delegated) | Read |
| **Pharmacy Orders** | Create / Pay | No | No | Fulfill / Update | Read (Delegated) | Read |
| **Consent & Access Requests**| Decide / Revoke | Initiate Request | No | No | No | Read |
| **Doctor Verification** | View Badge | Submit Documents | No | No | No | Approve / Revoke |
| **System Audit Logs** | View Own Trail | View Own Trail | No | No | No | Full Inspection |

---

## 4. Sandbox Payment Security

- Real financial credentials (card numbers, CVVs, bank logins) are **strictly forbidden** from storage.
- All transactions execute in sandbox/demo mode with mock state transitions (`PENDING` -> `PROCESSING` -> `PAID` / `FAILED`).
- Itemized invoices are cryptographically assigned transaction references (`CS-PAY-...`).

---

## 5. AI Safety Guardrails

- **Assistive Role Only:** The AI engine assists with information retrieval, timeline synthesis, and terminology explanation.
- **Strict Clinical Boundaries:** AI is programmatically prohibited from generating independent medical diagnoses, altering prescriptions, or recommending treatment discontinuation.
- **Mandatory Safety Disclaimer:** Every AI response includes: *"CareSync AI provides software-assisted information management and does not replace professional medical diagnosis or treatment."*
