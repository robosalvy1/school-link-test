import type { IncomingMessage } from "node:http";

export type AuthResult = { authenticated: false; reason: "not-configured" | "missing-session" };

// This deliberately denies every protected request until an identity provider validates signed sessions.
export const authenticate = (request: IncomingMessage, cookieName: string): AuthResult => {
  const cookie = request.headers.cookie ?? "";
  return { authenticated: false, reason: cookie.includes(`${cookieName}=`) ? "not-configured" : "missing-session" };
};
