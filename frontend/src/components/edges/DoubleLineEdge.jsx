import { getBezierPath, BaseEdge } from "@xyflow/react";

export function DoubleLineEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style = {}
}) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const color = style.stroke || "#09a109ff";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ strokeWidth: 5, stroke: color }} />
      <path d={edgePath} stroke="white" strokeWidth={2} fill="none" style={{ pointerEvents: "none" }} />
    </>
  );
}
