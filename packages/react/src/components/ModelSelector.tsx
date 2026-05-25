import type { Provider } from '@tokenometer/core/browser';
import { forwardRef } from 'react';
import { useModelList } from '../hooks/useModelList.js';

export interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  providers?: readonly Provider[];
  id?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Native `<select>` populated from the model registry. Group-by-provider
 * to keep long lists scannable.
 */
export const ModelSelector = forwardRef<HTMLSelectElement, ModelSelectorProps>(
  function ModelSelector(props, ref) {
    const { value, onChange, providers, id, placeholder, className } = props;
    const models = useModelList(providers ? { providers } : {});
    const byProvider = new Map<Provider, typeof models>();
    for (const m of models) {
      const list = byProvider.get(m.provider) ?? [];
      list.push(m);
      byProvider.set(m.provider, list);
    }
    return (
      <select
        className={className}
        data-tk="model-selector"
        id={id}
        onChange={(e) => onChange(e.target.value)}
        ref={ref}
        value={value}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {[...byProvider.entries()].map(([provider, list]) => (
          <optgroup key={provider} label={provider}>
            {list.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  },
);
