import { Link, Outlet } from 'react-router-dom';
import { Nav } from './Nav.js';

const REPO_URL = 'https://github.com/faraa2m/tokenometer';
const NPM_URL = 'https://www.npmjs.com/package/tokenometer';
const MARKETPLACE_URL = 'https://github.com/faraa2m/tokenometer#editor-integrations';

export const Layout = () => (
  <div className="tk-crt min-h-full">
    <div className="mx-auto max-w-[78rem] px-6 sm:px-10">
      <header className="grid grid-cols-12 gap-x-6 border-b border-[var(--tk-rule)] py-6 sm:py-8">
        <div className="col-span-12 sm:col-span-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            ›observatory
          </p>
          <Link to="/" className="mt-2 block text-xl font-bold tracking-tight text-[var(--tk-fg)]">
            tokenometer
          </Link>
          <p className="mt-1 text-[11px] text-[var(--tk-dim)]">empirical token-cost benchmarking</p>
        </div>
        <div className="col-span-12 sm:col-span-9 mt-6 flex items-end justify-end sm:mt-0">
          <Nav />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-12 grid grid-cols-12 gap-x-6 border-t border-[var(--tk-rule)] py-6 text-[11px] text-[var(--tk-dim)]">
        <div className="col-span-12 sm:col-span-7">
          <p>
            no telemetry · no key persistence · BYO-API-key for empirical mode. countTokens calls go
            straight from your browser to the provider.
          </p>
        </div>
        <div className="col-span-12 sm:col-span-5 mt-3 flex flex-wrap gap-x-4 gap-y-1 sm:mt-0 sm:justify-end">
          <a
            className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4 hover:text-[var(--tk-amber)]"
            href={REPO_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            github
          </a>
          <a
            className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4 hover:text-[var(--tk-amber)]"
            href={NPM_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            npm
          </a>
          <a
            className="text-[var(--tk-fg)] underline decoration-[var(--tk-amber-dim)] underline-offset-4 hover:text-[var(--tk-amber)]"
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
