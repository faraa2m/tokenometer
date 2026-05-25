import {
  anthropicVisionTokens,
  getRate,
  googleVisionTokens,
  openaiVisionTokens,
} from '@tokenometer/core/browser';
import { useEffect, useState } from 'react';
import { usePageTitle } from '../hooks/usePageTitle.js';

interface ImageItem {
  file: File;
  url: string;
  width: number;
  height: number;
}

interface ProviderRow {
  provider: 'anthropic' | 'openai' | 'google';
  modelId: string;
  tokens: number;
  cost: number;
  note: string;
}

const formatCost = (usd: number): string => {
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  if (usd >= 0.000001) return `$${usd.toFixed(6)}`;
  return `$${usd.toExponential(2)}`;
};

const safeRate = (modelId: string): { input: number } | null => {
  try {
    return { input: getRate(modelId).inputPer1k };
  } catch {
    return null;
  }
};

const buildRows = (img: ImageItem, openaiDetail: 'low' | 'high'): ProviderRow[] => {
  const out: ProviderRow[] = [];
  const anthropic = anthropicVisionTokens({ height: img.height, width: img.width });
  const aRate = safeRate('claude-sonnet-4-6')?.input ?? 0;
  out.push({
    cost: (anthropic / 1000) * aRate,
    modelId: 'claude-sonnet-4-6',
    note: 'ceil(w*h/750), capped at 1600',
    provider: 'anthropic',
    tokens: anthropic,
  });
  const openai = openaiVisionTokens({ detail: openaiDetail, height: img.height, width: img.width });
  const oRate = safeRate('gpt-4o')?.input ?? 0;
  out.push({
    cost: (openai / 1000) * oRate,
    modelId: 'gpt-4o',
    note: openaiDetail === 'high' ? '85 + 170/tile · 512x512 tiles' : 'low detail · flat 85',
    provider: 'openai',
    tokens: openai,
  });
  const google = googleVisionTokens({ height: img.height, width: img.width });
  const gRate = safeRate('gemini-2.5-flash')?.input ?? 0;
  out.push({
    cost: (google / 1000) * gRate,
    modelId: 'gemini-2.5-flash',
    note: '258 base · 768x768 tiles',
    provider: 'google',
    tokens: google,
  });
  return out;
};

export const VisionPage = () => {
  usePageTitle('vision', 'image input cost across providers');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [openaiDetail, setOpenaiDetail] = useState<'low' | 'high'>('high');
  const [error, setError] = useState<string | null>(null);

  // Free object URLs when images are removed or component unmounts.
  useEffect(
    () => () => {
      for (const i of images) URL.revokeObjectURL(i.url);
    },
    [images],
  );

  const onPick = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const next: Promise<ImageItem | null>[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      if (!f.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(f);
      next.push(
        new Promise<ImageItem | null>((resolve) => {
          const img = new Image();
          img.onload = () =>
            resolve({ file: f, height: img.naturalHeight, url, width: img.naturalWidth });
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        }),
      );
    }
    Promise.all(next).then((items) => {
      const filtered = items.filter((x): x is ImageItem => x !== null);
      if (!filtered.length) {
        setError('no readable images in selection');
        return;
      }
      setImages(filtered);
    });
  };

  return (
    <section className="space-y-8 py-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
          ›vision · image input token cost
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">vision</h1>
        <p className="mt-2 max-w-3xl text-[12.5px] text-[var(--tk-dim)]">
          Each provider counts image tokens differently. Claude estimates from total pixels. OpenAI
          tiles 512×512 squares after a resize. Gemini tiles 768×768 with a 384px small- image flat
          rate. Drop an image — we read its dimensions in-browser and run all three estimators.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            01 ›images
          </p>
          <label className="block cursor-pointer border border-dashed border-[var(--tk-rule)] bg-[var(--tk-cell)] p-8 text-center hover:border-[var(--tk-amber-dim)]">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => onPick(e.target.files)}
              className="hidden"
            />
            <p className="text-[12.5px] text-[var(--tk-fg)]">
              {'> click to select images (png / jpg / webp)'}
            </p>
            <p className="mt-1 text-[10.5px] text-[var(--tk-dim)]">
              read in-browser. nothing is uploaded.
            </p>
          </label>
          {error && <p className="mt-2 text-[11.5px] text-[var(--tk-red)]">err: {error}</p>}
        </div>
        <div className="col-span-12 lg:col-span-5">
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[var(--tk-dim)]">
            02 ›openai detail
          </p>
          <div className="flex gap-2">
            {(['high', 'low'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOpenaiDetail(opt)}
                className={
                  openaiDetail === opt
                    ? 'border border-[var(--tk-amber)] bg-[var(--tk-amber)] px-3 py-1 text-[11px] text-[var(--tk-bg)]'
                    : 'border border-[var(--tk-rule)] px-3 py-1 text-[11px] text-[var(--tk-dim)] hover:border-[var(--tk-amber)] hover:text-[var(--tk-amber)]'
                }
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-[var(--tk-dim)]">
            Anthropic and Google ignore detail; OpenAI charges flat 85 tokens for `low`.
          </p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="space-y-6">
          {images.map((img, idx) => {
            const rows = buildRows(img, openaiDetail);
            return (
              <div
                key={`${img.file.name}-${idx}`}
                className="border border-[var(--tk-rule)] bg-[var(--tk-cell)]"
              >
                <div className="grid grid-cols-12 gap-x-4 border-b border-[var(--tk-rule)] p-4">
                  <div className="col-span-12 sm:col-span-3">
                    {/* Tag <img> with alt for a11y; src is a blob URL so the image
                        never leaves the browser. */}
                    <img
                      src={img.url}
                      alt={img.file.name}
                      className="max-h-32 w-auto border border-[var(--tk-rule)] object-contain"
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-9 mt-3 sm:mt-0">
                    <p className="text-[12.5px] text-[var(--tk-fg)]">{img.file.name}</p>
                    <p className="text-[10.5px] text-[var(--tk-dim)]">
                      {img.width}×{img.height} px · {Math.round(img.file.size / 1024)} KB ·{' '}
                      {img.file.type}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b border-[var(--tk-rule)] text-[10px] uppercase tracking-[0.25em] text-[var(--tk-dim)]">
                        <th className="px-3 py-2 text-left font-normal">provider</th>
                        <th className="px-3 py-2 text-left font-normal">model (rate)</th>
                        <th className="px-3 py-2 text-right font-normal">tokens</th>
                        <th className="px-3 py-2 text-right font-normal">cost</th>
                        <th className="px-3 py-2 text-left font-normal">formula</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.provider} className="border-t border-[var(--tk-rule)]/60">
                          <td className="px-3 py-1.5 text-[var(--tk-fg)]">{r.provider}</td>
                          <td className="px-3 py-1.5 text-[var(--tk-dim)]">{r.modelId}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]">
                            {r.tokens.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums text-[var(--tk-fg)]">
                            {formatCost(r.cost)}
                          </td>
                          <td className="px-3 py-1.5 text-[10.5px] text-[var(--tk-dim)]">
                            {r.note}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-[var(--tk-dim)]">
        Note: vision token estimators are heuristic. Real provider counts can drift slightly. For
        exact numbers, send the image through the provider's countTokens endpoint.
      </p>
    </section>
  );
};
