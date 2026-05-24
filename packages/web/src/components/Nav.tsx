import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { to: '/', label: 'calculator' },
  { to: '/diff', label: 'diff' },
  { to: '/by-file', label: 'by-file' },
  { to: '/vision', label: 'vision' },
  { to: '/models', label: 'models' },
];

const TOOLS_NAV: readonly NavItem[] = [
  { to: '/sarif', label: 'sarif' },
  { to: '/config-builder', label: 'config builder' },
  { to: '/init', label: 'init' },
  { to: '/editor', label: 'vs code' },
  { to: '/claude-code', label: 'agents' },
];

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  isActive
    ? 'rounded-full border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-3 py-1 text-[var(--tk-bg)] shadow-sm'
    : 'rounded-full border border-transparent px-3 py-1 text-[var(--tk-fg)] hover:border-[var(--tk-amber-dim)] hover:text-[var(--tk-amber)]';

export const Nav = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [toolsOpen]);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em]">
      {PRIMARY_NAV.map(({ to, label }) => (
        <NavLink key={to} to={to} className={linkClass} end={to === '/'}>
          {label}
        </NavLink>
      ))}
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setToolsOpen((v) => !v)}
          className={
            toolsOpen
              ? 'rounded-full border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-3 py-1 text-[var(--tk-bg)] uppercase tracking-[0.16em]'
              : 'rounded-full border border-transparent px-3 py-1 text-[var(--tk-fg)] hover:border-[var(--tk-amber-dim)] hover:text-[var(--tk-amber)] uppercase tracking-[0.16em]'
          }
          aria-expanded={toolsOpen}
          aria-haspopup="true"
        >
          tools <span className="text-[var(--tk-dim)]">{toolsOpen ? '▴' : '▾'}</span>
        </button>
        {toolsOpen && (
          <div className="tk-panel absolute right-0 z-10 mt-2 min-w-[13rem] rounded p-2">
            <ul className="flex flex-col gap-1">
              {TOOLS_NAV.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setToolsOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? 'block px-2 py-1 text-[var(--tk-amber)]'
                        : 'block px-2 py-1 text-[var(--tk-fg)] hover:bg-[var(--tk-bg)] hover:text-[var(--tk-amber)]'
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};
