/**
 * Thrown for known user-facing failures (missing API key, unknown model,
 * unknown format, etc). The CLI's top-level handler prints the message
 * without a stack trace and exits non-zero. Internal/unexpected errors
 * keep using plain `Error` so they still surface a stack for debugging.
 */
export class UserFacingError extends Error {
  override readonly name = 'UserFacingError';
}
