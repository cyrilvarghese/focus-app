"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-sage text-base font-semibold text-on-sage active:scale-[.985] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** The quiet secondary action. With `href` it renders a link, otherwise a button. */
export function TextButton({
  children,
  disabled,
  onClick,
  href,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = "mt-1 flex min-h-12 w-full items-center justify-center text-[15px] font-semibold text-text-2 disabled:opacity-50";
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const arrow = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

/** 44px round back control. With `href` it's a link, otherwise a button (for in-page steps). */
export function BackButton({ href, onClick }: { href?: string; onClick?: () => void }) {
  const cls = "-ml-2.5 grid h-11 w-11 place-items-center rounded-full text-text-2";
  if (href) {
    return (
      <Link href={href} aria-label="Back" className={cls}>
        {arrow}
      </Link>
    );
  }
  return (
    <button type="button" aria-label="Back" onClick={onClick} className={cls}>
      {arrow}
    </button>
  );
}
