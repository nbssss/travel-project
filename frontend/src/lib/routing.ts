const BROUTER_URL = "https://brouter.de/brouter";

/** Naismith's rule — musi być identyczna z backendem (dist/4.0 + ascent/400). */
export function naismiithH(distanceKm: number, ascentM: number): number {
  return Math.round((distanceKm / 4.0 + ascentM / 400) * 10) / 10;
}

/** Pojedynczy punkt profilu wysokościowego: skumulowany dystans + wysokość. */
export interface ElevationPoint {
  /** Skumulowany dystans od startu w km. */
  distKm: number;
  /** Wysokość n.p.m. w metrach. */
  ele: number;
}

export interface RouteMetrics {
  path: [number, number][];
  distanceKm: number;
  ascentM: number;
  descentM: number;
  durationH: number;
  /** Seria do wykresu profilu wysokościowego (pusta, gdy brak danych wysokości). */
  profile: ElevationPoint[];
}

// Próg wygładzania szumu wysokości (SRTM) w metrach — tłumi mikro-oscylacje,
// które inaczej zawyżają sumę podejść i zejść. Ten sam dla podejść i zejść.
const SMOOTH_M = 5;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

/** Dystans po wielkim kole w km (wrapper na haversineMeters). */
export function haversineKm(a: [number, number], b: [number, number]): number {
  return haversineMeters(a, b) / 1000;
}

/**
 * Sumuje podejścia i zejścia z serii wysokości, z histerezą progu (SMOOTH_M):
 * punkt odniesienia przesuwa się dopiero po przekroczeniu progu, dzięki czemu
 * szum poniżej progu jest ignorowany.
 */
function accumulateAscentDescent(eles: number[]): { ascentM: number; descentM: number } {
  let ref: number | undefined;
  let ascent = 0;
  let descent = 0;
  for (const e of eles) {
    if (!Number.isFinite(e)) continue;
    if (ref === undefined) { ref = e; continue; }
    const d = e - ref;
    if (d >= SMOOTH_M) { ascent += d; ref = e; }
    else if (d <= -SMOOTH_M) { descent += -d; ref = e; }
  }
  return { ascentM: Math.round(ascent), descentM: Math.round(descent) };
}

/**
 * Routes between waypoints using BRouter with the given profile.
 * Returns full trail geometry + real metrics (distance, ascent, descent,
 * duration) and an elevation profile series. BRouter zwraca wysokość per
 * wierzchołek jako 3-ci element coords — to źródło prawdy dla profilu i przewyższeń.
 * Returns null on error — callers should fall back to straight lines.
 */
export async function snapToTrails(
  waypoints: [number, number][],
  profile: string,
  signal?: AbortSignal,
  timeMultiplier = 1,
): Promise<RouteMetrics | null> {
  if (waypoints.length < 2) return null;

  const lonlats = waypoints.map(([lat, lng]) => `${lng},${lat}`).join("|");
  const url = `${BROUTER_URL}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      console.warn("[routing] BRouter", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const coords = feature.geometry?.coordinates as [number, number, number?][] | undefined;
    if (!coords?.length) return null;

    const props: Record<string, string> = feature.properties ?? {};

    const path = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

    // Wysokość per-wierzchołek (3-ci element coords). Brakujące → NaN (pomijane).
    const eles = coords.map((c) => (typeof c[2] === "number" ? c[2] : NaN));
    const hasElevation = eles.some((e) => Number.isFinite(e));

    // Profil: skumulowany dystans Haversine vs wysokość (carry-forward przy brakach).
    const profileSeries: ElevationPoint[] = [];
    if (hasElevation) {
      let cumM = 0;
      let lastEle = eles.find((e) => Number.isFinite(e)) ?? 0;
      for (let i = 0; i < path.length; i++) {
        if (i > 0) cumM += haversineMeters(path[i - 1], path[i]);
        if (Number.isFinite(eles[i])) lastEle = eles[i];
        profileSeries.push({ distKm: Math.round((cumM / 1000) * 1000) / 1000, ele: Math.round(lastEle) });
      }
    }

    const distanceKm =
      Math.round((parseFloat(props["track-length"] ?? "0") / 1000) * 10) / 10;

    // Podejścia/zejścia z geometrii (źródło prawdy); fallback na property BRoutera,
    // gdy trasa nie ma danych wysokości.
    const { ascentM, descentM } = hasElevation
      ? accumulateAscentDescent(eles)
      : {
          ascentM: Math.round(parseFloat(props["filtered ascend"] ?? props["plain-ascend"] ?? "0")),
          descentM: 0,
        };

    const totalSec = parseFloat(props["total-time"] ?? "0");
    const durationH = Math.round((totalSec / 3600) * timeMultiplier * 10) / 10;

    return { path, distanceKm, ascentM, descentM, durationH, profile: profileSeries };
  } catch {
    return null;
  }
}

/**
 * Wysokość POI = wysokość najbliższego wierzchołka geometrii trasy.
 * `path` i `profile` muszą pochodzić z tego samego wyniku snapToTrails.
 */
export function elevationForPoi(
  coords: [number, number],
  path: [number, number][],
  profile: ElevationPoint[],
): number | undefined {
  if (!path.length || path.length !== profile.length) return undefined;
  let bestSq = Infinity;
  let bestEle: number | undefined;
  for (let i = 0; i < path.length; i++) {
    const dLat = path[i][0] - coords[0];
    const dLng = path[i][1] - coords[1];
    const sq = dLat * dLat + dLng * dLng;
    if (sq < bestSq) { bestSq = sq; bestEle = profile[i].ele; }
  }
  return bestEle;
}
