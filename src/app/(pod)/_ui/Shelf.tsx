import { FinishedPot } from "@/components/pottery/FinishedPot";
import { shelfSize } from "@/lib/pottery/shape";
import type { ShelfItem } from "@/lib/supabase/shelf";

const PER_PLANK = 3;

/** Your pots on planks, newest first. */
export function Shelf({ items }: { items: ShelfItem[] }) {
  const planks: ShelfItem[][] = [];
  for (let i = 0; i < items.length; i += PER_PLANK) planks.push(items.slice(i, i + PER_PLANK));

  return (
    <div>
      {planks.map((plank) => (
        <div key={plank[0].sessionId}>
          <div className="flex h-24 items-end justify-around px-1.5">
            {plank.map((item) => {
              const [w, h] = shelfSize(item.pieceId);
              return (
                <span key={item.sessionId} title={`${item.podName} · ${item.minutes} min`}>
                  <FinishedPot pieceId={item.pieceId} glaze={item.glaze} width={w} height={h} />
                </span>
              );
            })}
          </div>
          <div className="mx-[-2px] mb-[22px] h-2.5 rounded-[3px] border border-[#cfc3b0] bg-[#e4d8c6]" />
        </div>
      ))}
    </div>
  );
}
