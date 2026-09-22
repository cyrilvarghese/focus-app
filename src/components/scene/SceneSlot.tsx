/** Where Ashna's studio scene will go. Fixed aspect ratio so layouts don't jump when it arrives. */
export function SceneSlot({ label = "Studio scene (Ashna)" }: { label?: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="my-2 grid aspect-[372/300] w-full place-items-center rounded-3xl border border-dashed border-[rgba(61,57,52,.25)] text-[13px] text-muted"
    >
      {label}
    </div>
  );
}
