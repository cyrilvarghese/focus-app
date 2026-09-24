import type { Glaze, PieceId } from "@/lib/pottery/piece";
import { potSvg } from "@/lib/pottery/shape";

/** A finished, glazed piece. The drawing is Ashna's, ported in src/lib/pottery/shape.ts. */
export function FinishedPot({
  pieceId,
  glaze,
  width,
  height,
  glint = false,
}: {
  pieceId: PieceId;
  glaze: Glaze;
  width: number;
  height: number;
  glint?: boolean;
}) {
  return (
    <span
      className="block"
      style={{ width, height }}
      // Built from numbers in our own code, with no user content.
      dangerouslySetInnerHTML={{ __html: potSvg(pieceId, glaze, width, height, { glint }) }}
    />
  );
}
