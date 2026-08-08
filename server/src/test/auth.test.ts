import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, parseCredentials, verifyPassword } from "../auth.js";

test("accepts any valid email domain and rejects weak registration input", () => {
  assert.deepEqual(parseCredentials({ name: "Alex Rivera", email: "alex@personal-mail.example", password: "correct-horse-battery" }, true), {
    name: "Alex Rivera", email: "alex@personal-mail.example", password: "correct-horse-battery",
  });
  assert.equal(parseCredentials({ name: "A", email: "alex@example.com", password: "correct-horse-battery" }, true), null);
  assert.equal(parseCredentials({ name: "Alex", email: "alex@example.com", password: "short" }, true), null);
});

test("stores salted passwords and verifies only the matching password", async () => {
  const stored = await hashPassword("correct-horse-battery");
  assert.notEqual(stored, "correct-horse-battery");
  assert.equal(await verifyPassword("correct-horse-battery", stored), true);
  assert.equal(await verifyPassword("wrong-password-value", stored), false);
});
