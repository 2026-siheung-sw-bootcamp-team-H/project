import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { useAuthStore } from "@/stores/authStore";

type ApiClientOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  acceptErrorData?: boolean;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: unknown,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiClient<T>(
  path: string,
  { body, headers, acceptErrorData = false, ...options }: ApiClientOptions = {}
): Promise<T> {
  const token = useAuthStore.getState().token;
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiClientError(
      response.status === 502 || response.status === 503
        ? "보안 API 서버에 연결할 수 없습니다."
        : `요청을 처리하지 못했습니다. (HTTP ${response.status})`,
      response.status
    );
  }

  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if ((!response.ok && !(acceptErrorData && "data" in payload)) || "error" in payload) {
    const error = "error" in payload ? payload.error : { message: "Request failed." };
    if (
      response.status === 401 &&
      path !== "/api/auth/login" &&
      useAuthStore.getState().token === token
    ) {
      useAuthStore.getState().clearSession();
    }
    throw new ApiClientError(error.message, response.status, error.issues, error.code);
  }

  return payload.data;
}
