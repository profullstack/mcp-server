/**
 * The geographic area the local directory snapshots cover (PRD §6, AT06).
 *
 * Snapshots contain every source record inside this circle. A search circle
 * that reaches outside it can only be partially answered, and a strict search
 * then fails with insufficient_geospatial_coverage instead of pretending.
 */
import { haversineMiles } from './geo.js';

export const LAUNCH_COVERAGE = Object.freeze({
  label: 'Launch area: 75 miles around ZIP 95032 (Los Gatos, CA)',
  lat: 37.18014, // Census 2024 ZCTA 95032 internal point
  lng: -121.901553,
  radius_miles: 75,
});

/**
 * @param {{ lat: number, lng: number, radius_miles: number }} origin
 * @returns {'full' | 'partial' | 'none'}
 */
export function coverageFor(origin, area = LAUNCH_COVERAGE) {
  const d = haversineMiles(area.lat, area.lng, origin.lat, origin.lng);
  if (d + origin.radius_miles <= area.radius_miles) return 'full';
  if (d - origin.radius_miles < area.radius_miles) return 'partial';
  return 'none';
}
