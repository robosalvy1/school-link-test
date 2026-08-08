export type SessionUser = {
  id: string;
  name: string;
  role: string;
};

export type Session = {
  authenticated: true;
  user: SessionUser;
};

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1";
  return configured.replace(/\/$/, "");
}

function asSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { authenticated?: unknown; user?: unknown };
  if (candidate.authenticated !== true || !candidate.user || typeof candidate.user !== "object") return null;

  const user = candidate.user as Partial<SessionUser>;
  if (typeof user.id !== "string" || typeof user.name !== "string" || typeof user.role !== "string") return null;
  return { authenticated: true, user: { id: user.id, name: user.name, role: user.role } };
}

export class SchoolLinkApi {
  private readonly base = baseUrl();

  private async request(path: string, signal?: AbortSignal) {
    let response: Response;
    try {
      response = await fetch(`${this.base}${path}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError("School Link could not reach the school server.");
    }

    if (!response.ok) throw new ApiError("The school server could not complete this request.", response.status);
    return response;
  }

  async getHealth(signal?: AbortSignal) {
    await this.request("/health", signal);
  }

  async getSession(signal?: AbortSignal): Promise<Session | null> {
    let response: Response;
    try {
      response = await fetch(`${this.base}/session`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError("School Link could not reach the school server.");
    }

    if (response.status === 401) return null;
    if (!response.ok) throw new ApiError("The school server could not complete this request.", response.status);

    try {
      return asSession(await response.json());
    } catch {
      throw new ApiError("The school server returned an invalid session response.");
    }
  }

  private async authenticate(path: "/auth/signin" | "/auth/signup", payload: { email: string; password: string; name?: string }): Promise<Session> {
    let response: Response;
    try {
      response = await fetch(`${this.base}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new ApiError("School Link could not reach the account server.");
    }
    if (response.status === 409) throw new ApiError("That email is already registered.", response.status);
    if (response.status === 401) throw new ApiError("Email or password is incorrect.", response.status);
    if (response.status === 429) throw new ApiError("Please wait before trying again.", response.status);
    if (!response.ok) throw new ApiError("Check your details and try again.", response.status);
    const session = asSession(await response.json());
    if (!session) throw new ApiError("The account server returned an invalid response.");
    return session;
  }

  signIn(email: string, password: string) {
    return this.authenticate("/auth/signin", { email, password });
  }

  signUp(name: string, email: string, password: string) {
    return this.authenticate("/auth/signup", { name, email, password });
  }

  async signOut() {
    let response: Response;
    try {
      response = await fetch(`${this.base}/auth/signout`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
    } catch {
      throw new ApiError("School Link could not reach the account server.");
    }

    if (!response.ok && response.status !== 401) throw new ApiError("School Link could not sign you out. Please try again.", response.status);
  }
}

export const schoolLinkApi = new SchoolLinkApi();
