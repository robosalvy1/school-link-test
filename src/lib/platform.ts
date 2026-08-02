export type Role = "student" | "staff" | "bob" | "admin";
export type User = { id: string; name: string; role: Role };
export type Channel = { id: string; name: string; memberIds: string[]; moderated: boolean };
export type MediaUpload = { name: string; type: string; size: number };
export type Product = { id: string; name: string; priceCents: number; inventory: number; approved: boolean };
export type Report = { id: string; reporterId: string; targetId: string; reason: string; status: "open" | "resolved" };
export type CallRoom = { id: string; memberIds: string[]; consentedIds: string[]; active: boolean };

const permittedMedia = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function canReadChannel(user: User, channel: Channel) {
  return user.role === "admin" || user.role === "bob" || channel.memberIds.includes(user.id);
}

export function validateUpload(upload: MediaUpload) {
  if (!permittedMedia.has(upload.type)) return { ok: false as const, reason: "Only JPEG, PNG, and WebP images are permitted." };
  if (upload.size <= 0 || upload.size > MAX_UPLOAD_BYTES) return { ok: false as const, reason: "Images must be between 1 byte and 5 MB." };
  return { ok: true as const };
}

export function canModerate(user: User) {
  return user.role === "bob" || user.role === "admin";
}

export function canReviewReport(user: User, report: Report) {
  return canModerate(user) && report.status === "open";
}

export function reserveInventory(product: Product, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantity must be a positive whole number.");
  if (!product.approved) throw new Error("This item is not approved for sale.");
  if (product.inventory < quantity) throw new Error("Insufficient inventory.");
  return { ...product, inventory: product.inventory - quantity };
}

export function canJoinCall(user: User, room: CallRoom) {
  return room.active && room.memberIds.includes(user.id) && room.consentedIds.includes(user.id);
}

export function createDirectChannel(a: User, b: User): Channel {
  if (a.id === b.id) throw new Error("A direct message needs two different users.");
  return { id: `dm:${[a.id, b.id].sort().join(":")}`, name: "Direct message", memberIds: [a.id, b.id], moderated: true };
}
