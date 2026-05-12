import { UserFacingError } from '@tokenometer/core';

/**
 * Standard error result shape returned from tool handlers when a call fails.
 * Mirrors the MCP `tools/call` error convention: `isError: true` plus a single
 * text content block containing a JSON-encoded payload the calling agent can
 * parse for structured handling.
 */
export interface ToolErrorResult {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
}

export interface ToolErrorPayload {
  code: string;
  message: string;
  [key: string]: unknown;
}

const wrap = (payload: ToolErrorPayload): ToolErrorResult => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify(payload) }],
});

/**
 * Map an unknown error (most often a `UserFacingError` from core) onto the
 * standard tool error result. Unknown error types are reported under the
 * `internal` code with their `.message` (no stack — agents don't need it).
 */
export const toMcpError = (err: unknown): ToolErrorResult => {
  if (err instanceof UserFacingError) {
    return wrap({ code: 'user_error', message: err.message });
  }
  const message = err instanceof Error ? err.message : String(err);
  return wrap({ code: 'internal', message });
};

/**
 * Convenience constructor for the well-known `key_missing` error returned by
 * empirical and latency tools when the required provider env var is unset.
 */
export const keyMissingError = (
  required: string,
  docs = 'https://github.com/faraa2m/tokenometer#empirical-mode',
): ToolErrorResult =>
  wrap({
    code: 'key_missing',
    message: `Missing required environment variable: ${required}`,
    required,
    docs,
  });

export const errorResult = (payload: ToolErrorPayload): ToolErrorResult => wrap(payload);
