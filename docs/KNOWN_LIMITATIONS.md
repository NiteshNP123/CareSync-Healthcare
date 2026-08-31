# CareSync — Known Limitations & Prototype Boundaries

**Document Version:** 1.0.0  
**Phase:** Phase 7 Final System Audit  
**Date:** August 31, 2026  

---

## 1. Prototype Scope vs. Production Reality

1. **Simulated OTP Delivery:**
   - *Current State:* OTP verification uses a pre-generated code (e.g. `749201`) returned in demo API responses to allow self-contained local evaluation without SMS gateway charges.
   - *Production Need:* Integrate with telecom SMS / WhatsApp API (e.g. Twilio / Gupshup) with rate limiting.

2. **Sandbox Payment Processing:**
   - *Current State:* Payments are executed in sandbox mode generating realistic itemized invoices (`INV-2048-...`). Real credit cards or UPI handles are not billed.
   - *Production Need:* Integrate certified PCI-DSS compliant payment gateways (Razorpay / Stripe) with encrypted webhooks.

3. **In-Memory Store Persistence:**
   - *Current State:* Data entities persist in memory across the server lifecycle. Restarting the server resets state to the seeded demonstration dataset.
   - *Production Need:* Connect to persistent PostgreSQL instance with automated backups and disaster recovery.

4. **Medical Document Storage:**
   - *Current State:* Diagnostic lab report parameters and findings are stored as structured JSON records.
   - *Production Need:* Integrate encrypted object storage (AWS S3 with Server-Side Encryption) for PDF binary uploads and DICOM imaging files.

5. **Regulatory Governance:**
   - *Current State:* Built as an independent software prototype for clinical workflow demonstration.
   - *Production Need:* Execute formal HIPAA Business Associate Agreements (BAAs), SOC2 Type II certification, and medical device software safety evaluations (CDSCO / FDA).
