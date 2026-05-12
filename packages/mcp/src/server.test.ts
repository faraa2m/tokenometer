import { describe, expect, it } from 'vitest';
import { TOOLS } from './tools/index.js';

const findTool = (name: string) => {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`tool not registered: ${name}`);
  return t;
};

const parsePayload = (result: { content: Array<{ type: 'text'; text: string }> }): unknown => {
  const first = result.content[0];
  if (!first) throw new Error('empty content');
  return JSON.parse(first.text);
};

describe('TOOLS registry', () => {
  it('exposes the expected 10 tools', () => {
    const names = TOOLS.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'budget_check',
        'count_tokens_empirical',
        'count_tokens_empirical_matrix',
        'estimate_cost',
        'estimate_cost_matrix',
        'estimate_vision_cost',
        'get_model_info',
        'get_rates_version',
        'list_models',
        'measure_latency',
      ].sort(),
    );
  });

  it('each tool has a non-empty description', () => {
    for (const t of TOOLS) {
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(10);
    }
  });
});

describe('estimate_cost', () => {
  const tool = findTool('estimate_cost');

  it('returns tokens and inputCost for a known offline model', async () => {
    const result = await tool.handler({ text: 'hello world', model: 'gpt-4o', format: 'text' });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as {
      tokens: number;
      inputCost: number;
      totalCost: number;
      model: string;
    };
    expect(payload.tokens).toBeGreaterThan(0);
    expect(payload.inputCost).toBeGreaterThan(0);
    expect(payload.totalCost).toBeCloseTo(payload.inputCost, 10);
    expect(payload.model).toBe('gpt-4o');
  });

  it('adds outputCost when outputTokens is provided', async () => {
    const result = await tool.handler({
      text: 'hi',
      model: 'gpt-4o',
      outputTokens: 100,
    });
    const payload = parsePayload(result) as {
      outputCost?: number;
      totalCost: number;
      inputCost: number;
    };
    expect(payload.outputCost).toBeGreaterThan(0);
    expect(payload.totalCost).toBeGreaterThan(payload.inputCost);
  });

  it('returns isError for an unknown model', async () => {
    const result = await tool.handler({ text: 'hi', model: 'fake-model-xyz' });
    expect(result.isError).toBe(true);
    const payload = parsePayload(result) as { code: string };
    expect(payload.code).toBe('user_error');
  });
});

describe('estimate_cost_matrix', () => {
  const tool = findTool('estimate_cost_matrix');

  it('returns one cell per (model, format) pair plus cheapest/mostExpensive', async () => {
    const result = await tool.handler({
      text: 'hello world',
      models: ['gpt-4o', 'gpt-4o-mini'],
      formats: ['text', 'json'],
    });
    const payload = parsePayload(result) as {
      results: Array<{ model: string; format: string }>;
      cheapest: { model: string };
      mostExpensive: { model: string };
    };
    expect(payload.results.length).toBe(4);
    expect(payload.cheapest).toBeDefined();
    expect(payload.mostExpensive).toBeDefined();
  });

  it('defaults to format=text when formats is omitted', async () => {
    const result = await tool.handler({ text: 'hi', models: ['gpt-4o'] });
    const payload = parsePayload(result) as { results: Array<{ format: string }> };
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]?.format).toBe('text');
  });
});

