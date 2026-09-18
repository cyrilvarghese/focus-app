/** "55 minutes", "1h", "1h 35m": the Create screen's total line. */
export function formatTogether(min: number): string {
  if (min < 60) return min === 1 ? "1 minute" : `${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "24:59". Rounds up to the whole second so it never reads 00:00 while time remains. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
