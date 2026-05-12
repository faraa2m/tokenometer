import type { z } from 'zod';

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * One tool entry. `S` is the zod input schema type (inferred from each tool's
 * file). The handler receives the parsed input narrowed by `z.infer<S>`.
 *
 * Note on variance: arrays of `ToolDef` with heterogeneous schemas need to be
 * typed as `ReadonlyArray<AnyToolDef>` to satisfy TypeScript's strict variance
 * check on the handler's parameter type. `AnyToolDef` erases the schema's
 * input shape to `unknown`; the server narrows on the parsed value before
 * dispatch, so the runtime contract is preserved.
 */
export interface ToolDef<S extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: S;
  handler: (input: z.infer<S>) => Promise<ToolResult>;
}

/**
 * Erased-shape tool def for storing heterogeneous handlers in a single array.
 * The handler accepts `unknown` because at the array level we've lost the
 * specific input type. Callers must safeParse the schema before invoking
 * `handler` (which the server already does).
 */
export interface AnyToolDef {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  handler: (input: unknown) => Promise<ToolResult>;
}
