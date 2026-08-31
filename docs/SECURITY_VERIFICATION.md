# CareSync — Security, Multi-Role & Permissions Verification Audit

**Document Version:** 1.0.0  
**Phase:** Phase 6 Security & Clinical Portals Verification  
**Evaluation Date:** August 31, 2026  
**Status:** **VERIFIED IN PROTOTYPE**

---

## 1. Executive Security Summary

CareSync enforces a multi-layered security architecture comprising:
1. **Server-Side Authentication & Stateless JWT Validation:** Client-supplied claims and roles are never trusted. All identity parameters (`userId`, `role`, `patientId`, `doctorId`, `organizationId`) are extracted directly from cryptographically signed server tokens.
2. **Object-Level Authorization & Anti-IDOR Protections:** Direct numeric IDs (e.g. `/patients/123`, `/prescriptions/456`) cannot be accessed without explicit active consent records, caregiver delegation, or direct entity ownership.
3. **Clinical Data Immutability:** Doctor-authored diagnoses and clinical encounter notes cannot be altered or overwritten by lab staff, pharmacy staff, caregivers, or patients.
4. **Zero-Assumption Granular Consent Engine:** Doctor access requests require selective data scoping (`CONSULTATIONS`, `LAB_REPORTS`, `PRESCRIPTIONS`, `VITALS`, `JOURNEY`) and OTP authorization. Revoking consent immediately revokes access to protected endpoints (`403 Forbidden`).
5. **Tamper-Evident Audit Logging:** Sensitive clinical actions (consultations, lab report publication, payments, consent approvals/revocations) produce append-only audit trail logs with actor identity, action type, target entity, timestamp, and outcome.

---

## 2. Six-Role Authorization Matrix

| Endpoint Area | Patient | Doctor | Lab Staff | Pharmacy Staff | Caregiver | Admin |
|---|---|---|---|---|---|---|
| **View Patient Dashboard** | Own Only | Consented Only | ✕ | ✕ | Delegated Only | Audit View Only |
| **Create Clinical Consultation** | ✕ | Authorized Only | ✕ | ✕ | ✕ | ✕ |
| **Publish Lab Report** | ✕ | ✕ | Own Org Only | ✕ | ✕ | ✕ |
| **Create / Alter Prescription** | ✕ | Authorized Only | ✕ | ✕ | ✕ | ✕ |
| **View Pharmacy Dispensing Queue** | ✕ | ✕ | ✕ | Own Org Only | ✕ | ✕ |
| **Execute Sandbox Payment** | Own Only | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Grant / Revoke Consent** | Own Only | ✕ | ✕ | ✕ | ✕ | ✕ |
| **Doctor Credential Verification** | ✕ | ✕ | ✕ | ✕ | ✕ | Verified Admins |
| **System-Wide Audit Logs** | ✕ | ✕ | ✕ | ✕ | ✕ | Verified Admins |

---

## 3. Hostile Security Tests & Results

| Attack Vector / Test Case | Attempted Action | Expected Result | Prototype Outcome | Status |
|---|---|---|---|---|
| **IDOR Attack 1** | Patient A queries `/patients/{Patient_B_ID}/dashboard` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **IDOR Attack 2** | Patient B queries `/patients/{Patient_A_ID}/vitals` | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Unconsented Doctor Attack** | Doctor B attempts to view unconsented Patient A | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Unconsented Encounter Creation** | Doctor attempts to write consultation for unconsented Patient | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Clinical Immutability 1** | Lab staff attempts to create consultation/diagnosis | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Clinical Immutability 2** | Pharmacy staff attempts to alter prescription dosage | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Clinical Immutability 3** | Patient attempts to publish/alter lab report | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Post-Revocation Attack** | Doctor attempts to access patient vitals after consent revocation | `403 Forbidden` | `403 Forbidden` | **PASS** |
| **Unauthenticated AI Query** | Unauthenticated user calls `/api/ai/search` | `401 Unauthorized` | `401 Unauthorized` | **PASS** |
| **Malformed Token Attack** | Client sends tampered JWT signature | `401 Unauthorized` | `401 Unauthorized` | **PASS** |

---

## 4. Consent Lifecycle State Machine

```
[DOCTOR ACCESS REQUEST]
       ↓ (Status: REQUESTED)
[PATIENT REVIEWS SCOPES & ENTERS OTP]
       ↓
   ┌───┴───────────────────────────────┐
   ↓                                   ↓
[DECISION: ALLOW]              [DECISION: DENY]
   ↓                                   ↓
(Status: ACTIVE / ALLOWED)      (Status: DENIED)
   ↓                                   ↓
[Scoped Endpoints Accessible]   [Doctor Blocked (403)]
   ↓
[PATIENT REVOKES CONSENT]
   ↓
(Status: REVOKED)
   ↓
[Doctor Immediately Blocked (403)]
```

---

## 5. Prototype Verification vs. Production Compliance Roadmap

### Verified in Prototype
- In-memory cryptographic password hashing with SHA-256 and salted HMAC.
- Server-side JWT role and patient ownership validation.
- Active consent checking on all patient clinical endpoints.
- Scoped data access enforcement.
- Tamper-evident append-only audit trail.
- Multi-role UI portal separation.

### Requirements for Production Deployment
1. **HIPAA / GDPR / DISHA Regulatory Compliance:** Formal Business Associate Agreements (BAAs), SOC2 Type II certification, and annual third-party penetration testing.
2. **KMS / HSM Encryption at Rest:** Production database column-level encryption using hardware security modules (AWS KMS / GCP Cloud KMS / Azure Key Vault).
3. **Signed Medical Document URLs:** Replace relative file URLs with short-lived (e.g. 5-minute) AWS S3 / Cloud Storage Pre-Signed URLs with strict IP/referrer binding.
4. **mTLS & Hardware 2FA:** Require FIDO2 / WebAuthn hardware keys or TOTP authenticator apps for clinical staff logins.
5. **Real-time SIEM Audit Shipping:** Stream audit records to immutable SIEM systems (Datadog, Splunk, AWS CloudWatch Audit) with write-once-read-many (WORM) storage.