describe('count_tokens_empirical', () => {
  const tool = findTool('count_tokens_empirical');

  it('runs locally for openai (no API key needed)', async () => {
    const result = await tool.handler({ text: 'hello world', model: 'gpt-4o' });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as { inputTokens: number };
    expect(payload.inputTokens).toBeGreaterThan(0);
  });

  it.skipIf(!process.env.ANTHROPIC_API_KEY)('hits the live Anthropic count endpoint', async () => {
    const result = await tool.handler({ text: 'hello', model: 'claude-opus-4-7' });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as { inputTokens: number };
    expect(payload.inputTokens).toBeGreaterThan(0);
  });

  it('returns key_missing when the required env var is absent', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    Reflect.deleteProperty(process.env, 'ANTHROPIC_API_KEY');
    try {
      const result = await tool.handler({ text: 'hi', model: 'claude-opus-4-7' });
      expect(result.isError).toBe(true);
      const payload = parsePayload(result) as { code: string; required: string };
      expect(payload.code).toBe('key_missing');
      expect(payload.required).toBe('ANTHROPIC_API_KEY');
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe('count_tokens_empirical_matrix', () => {
  const tool = findTool('count_tokens_empirical_matrix');

  it('returns per-cell results with inline errors rather than failing wholesale', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    Reflect.deleteProperty(process.env, 'ANTHROPIC_API_KEY');
    try {
      const result = await tool.handler({
        text: 'hi',
        models: ['gpt-4o', 'claude-opus-4-7'],
      });
      expect(result.isError).toBeFalsy();
      const payload = parsePayload(result) as {
        results: Array<{ isError?: boolean; model: string; inputTokens?: number; code?: string }>;
      };
      expect(payload.results).toHaveLength(2);
      const openai = payload.results.find((r) => r.model === 'gpt-4o');
      const anth = payload.results.find((r) => r.model === 'claude-opus-4-7');
      expect(openai?.isError).toBeFalsy();
      expect((openai as { inputTokens: number }).inputTokens).toBeGreaterThan(0);
      expect(anth?.isError).toBe(true);
      expect(anth?.code).toBe('key_missing');
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe('get_model_info', () => {
  const tool = findTool('get_model_info');

  it('returns metadata for a known model', async () => {
    const result = await tool.handler({ model: 'gpt-4o' });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as {
      id: string;
      provider: string;
      ratePer1k: { input: number; output: number };
      ratesVersion: string;
    };
    expect(payload.id).toBe('gpt-4o');
    expect(payload.provider).toBe('openai');
    expect(payload.ratePer1k.input).toBeGreaterThan(0);
    expect(payload.ratePer1k.output).toBeGreaterThan(0);
    expect(payload.ratesVersion).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('errors on unknown model', async () => {
    const result = await tool.handler({ model: 'nope-not-real' });
    expect(result.isError).toBe(true);
  });
});

describe('list_models', () => {
  const tool = findTool('list_models');

  it('returns every model when no filter is set', async () => {
    const result = await tool.handler({});
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as { models: Array<{ provider: string }> };
    expect(payload.models.length).toBeGreaterThan(0);
  });

  it('filters by provider', async () => {
    const result = await tool.handler({ provider: 'openai' });
    const payload = parsePayload(result) as { models: Array<{ provider: string }> };
    expect(payload.models.length).toBeGreaterThan(0);
    for (const m of payload.models) {
      expect(m.provider).toBe('openai');
    }
  });
});

describe('get_rates_version', () => {
  const tool = findTool('get_rates_version');

  it('returns the rates version', async () => {
    const result = await tool.handler({});
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as { ratesVersion: string };
    expect(payload.ratesVersion).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('estimate_vision_cost', () => {
  const tool = findTool('estimate_vision_cost');

  it('computes tokens for an Anthropic image', async () => {
    const result = await tool.handler({
      provider: 'anthropic',
      images: [{ width: 800, height: 600 }],
    });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as {
      totalTokens: number;
      images: Array<{ tokens: number }>;
    };
    expect(payload.totalTokens).toBeGreaterThan(0);
    expect(payload.images[0]?.tokens).toBe(640); // ceil(480000/750)
  });

  it('includes per-image USD when model is provided', async () => {
    const result = await tool.handler({
      provider: 'openai',
      images: [{ width: 800, height: 600 }],
      model: 'gpt-4o',
    });
    const payload = parsePayload(result) as {
      images: Array<{ costUsd?: number }>;
      totalCostUsd?: number;
    };
    expect(payload.images[0]?.costUsd).toBeGreaterThan(0);
    expect(payload.totalCostUsd).toBeGreaterThan(0);
  });

  it('returns unsupported_provider for mistral', async () => {
    const result = await tool.handler({
      provider: 'mistral',
      images: [{ width: 100, height: 100 }],
    });
    expect(result.isError).toBe(true);
    const payload = parsePayload(result) as { code: string };
    expect(payload.code).toBe('unsupported_provider');
  });
});

describe('budget_check', () => {
  const tool = findTool('budget_check');

  it('passes when prompt fits both budgets', async () => {
    const result = await tool.handler({
      text: 'hello',
      model: 'gpt-4o',
      maxCostUsd: 1,
      maxTokens: 10_000,
    });
    expect(result.isError).toBeFalsy();
    const payload = parsePayload(result) as { pass: boolean; headroom: number };
    expect(payload.pass).toBe(true);
    expect(payload.headroom).toBeGreaterThan(0);
  });

  it('fails with a reason when token budget is too small', async () => {
    const result = await tool.handler({
      text: 'hello world this is a longer prompt to exceed the small budget',
      model: 'gpt-4o',
      maxTokens: 1,
    });
    const payload = parsePayload(result) as { pass: boolean; reason?: string };
    expect(payload.pass).toBe(false);
    expect(payload.reason).toMatch(/exceeds/);
  });

  it('rejects calls with neither budget set', () => {
    // Schema enforces this at parse time, not in the handler. Verify via safeParse.
    const parsed = tool.schema.safeParse({ text: 'hi', model: 'gpt-4o' });
    expect(parsed.success).toBe(false);
  });
});

describe('measure_latency', () => {
  const tool = findTool('measure_latency');

  it('returns key_missing without a provider API key', async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    Reflect.deleteProperty(process.env, 'ANTHROPIC_API_KEY');
    try {
      const result = await tool.handler({
        model: 'claude-opus-4-7',
        prompt: 'hi',
        trials: 1,
      });
      expect(result.isError).toBe(true);
      const payload = parsePayload(result) as { code: string };
      expect(payload.code).toBe('key_missing');
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});

describe('schema validation', () => {
  it('estimate_cost rejects empty text', () => {
    const tool = findTool('estimate_cost');
    const parsed = tool.schema.safeParse({ text: '', model: 'gpt-4o' });
    expect(parsed.success).toBe(false);
  });

  it('estimate_cost_matrix rejects empty models array', () => {
    const tool = findTool('estimate_cost_matrix');
    const parsed = tool.schema.safeParse({ text: 'hi', models: [] });
    expect(parsed.success).toBe(false);
  });

  it('measure_latency clamps trials to 10', () => {
    const tool = findTool('measure_latency');
    const parsed = tool.schema.safeParse({
      model: 'gpt-4o',
      prompt: 'hi',
      trials: 20,
    });
    expect(parsed.success).toBe(false);
  });
});
