export type ApiSuccessResponse<T> = {
  data: T;
};

export type ApiErrorResponse = {
  error: {
    message: string;
    code?: string;
    issues?: unknown;
  };
};
