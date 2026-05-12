import { budgetCheck } from './budget-check.js';
import { countTokensEmpiricalMatrix } from './count-tokens-empirical-matrix.js';
import { countTokensEmpirical } from './count-tokens-empirical.js';
import { estimateCostMatrix } from './estimate-cost-matrix.js';
import { estimateCost } from './estimate-cost.js';
import { estimateVisionCost } from './estimate-vision-cost.js';
import { getModelInfo } from './get-model-info.js';
import { getRatesVersion } from './get-rates-version.js';
import { listModels } from './list-models.js';
import { measureLatencyTool } from './measure-latency.js';
import type { AnyToolDef } from './types.js';

// Each concrete ToolDef is widened to `AnyToolDef` via `as unknown as` so the
// heterogeneous array type-checks under TypeScript's strict function-parameter
// variance. The server safeParses each tool's schema before invoking handler,
// so the runtime input shape is always validated even though the array has
// lost the specific input type at compile time.
export const TOOLS: ReadonlyArray<AnyToolDef> = [
  estimateCost,
  estimateCostMatrix,
  countTokensEmpirical,
  countTokensEmpiricalMatrix,
  getModelInfo,
  listModels,
  getRatesVersion,
  estimateVisionCost,
  budgetCheck,
  measureLatencyTool,
] as unknown as ReadonlyArray<AnyToolDef>;

export type { AnyToolDef, ToolDef, ToolResult } from './types.js';
