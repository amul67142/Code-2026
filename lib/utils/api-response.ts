import { NextResponse } from "next/server";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";

/**
 * Standard success response.
 * Always returns { success: true, data: ... }
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Standard error response.
 * Always returns { success: false, error: "...", details?: ... }
 */
export function errorResponse(
  error: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = { success: false, error };
  if (details !== undefined) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}

/** 422 — Zod or input validation failures */
export function validationError(details: unknown): NextResponse<ApiErrorResponse> {
  return errorResponse("Validation failed", 422, details);
}

/** 404 — Resource not found */
export function notFoundError(resource = "Resource"): NextResponse<ApiErrorResponse> {
  return errorResponse(`${resource} not found`, 404);
}

/** 401 — Unauthenticated */
export function unauthorizedError(): NextResponse<ApiErrorResponse> {
  return errorResponse("Authentication required", 401);
}

/** 403 — Insufficient permissions */
export function forbiddenError(): NextResponse<ApiErrorResponse> {
  return errorResponse("Insufficient permissions", 403);
}

/** 500 — Generic server error (never expose stack traces) */
export function serverError(): NextResponse<ApiErrorResponse> {
  return errorResponse("Internal server error", 500);
}
