"use client";

export function Field({
  id,
  label,
  value,
  onChange,
  hint,
  placeholder,
  maxLength,
  autoComplete = "off",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Shown under the field, only once the field has been touched (the caller decides). */
  hint?: string | null;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div className="mt-[22px]">
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-medium text-text-2">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-invalid={hint ? true : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="min-h-[50px] w-full rounded-2xl border border-line bg-card px-4 text-base outline-none focus:border-sage focus:shadow-[0_0_0_3px_var(--accent-soft)]"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
