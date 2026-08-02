import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, canJoinCall, canReadChannel, canReviewReport, reserveInventory, validateUpload } from "./platform";

const student = { id: "ava", name: "Ava", role: "student" as const };
const bob = { id: "bob", name: "Bob", role: "bob" as const };

describe("School Link safety rules", () => {
  it("keeps private channels private while permitting Bob's report review role", () => {
    const channel = { id: "dm", name: "DM", memberIds: ["ava"], moderated: true };
    expect(canReadChannel(student, channel)).toBe(true);
    expect(canReadChannel({ id: "eli", name: "Eli", role: "student" }, channel)).toBe(false);
    expect(canReviewReport(bob, { id: "r1", reporterId: "ava", targetId: "m1", reason: "Unsafe", status: "open" })).toBe(true);
  });

  it("rejects disallowed and oversized media", () => {
    expect(validateUpload({ name: "note.pdf", type: "application/pdf", size: 100 })).toMatchObject({ ok: false });
    expect(validateUpload({ name: "huge.png", type: "image/png", size: MAX_UPLOAD_BYTES + 1 })).toMatchObject({ ok: false });
    expect(validateUpload({ name: "photo.webp", type: "image/webp", size: 100 })).toEqual({ ok: true });
  });

  it("holds inventory atomically and requires caller consent for calls", () => {
    expect(reserveInventory({ id: "p1", name: "Notebook", priceCents: 250, inventory: 2, approved: true }, 1).inventory).toBe(1);
    expect(() => reserveInventory({ id: "p1", name: "Notebook", priceCents: 250, inventory: 0, approved: true }, 1)).toThrow("Insufficient inventory");
    expect(canJoinCall(student, { id: "c1", memberIds: ["ava"], consentedIds: [], active: true })).toBe(false);
  });
});
