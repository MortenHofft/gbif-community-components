/**
 * Turn the visible map bounds into a search geometry.
 *
 * Leaflet's bounds are not wrapped: a map panned across the antimeridian
 * reports longitudes beyond ±180 (for example west 170, east 350). Clamping
 * them independently would drop half of the visible area, so instead the span
 * is kept and the west edge wrapped:
 *   - a span of 360° or more is the whole world,
 *   - a box that stays within ±180° is one polygon,
 *   - a box that crosses the antimeridian is a multipolygon of two boxes.
 *
 * Returns the WKT geometry and the normalised bounds. For a box that crosses
 * the antimeridian, `east` is less than `west`.
 */
const round = (x) => Math.round(x * 10000) / 10000;
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const wrapLongitude = (x) => ((((x + 180) % 360) + 360) % 360) - 180;

export function exploreGeometry({ west, east, south, north }) {
  const s = round(clamp(south, -90, 90));
  const n = round(clamp(north, -90, 90));
  const ring = (w, e) =>
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s]
    ]
      .map(([x, y]) => `${x} ${y}`)
      .join(', ');

  const span = east - west;
  if (span >= 360) {
    return { geometry: `POLYGON((${ring(-180, 180)}))`, bounds: { south: s, north: n, west: -180, east: 180 } };
  }

  const w = round(wrapLongitude(west));
  const e = round(w + span);
  if (e <= 180) {
    return { geometry: `POLYGON((${ring(w, e)}))`, bounds: { south: s, north: n, west: w, east: e } };
  }

  const wrappedEast = round(e - 360);
  return {
    geometry: `MULTIPOLYGON(((${ring(w, 180)})),((${ring(-180, wrappedEast)})))`,
    bounds: { south: s, north: n, west: w, east: wrappedEast }
  };
}
