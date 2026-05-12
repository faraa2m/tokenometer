import { describe, expect, it } from 'vitest';
import { detectAnnotations } from './annotation-detector.js';

const MARKER = '@tokenometer-prompt';

describe('detectAnnotations — JS/TS', () => {
  it('finds a single-line // annotation followed by a backtick literal', () => {
    const src = [
      '// @tokenometer-prompt model=claude-opus-4-7',
      'const SYSTEM = `You are a helpful assistant.`;',
    ].join('\n');
    const hits = detectAnnotations(src, 'src/a.ts', { marker: MARKER });
    expect(hits).toHaveLength(1);
    const hit = hits[0];
    if (!hit) throw new Error('expected hit');
    expect(hit.text).toBe('You are a helpful assistant.');
    expect(hit.model).toBe('claude-opus-4-7');
    expect(hit.source).toBe('annotation');
    expect(hit.file).toBe('src/a.ts');
  });

  it('finds a /* */ block annotation', () => {
    const src = ['/* @tokenometer-prompt model=gpt-4o */', 'const P = "hi";'].join('\n');
    const hits = detectAnnotations(src, 'src/b.ts', { marker: MARKER });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe('hi');
    expect(hits[0]?.model).toBe('gpt-4o');
  });

  it('collapses ${...} interpolation in template literals', () => {
    const src = [
      '// @tokenometer-prompt model=gpt-4o',
      'const P = `Hello ${name}, welcome to ${app}.`;',
    ].join('\n');
    const hits = detectAnnotations(src, 'src/c.ts', { marker: MARKER });
    expect(hits[0]?.text).toBe('Hello __INTERP__, welcome to __INTERP__.');
  });

  it('handles multi-line template literals', () => {
    const src = ['// @tokenometer-prompt', 'const P = `line one', 'line two', 'end`;'].join('\n');
    const hits = detectAnnotations(src, 'src/d.ts', { marker: MARKER });
    expect(hits[0]?.text).toContain('line one');
    expect(hits[0]?.text).toContain('end');
  });

  it('skips annotations with no nearby literal', () => {
    const src = [
      '// @tokenometer-prompt model=gpt-4o',
      '// just another comment',
      'doSomething();',
      'anotherThing();',
    ].join('\n');
    const hits = detectAnnotations(src, 'src/e.ts', { marker: MARKER });
    expect(hits).toHaveLength(0);
  });

  it('ignores marker appearing inside string literals', () => {
    const src = ['const x = "@tokenometer-prompt is documented";'].join('\n');
    const hits = detectAnnotations(src, 'src/f.ts', { marker: MARKER });
    expect(hits).toHaveLength(0);
  });
});

describe('detectAnnotations — Python', () => {
  it('finds a # annotation followed by a normal string', () => {
    const src = [
      '# @tokenometer-prompt model=gpt-4o',
      'SYSTEM = "You are a helpful assistant."',
    ].join('\n');
    const hits = detectAnnotations(src, 'svc/agent.py', { marker: MARKER });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe('You are a helpful assistant.');
    expect(hits[0]?.model).toBe('gpt-4o');
  });

  it('handles f-string interpolation', () => {
    const src = ['# @tokenometer-prompt', 'P = f"Hi {name}, today is {day}"'].join('\n');
    const hits = detectAnnotations(src, 'svc/b.py', { marker: MARKER });
    expect(hits[0]?.text).toBe('Hi __INTERP__, today is __INTERP__');
  });

  it('handles triple-quoted docstring literals', () => {
    const src = ['# @tokenometer-prompt', 'P = """line a', 'line b', '"""'].join('\n');
    const hits = detectAnnotations(src, 'svc/c.py', { marker: MARKER });
    expect(hits[0]?.text).toContain('line a');
    expect(hits[0]?.text).toContain('line b');
  });
});

describe('detectAnnotations — matchId stability', () => {
  it('keeps the same matchId when prompt text changes within the same function', () => {
    const before = [
      'function router() {',
      '  // @tokenometer-prompt',
      '  const P = "hello";',
      '}',
    ].join('\n');
    const after = [
      'function router() {',
      '  // @tokenometer-prompt',
      '  const P = "hi there";',
      '}',
    ].join('\n');
    const a = detectAnnotations(before, 'src/r.ts', { marker: MARKER });
    const b = detectAnnotations(after, 'src/r.ts', { marker: MARKER });
    expect(a[0]?.matchId).toBe(b[0]?.matchId);
  });
});
