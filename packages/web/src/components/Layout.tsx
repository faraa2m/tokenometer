import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Nav } from './Nav.js';

const REPO_URL = 'https://github.com/faraa2m/tokenometer';
const NPM_URL = 'https://www.npmjs.com/package/tokenometer';
const MARKETPLACE_URL =
  'https://marketplace.visualstudio.com/items?itemName=faraa2m.tokenometer-vscode';
const THEME_STORAGE_KEY = 'tokenometer.theme';

type Theme = 'light' | 'dark';

const systemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const storedTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
};

const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (storedTheme()) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setTheme(media.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return {
    theme,
    toggleTheme: () =>
      setTheme((current) => {
        const next = current === 'light' ? 'dark' : 'light';
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
        return next;
      }),
  };
};

export const Layout = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="tk-crt min-h-full">
      <div className="mx-auto max-w-[82rem] px-5 sm:px-8 lg:px-10">
        <header className="grid grid-cols-12 gap-x-6 border-b border-[var(--tk-rule)] py-5 sm:py-7">
          <div className="col-span-12 sm:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-blue)]">
              ›observatory
            </p>
            <Link
              to="/"
              className="tk-display mt-1 block text-2xl font-semibold tracking-normal text-[var(--tk-fg)]"
            >
              tokenometer
            </Link>
            <p className="mt-1 text-[11px] text-[var(--tk-dim)]">
              empirical token-cost benchmarking
            </p>
          </div>
          <div className="col-span-12 sm:col-span-9 mt-6 flex flex-wrap items-end justify-start gap-3 sm:mt-0 sm:justify-end">
            <Nav />
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border border-[var(--tk-rule)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--tk-fg)] hover:border-[var(--tk-amber-dim)] hover:text-[var(--tk-amber)]"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? 'dark' : 'light'}
            </button>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        <footer className="mt-12 grid grid-cols-12 gap-x-6 border-t border-[var(--tk-rule)] py-6 text-[11px] text-[var(--tk-dim)]">
          <div className="col-span-12 sm:col-span-7">
            <p>
              no telemetry · no key persistence · BYO-API-key for empirical mode. countTokens calls
              go straight from your browser to the provider.
            </p>
          </div>
          <div className="col-span-12 sm:col-span-5 mt-3 flex flex-wrap gap-x-4 gap-y-1 sm:mt-0 sm:justify-end">
            <a
              className="tk-link text-[var(--tk-fg)]"
              href={REPO_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              github
            </a>
            <a
              className="tk-link text-[var(--tk-fg)]"
              href={NPM_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              npm
            </a>
            <a
              className="tk-link text-[var(--tk-fg)]"
              href={MARKETPLACE_URL}
              rel="noopener noreferrer"
              target="_blank"
            >
              marketplace
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
