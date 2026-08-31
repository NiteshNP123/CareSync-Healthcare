import http from "node:http";
import app from "./src/app.ts";
import assert from "node:assert/strict";

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}/api`;

console.log(`\n======================================================`);
console.log(`🧪 Live End-to-End Test for 'what is my next consultant'`);
console.log(`🔗 Target: ${baseUrl}/ai/assistant/chat`);
console.log(`======================================================\n`);

// 1. Authenticate demo patient
const loginRes = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "rahul.sharma@example.com", password: "demoPassword" }),
});
const { token } = await loginRes.json();

// 2. Query exact prompt
const testQueries = [
  "what is my next consultant",
  "What is my next appointment?",
  "When is my next consultation?",
  "What doctor am I seeing next?",
  "Who is my next doctor?",
  "upcoming consultation",
  "next doctor visit"
];

for (const q of testQueries) {
  console.log(`Testing Query: "${q}"`);
  const chatRes = await fetch(`${baseUrl}/ai/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: q,
      conversationId: "session-test-e2e",
      activeRoute: "/app",
    }),
  });

  assert.equal(chatRes.status, 200, `Expected HTTP 200 for query: "${q}"`);
  const data = await chatRes.json();
  
  console.log(`  ✅ Status: ${chatRes.status}`);
  console.log(`  🎯 Resolved Intent: ${data.intent}`);
  console.log(`  💬 Reply: ${data.reply}`);
  console.log(`  📚 Sources: ${data.sources.map(s => s.title).join(", ")}`);
  console.log(`  ⚡ Actions: ${data.suggestedActions.map(a => a.label).join(", ")}\n`);
  
  assert.equal(data.intent, "APPOINTMENT");
  assert.ok(data.reply.includes("Dr. Rahul Mehta"));
  assert.ok(data.sources.length > 0);
  assert.ok(data.suggestedActions.length > 0);
}

await new Promise((resolve) => server.close(resolve));
console.log(`🎉 All live queries succeeded with 100% precision!\n`);
