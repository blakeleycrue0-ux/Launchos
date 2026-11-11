import { useId } from 'react';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface OptionGroupProps<T extends string> {
  legend: string;
  name: string;
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  columns?: number;
}

/** Grupo de opciones tipo tarjeta, accesible como radio group nativo. */
export function OptionGroup<T extends string>({ legend, name, options, value, onChange, columns }: OptionGroupProps<T>) {
  const id = useId();
  return (
    <fieldset
      className="options"
      style={columns ? { gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(640 / columns)}px, 1fr))` } : undefined}
    >
      <legend>{legend}</legend>
      {options.map((opt) => (
        <label key={opt.value} className="option">
          <input
            type="radio"
            name={`${name}-${id}`}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span className="option__title">{opt.label}</span>
          {opt.description && <span className="option__desc">{opt.description}</span>}
        </label>
      ))}
    </fieldset>
  );
}
