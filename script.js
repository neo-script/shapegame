// --- precise geometry helpers for circle-vs-triangle ---
function _sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}
function pointInTriangle(p, a, b, c) {
  const d1 = _sign(p, a, b);
  const d2 = _sign(p, b, c);
  const d3 = _sign(p, c, a);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}
function distPointToSegment(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1, vy = y2 - y1;
  const l2 = vx*vx + vy*vy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * vx + (py - y1) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projx = x1 + t * vx;
  const projy = y1 + t * vy;
  return Math.hypot(px - projx, py - projy);
}
function circleTriangleCollide(circle, tri) {
  // Triangle vertices (matching your draw): apex up, base wide
  const A = { x: tri.x,           y: tri.y - tri.size }; // top
  const B = { x: tri.x - tri.size, y: tri.y + tri.size }; // bottom-left
  const C = { x: tri.x + tri.size, y: tri.y + tri.size }; // bottom-right

  const P = { x: circle.x, y: circle.y };
  // Slight epsilon so it doesn't "early trigger"
  const r = Math.max(0, circle.size - 1.5);

  // Case 1: circle center inside triangle
  if (pointInTriangle(P, A, B, C)) return true;

  // Case 2: closest distance to any edge <= radius
  const dAB = distPointToSegment(P.x, P.y, A.x, A.y, B.x, B.y);
  const dBC = distPointToSegment(P.x, P.y, B.x, B.y, C.x, C.y);
  const dCA = distPointToSegment(P.x, P.y, C.x, C.y, A.x, A.y);
  return (dAB <= r || dBC <= r || dCA <= r);
}
