import { describe, expect, it } from 'vitest';
import { computeMatchId, findEnclosingFunction } from './extracted-prompt.js';

describe('computeMatchId', () => {
  it('is deterministic for identical inputs', () => {
    const a = computeMatchId('src/a.ts', 'openai', 'router');
    const b = computeMatchId('src/a.ts', 'openai', 'router');
    expect(a).toBe(b);
    expect(a).toHaveLength(40);
  });

  it('differs when file, sdk, or enclosing hint changes', () => {
    const base = computeMatchId('src/a.ts', 'openai', 'router');
    expect(base).not.toBe(computeMatchId('src/b.ts', 'openai', 'router'));
    expect(base).not.toBe(computeMatchId('src/a.ts', 'anthropic', 'router'));
    expect(base).not.toBe(computeMatchId('src/a.ts', 'openai', 'handler'));
  });
});

describe('findEnclosingFunction', () => {
  it('finds plain function declarations', () => {
    const src = ['function callRouter() {', '  const x = 1;', '  return x;', '}'];
    expect(findEnclosingFunction(src, 3)).toBe('callRouter');
  });

  it('finds exported async functions', () => {
    const src = ['export async function doThing() {', '  return 1;', '}'];
    expect(findEnclosingFunction(src, 2)).toBe('doThing');
  });

  it('finds arrow function const assignments', () => {
    const src = ['const handler = async (req) => {', '  return null;', '};'];
    expect(findEnclosingFunction(src, 2)).toBe('handler');
  });

  it('finds Python def', () => {
    const src = ['def my_handler(request):', '    return 1', ''];
    expect(findEnclosingFunction(src, 2)).toBe('my_handler');
  });

  it('finds Python async def', () => {
    const src = ['async def run():', '    return 1'];
    expect(findEnclosingFunction(src, 2)).toBe('run');
  });

  it('falls back to top-level', () => {
    const src = ['const SYSTEM = "hello";', 'console.log(SYSTEM);'];
    expect(findEnclosingFunction(src, 2)).toBe('top-level');
  });
});
