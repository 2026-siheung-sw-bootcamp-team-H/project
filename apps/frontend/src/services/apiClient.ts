import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

type ApiClientOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiClient<T>(
  path: string,
  { body, headers, ...options }: ApiClientOptions = {}
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = (await response.json()) as ApiSuccessResponse<T> | ApiErrorResponse;

  if (!response.ok || "error" in payload) {
    const error = "error" in payload ? payload.error : { message: "Request failed." };
    throw new ApiClientError(error.message, response.status, error.issues);
  }

  return payload.data;
}
