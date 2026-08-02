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
}

export const schoolLinkApi = new SchoolLinkApi();
