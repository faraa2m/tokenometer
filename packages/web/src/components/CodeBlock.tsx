import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeBlock = ({ code, language, filename }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border border-[var(--tk-rule)] bg-[var(--tk-cell)]">
      <div className="flex items-center justify-between border-b border-[var(--tk-rule)] px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
        <span>{filename ?? language ?? 'snippet'}</span>
        <button
          type="button"
          onClick={onCopy}
          className="border border-[var(--tk-rule)] px-2 py-[2px] text-[10px] uppercase tracking-[0.2em] text-[var(--tk-fg)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]"
        >
          {copied ? '> copied' : '> copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-[1.65] text-[var(--tk-fg)] whitespace-pre">
        {code}
      </pre>
    </div>
  );
};
