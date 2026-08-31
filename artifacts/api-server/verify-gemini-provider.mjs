import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "./src/app.ts";
import {
  GeminiAssistantProvider,
  categorizeGeminiError,
} from "./src/services/ai/geminiProvider.ts";
import { DeterministicAssistantProvider } from "./src/services/ai/deterministicProvider.ts";
import { AssistantProviderFactory } from "./src/services/ai/providerFactory.ts";
import { AssistantSafetyLayer } from "./src/services/ai/safetyLayer.ts";

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("Gemini Assistant Provider Diagnostics & Verification Suite", async (t) => {
  const origProvider = process.env.AI_PROVIDER;
  const origKey = process.env.GEMINI_API_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  const origDemoMode = process.env.DEMO_MODE;

  // 1. Error Categorization Unit Tests for all 7 distinct reasons
  await t.test("1. Error Categorization distinguishes all 7 fallback reasons", () => {
    // GEMINI_AUTH
    assert.equal(categorizeGeminiError(new Error("API key not valid. Please pass a valid API key.")), "GEMINI_AUTH");
    assert.equal(categorizeGeminiError({ status: 401, message: "Unauthorized" }), "GEMINI_AUTH");
    assert.equal(categorizeGeminiError({ status: 403, message: "Permission Denied" }), "GEMINI_AUTH");

    // GEMINI_MODEL_NOT_FOUND
    assert.equal(categorizeGeminiError({ status: 404, message: "models/gemini-unknown not found" }), "GEMINI_MODEL_NOT_FOUND");

    // GEMINI_RATE_LIMIT
    assert.equal(categorizeGeminiError({ status: 429, message: "Resource exhausted: quota exceeded" }), "GEMINI_RATE_LIMIT");

    // GEMINI_NETWORK
    assert.equal(categorizeGeminiError(new Error("fetch failed: connect ECONNREFUSED")), "GEMINI_NETWORK");

    // GEMINI_TIMEOUT
    const timeoutErr = new Error("Request aborted");
    timeoutErr.name = "AbortError";
    assert.equal(categorizeGeminiError(timeoutErr), "GEMINI_TIMEOUT");

    // GEMINI_INVALID_RESPONSE
    assert.equal(categorizeGeminiError(new Error("Unexpected token < in JSON")), "GEMINI_INVALID_RESPONSE");
  });

  // 2. Provider Factory Selection
  await t.test("2. ProviderFactory accurately reflects AI_PROVIDER setting", () => {
    process.env.AI_PROVIDER = "deterministic";
    const detProvider = AssistantProviderFactory.getProvider();
    assert.equal(detProvider.name, "deterministic");

    process.env.AI_PROVIDER = "gemini";
    const gemProvider = AssistantProviderFactory.getProvider();
    assert.equal(gemProvider.name, "gemini");
  });

  // 3. Explicit Timeout Test
  await t.test("3. Explicit bounded timeout returns GEMINI_TIMEOUT and engages fallback", async () => {
    const provider = new GeminiAssistantProvider();
    provider.timeoutMs = 1; // 1ms forces instant timeout
    process.env.GEMINI_API_KEY = "test_key_for_timeout";
    process.env.NODE_ENV = "development";

    const mockContext = {
      patient: { id: 1, name: "Rahul Sharma", careSyncId: "CS-2048-7392" },
      nextAppointment: {
        id: 1,
        doctorName: "Dr. Rahul Mehta",
        specialization: "General Physician",
        organization: "Northstar Medical Centre",
        date: "2026-08-28",
        time: "04:30 PM",
        mode: "Video consultation",
        status: "CONFIRMED",
      },
      pendingTasksCount: 1,
    };

    const res = await provider.generateResponse("What is my next appointment?", mockContext, "APPOINTMENT");
    assert.equal(res.provider, "deterministic-fallback");
    assert.equal(res.fallbackReason, "GEMINI_TIMEOUT");
    assert.ok(res.reply.includes("Dr. Rahul Mehta"));
  });

  // 4. Missing API Key Test
  await t.test("4. Missing GEMINI_API_KEY returns GEMINI_NOT_CONFIGURED fallbackReason", async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiAssistantProvider();
    const mockContext = {
      patient: { id: 1, name: "Rahul Sharma", careSyncId: "CS-2048-7392" },
      nextAppointment: {
        id: 1,
        doctorName: "Dr. Rahul Mehta",
        specialization: "General Physician",
        organization: "Northstar Medical Centre",
        date: "2026-08-28",
        time: "04:30 PM",
        mode: "Video consultation",
        status: "CONFIRMED",
      },
      pendingTasksCount: 1,
    };

    const res = await provider.generateResponse("What is my next appointment?", mockContext, "APPOINTMENT");
    assert.equal(res.provider, "deterministic-fallback");
    assert.equal(res.fallbackReason, "GEMINI_NOT_CONFIGURED");
    assert.ok(res.reply.includes("Dr. Rahul Mehta"));
  });

  // 5. Invalid API Key Upstream Call Test
  await t.test("5. Invalid API key returns GEMINI_AUTH fallbackReason", async () => {
    process.env.GEMINI_API_KEY = "AIzaSy_MockInvalidKeyForTesting";
    process.env.NODE_ENV = "development";
    const provider = new GeminiAssistantProvider();
    provider.timeoutMs = 15000;

    const mockContext = {
      patient: { id: 1, name: "Rahul Sharma", careSyncId: "CS-2048-7392" },
      nextAppointment: {
        id: 1,
        doctorName: "Dr. Rahul Mehta",
        specialization: "General Physician",
        organization: "Northstar Medical Centre",
        date: "2026-08-28",
        time: "04:30 PM",
        mode: "Video consultation",
        status: "CONFIRMED",
      },
      pendingTasksCount: 1,
    };

    const res = await provider.generateResponse("What is my next appointment?", mockContext, "APPOINTMENT");
    assert.equal(res.provider, "deterministic-fallback");
    assert.equal(res.fallbackReason, "GEMINI_AUTH");
    assert.ok(res.reply.includes("Dr. Rahul Mehta"));
  });

  // 6. Source & Navigation Action Allowlist
  await t.test("6. Safety Layer strictly enforces route allowlist & authentic citations", () => {
    const mockContext = {
      patient: { id: 1, name: "Rahul Sharma", careSyncId: "CS-2048-7392" },
      nextAppointment: {
        id: 1,
        doctorName: "Dr. Rahul Mehta",
        specialization: "General Physician",
        organization: "Northstar Medical Centre",
        date: "2026-08-28",
        time: "04:30 PM",
        mode: "Video consultation",
        status: "CONFIRMED",
      },
      pendingTasksCount: 1,
    };

    const rawResponse = {
      reply: "Your appointment is confirmed.",
      sources: [
        { type: "APPOINTMENT", title: "Appointment with Dr. Rahul Mehta", date: "2026-08-28", route: "/app/journey" },
        { type: "APPOINTMENT", title: "Appointment with Nonexistent Doctor", date: "2026-12-31", route: "/app/journey" },
        { type: "GENERAL", title: "External Link", route: "https://untrusted-site.com" },
      ],
      suggestedActions: [
        { label: "View Journey", actionType: "NAVIGATE", route: "/app/journey" },
        { label: "Malicious Route", actionType: "NAVIGATE", route: "/external-target" },
      ],
      disclaimer: "Medical disclaimer",
      generatedAt: new Date().toISOString(),
      intent: "APPOINTMENT",
      provider: "gemini",
    };

    const sanitized = AssistantSafetyLayer.validateAndSanitize(rawResponse, mockContext);
    assert.equal(sanitized.sources.length, 1);
    assert.equal(sanitized.sources[0].title, "Appointment with Dr. Rahul Mehta");
    assert.equal(sanitized.suggestedActions.length, 1);
    assert.equal(sanitized.suggestedActions[0].route, "/app/journey");
  });

  // 7. Full HTTP End-to-End Chat Test with Audit Log Fallback Reason Check
  await t.test("7. POST /api/ai/assistant/chat logs fallbackReason in audit metadata", async () => {
    process.env.AI_PROVIDER = "gemini";
    delete process.env.GEMINI_API_KEY;
    process.env.NODE_ENV = "development";
    process.env.DEMO_MODE = "true";

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rahul.sharma@example.com", password: "demoPassword" }),
    });
    assert.equal(loginRes.status, 200);
    const { token: patientToken } = await loginRes.json();

    const chatRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: "What is my next appointment?" }),
    });

    assert.equal(chatRes.status, 200);
    const data = await chatRes.json();
    assert.equal(data.provider, "deterministic-fallback");
    assert.equal(data.fallbackReason, "GEMINI_NOT_CONFIGURED");

    // Verify Admin Audit Log captures fallbackReason
    const adminLogin = await fetch(`${baseUrl}/auth/demo-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "ADMIN" }),
    });
    const { token: adminToken } = await adminLogin.json();

    const auditRes = await fetch(`${baseUrl}/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logs = await auditRes.json();
    const assistantLog = logs.find((l) => l.action.startsWith("AI_PATIENT_ASSISTANT") && l.metadata?.fallbackReason);
    assert.ok(assistantLog, "Audit log must contain fallbackReason metadata");
    assert.equal(assistantLog.metadata.fallbackReason, "GEMINI_NOT_CONFIGURED");
  });

  // 8. Baseline Deterministic Mode Regression Test
  await t.test("8. AI_PROVIDER=deterministic preserves baseline deterministic behavior without fallback tags", async () => {
    process.env.AI_PROVIDER = "deterministic";
    delete process.env.GEMINI_API_KEY;

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "rahul.sharma@example.com", password: "demoPassword" }),
    });
    const { token: patientToken } = await loginRes.json();

    const chatRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({ message: "What is my next appointment?" }),
    });

    assert.equal(chatRes.status, 200);
    const data = await chatRes.json();
    assert.equal(data.provider, "deterministic");
    assert.equal(data.intent, "APPOINTMENT");
    assert.ok(data.reply.includes("Dr. Rahul Mehta"));
  });

  // Restore env
  process.env.AI_PROVIDER = origProvider;
  process.env.GEMINI_API_KEY = origKey;
  process.env.NODE_ENV = origNodeEnv;
  process.env.DEMO_MODE = origDemoMode;
});
