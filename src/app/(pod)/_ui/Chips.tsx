"use client";

export function Chips<T extends number>({
  label,
  options,
  value,
  format,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (v: T) => string;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-[22px] border-0 p-0">
      <legend className="mb-2 text-[13.5px] font-medium text-text-2">{label}</legend>
      <div className="flex gap-2">
        {options.map((o) => {
          const on = o === value;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o)}
              className={`min-h-[46px] flex-1 rounded-full border text-[15px] ${
                on ? "border-sage bg-sage-soft font-semibold text-sage-deep" : "border-line bg-card font-medium text-text"
              }`}
            >
              {format(o)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
