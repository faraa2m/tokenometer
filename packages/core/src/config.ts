import { parseConfig } from './parse-config.js';
export { parseConfig } from './parse-config.js';
export type { ConfigFormat, TokenometerConfig } from './parse-config.js';

const CONFIG_FILENAMES = ['.tokenometer.yml', '.tokenometer.yaml'] as const;

// loadConfig is intentionally isolated from parseConfig so browser bundles can
// import the parser without traversing Node filesystem modules.
export const loadConfig = async (cwd?: string) => {
  const { existsSync } = await import('node:fs');
  const { readFile } = await import('node:fs/promises');
  const { dirname, join, parse: parsePath } = await import('node:path');

  const findConfigFile = (startDir: string): string | null => {
    let dir = startDir;
    while (true) {
      for (const name of CONFIG_FILENAMES) {
        const candidate = join(dir, name);
        if (existsSync(candidate)) return candidate;
      }
      const isGitRoot = existsSync(join(dir, '.git'));
      const parent = dirname(dir);
      if (isGitRoot) return null;
      if (parent === dir || parent === parsePath(dir).root) {
        if (parent !== dir) {
          for (const name of CONFIG_FILENAMES) {
            const candidate = join(parent, name);
            if (existsSync(candidate)) return candidate;
          }
        }
        return null;
      }
      dir = parent;
    }
  };

  const start = cwd ?? process.cwd();
  const file = findConfigFile(start);
  if (!file) return null;
  const text = await readFile(file, 'utf8');
  return parseConfig(text);
};
