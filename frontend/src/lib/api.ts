const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://orion-sistema-completo-production.up.railway.app/api/v1";

class ApiClient {
  // Get API URL with HTTPS enforcement at runtime
  private getApiUrl(): string {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return BASE_URL.replace("http://", "https://");
    }
    return BASE_URL;
  }

  private getAuthHeader(): HeadersInit {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
        throw new Error("Sessao expirada");
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Erro na requisicao");
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    const refresh =
      typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;
    if (!refresh) return false;

    try {
      const response = await fetch(`${this.getApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!response.ok) return false;

      const tokens = await response.json();
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}${endpoint}`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.getApiUrl()}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...this.getAuthHeader(),
      },
    });
    return this.handleResponse<T>(response);
  }

  async login(
    email: string,
    password: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${this.getApiUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Credenciais invalidas");
    }

    return response.json();
  }
}

export const api = new ApiClient();
