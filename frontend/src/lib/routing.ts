const BROUTER_URL = "https://brouter.de/brouter";

export interface RouteMetrics {
  path: [number, number][];
  distanceKm: number;
  ascentM: number;
  durationH: number;
}

/**
 * Routes between waypoints using BRouter with the given profile.
 * Returns full trail geometry + real metrics (distance, ascent, duration).
 * Returns null on error — callers should fall back to straight lines.
 */
export async function snapToTrails(
  waypoints: [number, number][],
  profile: string,
  signal?: AbortSignal,
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

    const distanceKm =
      Math.round((parseFloat(props["track-length"] ?? "0") / 1000) * 10) / 10;
    const ascentM =
      Math.round(parseFloat(props["filtered ascend"] ?? props["plain-ascend"] ?? "0"));
    const totalSec = parseFloat(props["total-time"] ?? "0");
    const durationH = Math.round((totalSec / 3600) * 10) / 10;

    const path = coords.map(([lng, lat]) => [lat, lng] as [number, number]);

    return { path, distanceKm, ascentM, durationH };
  } catch {
    return null;
  }
}

/**
 * Finds the nearest routable OSM way to the given coordinates.
 * The Overpass query is tailored to the active transport mode:
 *  - hiking: szlaki + wszystkie drogi
 *  - cycling: drogi dla samochodów + ścieżki rowerowe (highway + bicycle)
 *  - car: tylko drogi dla zmotoryzowanych
 */
export async function snapToNearestWay(
  lat: number,
  lng: number,
  transport: "hiking" | "cycling" | "car" = "hiking",
  signal?: AbortSignal,
): Promise<[number, number] | null> {
  const R = 200; // radius in metres

  let overpassFilter: string;
  if (transport === "car") {
    overpassFilter =
      `way(around:${R},${lat},${lng})[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)$"]`;
  } else if (transport === "cycling") {
    overpassFilter =
      `(way(around:${R},${lat},${lng})[highway~"^(cycleway|primary|secondary|tertiary|unclassified|residential|service|living_street|track)$"];` +
      `way(around:${R},${lat},${lng})[highway][bicycle~"^(yes|designated)$"];)`;
  } else {
    // hiking: any highway + marked hiking routes
    overpassFilter =
      `(way(around:${R},${lat},${lng})[highway];` +
      `way(around:${R},${lat},${lng})[route="hiking"];)`;
  }

  const query = `[out:json][timeout:6];${overpassFilter};out geom;`;

  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      elements: Array<{ geometry?: Array<{ lat: number; lon: number }> }>;
    };

    let nearest: [number, number] | null = null;
    let nearestD = Infinity;
    for (const el of data.elements) {
      for (const node of el.geometry ?? []) {
        const d = (node.lat - lat) ** 2 + (node.lon - lng) ** 2;
        if (d < nearestD) { nearestD = d; nearest = [node.lat, node.lon]; }
      }
    }
    return nearest;
  } catch {
    return null;
  }
}
