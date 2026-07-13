import type { ApiSuccessResponse } from "../types/api.js";

export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return { data };
}
