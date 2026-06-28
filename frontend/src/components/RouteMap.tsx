import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { poiKindLabel, type POI } from "@/data/mockRoutes";
import { snapToTrails } from "@/lib/routing";

type Peak = { lat: number; lon: number; name?: string; ele?: number };

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
}

/** Najbliższy szczyt w promieniu maxM metrów (lub null). */
function nearestPeak(peaks: Peak[], lat: number, lng: number, maxM: number): Peak | null {
    let best: Peak | null = null;
    let bestM = Infinity;
    for (const p of peaks) {
        const d = metersBetween(lat, lng, p.lat, p.lon);
        if (d < bestM) { bestM = d; best = p; }
    }
    return best && bestM <= maxM ? best : null;
}

type MapRoute = {
    path?: [number, number][];
    pois?: Pick<POI, "kind" | "coords" | "name" | "elevation" | "note">[];
};

type OsmWay = { nodes: [number, number][]; highway: string };

// ── Highway classification ───────────────────────────────────────────────────
const PEDESTRIAN_HW = /^(footway|path|track|bridleway|cycleway|pedestrian|steps)$/;
const ROAD_HW       = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road)$/;

/**
 * Najbliższy węzeł szlaku/drogi w promieniu maxM — z JUŻ wczytanego cache OSM
 * (osmWaysRef), bez zapytania sieciowego.
 */
function nearestWayNode(
    ways: OsmWay[],
    lat: number,
    lng: number,
    maxM: number,
    transport: "hiking" | "cycling" | "car",
): [number, number] | null {
    let best: [number, number] | null = null;
    let bestM = Infinity;
    for (const w of ways) {
        if (transport === "car" && !ROAD_HW.test(w.highway)) continue;
        for (const [nlat, nlng] of w.nodes) {
            const d = metersBetween(lat, lng, nlat, nlng);
            if (d < bestM) { bestM = d; best = [nlat, nlng]; }
        }
    }
    return best && bestM <= maxM ? best : null;
}

type Props = {
    route: MapRoute;
    height?: string;
    interactive?: boolean;
    onMapClick?: (latlng: [number, number], meta?: { kind?: POI["kind"]; name?: string; elevation?: number }) => void;
    onPoiMove?: (index: number, latlng: [number, number]) => void;
    className?: string;
    zoomControl?: boolean;
    flyTo?: [number, number];
    /** Tryb transportu — wpływa na snap kliknięcia do szlaku/drogi. */
    transport?: "hiking" | "cycling" | "car";
    /** Display-only BRouter snap for RouteDetail */
    snap?: boolean;
};

export function RouteMap({
    route,
    height = "100%",
    interactive = true,
    onMapClick,
    onPoiMove,
    className,
    zoomControl,
    flyTo,
    transport = "hiking",
    snap = false,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const osmWaysRef  = useRef<OsmWay[]>([]);
    const osmLoadedRef = useRef(false);
    const peaksRef = useRef<Peak[]>([]);
    // Czy mapa zobaczyła już dane trasy — dopasowanie widoku robimy tylko RAZ.
    const seenDataRef = useRef(false);
    const [routedPath, setRoutedPath] = useState<[number, number][] | null>(null);

    // ── Map init ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!ref.current || mapRef.current) return;
        const map = L.map(ref.current, {
            zoomControl: zoomControl ?? interactive,
            dragging: interactive,
            scrollWheelZoom: interactive,
            doubleClickZoom: interactive,
            touchZoom: interactive,
            attributionControl: true,
        });
        mapRef.current = map;

        // OpenTopoMap — poziomice + nazwy wzniesień + szczyty
        L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution:
                '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA) © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: "abc",
            maxZoom: 17,
        }).addTo(map);

        // Widok domyślny ustawiany RAZ; potem mapa nie przeskakuje przy edycji punktów.
        map.setView([49.27, 19.95], 11);

        // Osobny panel dla trasy użytkownika — rysowana ZAWSZE nad podpowiedziami OSM.
        map.createPane("routePane");
        const routePane = map.getPane("routePane");
        if (routePane) routePane.style.zIndex = "450"; // overlayPane=400 < routePane < markerPane=600

        return () => { map.remove(); mapRef.current = null; };
    }, [interactive, zoomControl]);

    // ── OSM way rendering + click-snap cache (only in editor mode) ───────────
    // gated on first render — editors always have onMapClick, others don't
    const [isEditor] = useState(() => !!onMapClick);

    useEffect(() => {
        if (!isEditor) return;
        const map = mapRef.current;
        if (!map) return;

        let pedestrianLayer: L.Polyline | null = null;
        let roadLayer: L.Polyline | null = null;
        let abortCtrl: AbortController | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const loadWays = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                const z = map.getZoom();

                // Below zoom 13: remove custom lines, rely on base map
                if (z < 13) {
                    pedestrianLayer?.remove(); pedestrianLayer = null;
                    roadLayer?.remove();       roadLayer = null;
                    osmWaysRef.current = [];
                    osmLoadedRef.current = false;
                    return;
                }

                abortCtrl?.abort();
                abortCtrl = new AbortController();

                const b = map.getBounds();
                const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
                // Single query for all relevant highway types
                const q =
                    `[out:json][timeout:15];` +
                    `(way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|` +
                    `residential|service|living_street|road|footway|path|track|bridleway|` +
                    `cycleway|pedestrian|steps)$"](${bbox}););out geom;`;

                try {
                    const res = await fetch(
                        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
                        { signal: abortCtrl.signal },
                    );
                    if (!res.ok) return;
                    const data = await res.json() as {
                        elements: Array<{
                            geometry?: Array<{ lat: number; lon: number }>;
                            tags?: Record<string, string>;
                        }>;
                    };

                    // Clear old layers
                    pedestrianLayer?.remove(); pedestrianLayer = null;
                    roadLayer?.remove();       roadLayer = null;
                    osmWaysRef.current = [];

                    const pedestrianPaths: [number, number][][] = [];
                    const roadPaths:       [number, number][][] = [];

                    for (const el of (data.elements ?? []).slice(0, 1200)) {
                        const nodes = (el.geometry ?? []).map(n => [n.lat, n.lon] as [number, number]);
                        const highway = el.tags?.highway ?? "";
                        if (nodes.length < 2) continue;

                        osmWaysRef.current.push({ nodes, highway });

                        if (PEDESTRIAN_HW.test(highway)) pedestrianPaths.push(nodes);
                        else if (ROAD_HW.test(highway))  roadPaths.push(nodes);
                    }

                    // Two multi-polylines instead of N individual layers = fast DOM
                    // Podpowiedzi OSM = subtelne, kreskowane tło (NIE mylić z wybraną trasą).
                    if (roadPaths.length > 0) {
                        roadLayer = L.polyline(roadPaths as L.LatLngExpression[][], {
                            color: "#64748b", weight: 1.3, opacity: 0.4, dashArray: "2 5",
                        }).addTo(map);
                    }
                    if (pedestrianPaths.length > 0) {
                        pedestrianLayer = L.polyline(pedestrianPaths as L.LatLngExpression[][], {
                            color: "#15803d", weight: 1.3, opacity: 0.35, dashArray: "2 5",
                        }).addTo(map);
                    }

                    osmLoadedRef.current = true;
                } catch { /* AbortError or network */ }
            }, 700);
        };

        map.on("moveend", loadWays);
        loadWays(); // initial load

        return () => {
            map.off("moveend", loadWays);
            if (timer) clearTimeout(timer);
            abortCtrl?.abort();
            pedestrianLayer?.remove();
            roadLayer?.remove();
            osmWaysRef.current = [];
        };
    }, [isEditor]);

    // ── Peak markers ─────────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const peakLayers: L.Layer[] = [];
        let abortCtrl: AbortController | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const loadPeaks = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
                if (map.getZoom() < 11) return;
                abortCtrl?.abort();
                abortCtrl = new AbortController();
                const b = map.getBounds();
                const bbox = `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
                const q = `[out:json][timeout:8];node[natural=peak][name](${bbox});out;`;
                try {
                    const res = await fetch(
                        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`,
                        { signal: abortCtrl.signal },
                    );
                    if (!res.ok) return;
                    const data = await res.json() as {
                        elements: Array<{ lat: number; lon: number; tags?: Record<string, string> }>;
                    };
                    peakLayers.forEach(l => map.removeLayer(l));
                    peakLayers.length = 0;
                    peaksRef.current = [];
                    for (const node of data.elements ?? []) {
                        const icon = L.divIcon({
                            className: "peak-marker",
                            html: "▲",
                            iconSize: [14, 14],
                            iconAnchor: [7, 7],
                        });
                        const marker = L.marker([node.lat, node.lon], { icon }).addTo(map);
                        peakLayers.push(marker);
                        peaksRef.current.push({
                            lat: node.lat,
                            lon: node.lon,
                            name: node.tags?.name,
                            ele: node.tags?.ele ? parseFloat(node.tags.ele) : undefined,
                        });
                    }
                } catch { /* ignore */ }
            }, 600);
        };

        map.on("moveend", loadPeaks);
        loadPeaks();

        return () => {
            map.off("moveend", loadPeaks);
            if (timer) clearTimeout(timer);
            abortCtrl?.abort();
            peakLayers.forEach(l => map.removeLayer(l));
        };
    }, []);

    // ── BRouter snap for RouteDetail display ─────────────────────────────────
    useEffect(() => {
        const pois = route.pois ?? [];
        // Reset gdy wyłączone / za mało punktów; dalej async synchronizacja z BRouter (zewnętrzny system)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!snap || pois.length < 2) { setRoutedPath(null); return; }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            snapToTrails(pois.map(p => p.coords), "hiking-mountain", controller.signal)
                .then(result => setRoutedPath(result?.path ?? null));
        }, 500);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [route.pois, snap]);

    // ── Route markers + path ─────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const layers: L.Layer[] = [];
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const accentColor = `hsl(${primary})`;
        const pois = route.pois ?? [];
        const displayPath = routedPath ?? (route.path ?? []);

        if (displayPath.length > 1) {
            const casing = L.polyline(displayPath, {
                color: "#ffffff", weight: 6, opacity: 0.95,
                lineCap: "round", lineJoin: "round", pane: "routePane",
            }).addTo(map);
            const line = L.polyline(displayPath, {
                color: accentColor, weight: 3.5, opacity: 1,
                lineCap: "round", lineJoin: "round", smoothFactor: 1, pane: "routePane",
            }).addTo(map);
            layers.push(casing, line);
        }

        const isDraggable = interactive && !!onPoiMove;

        pois.forEach((poi, i) => {
            const cls = poi.kind === "start" ? "start" : poi.kind === "summit" || poi.kind === "end" ? "end" : "";
            const icon = L.divIcon({
                className: "",
                html: `<div class="poi-marker ${cls}${isDraggable ? " draggable" : ""}"></div>`,
                iconSize: [14, 14], iconAnchor: [7, 7],
            });
            const marker = L.marker(poi.coords, { icon, draggable: isDraggable });

            if (isDraggable) {
                marker.on("dragend", () => {
                    const { lat, lng } = marker.getLatLng();
                    onPoiMove!(i, [lat, lng]);
                });
                marker.on("mousedown", e => L.DomEvent.stopPropagation(e));
            }

            marker.bindPopup(
                `<div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">${poiKindLabel[poi.kind] ?? "Punkt"}</div>
          <div style="font-weight:600;margin-top:2px">${poi.name}</div>
          ${poi.elevation ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#666;margin-top:2px">${poi.elevation} m n.p.m.</div>` : ""}
          ${poi.note ? `<div style="font-size:12px;margin-top:6px;color:#444">${poi.note}</div>` : ""}
        </div>`,
            );
            marker.addTo(map);
            layers.push(marker);
        });

        // Dopasowanie widoku TYLKO przy pierwszym pojawieniu się gotowej trasy (≥2 pkt) —
        // czyli przy wczytaniu istniejącej trasy. Przy dodawaniu/usuwaniu punktów klik-po-kliku
        // (trasa rośnie od 1 punktu) mapa zostaje tam, gdzie ją ustawił użytkownik.
        if (!seenDataRef.current && displayPath.length > 0) {
            seenDataRef.current = true;
            if (displayPath.length > 1) {
                map.fitBounds(L.latLngBounds(displayPath), { padding: [40, 40] });
            }
        }

        return () => { layers.forEach(l => map.removeLayer(l)); };
    }, [route, routedPath, interactive, onPoiMove]);

    // ── FlyTo ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !flyTo) return;
        map.flyTo(flyTo, 13, { duration: 1 });
    }, [flyTo]);

    // ── Click handler — snap tylko do charakterystycznych punktów w pobliżu ────
    //   1) szczyt (~70 m) → kind=summit + nazwa + wysokość,
    //   2) skrzyżowanie/szlak (~30 m) → przyciągnięte współrzędne,
    //   3) inaczej: dokładne miejsce kliknięcia.
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !onMapClick) return;

        const handler = (e: L.LeafletMouseEvent) => {
            const lat = e.latlng.lat, lng = e.latlng.lng;

            // 1) Szczyt w pobliżu (~70 m) — lokalnie, natychmiast.
            const peak = nearestPeak(peaksRef.current, lat, lng, 70);
            if (peak) {
                onMapClick([peak.lat, peak.lon], { kind: "summit", name: peak.name, elevation: peak.ele });
                return;
            }

            // 2) Skrzyżowanie/szlak w pobliżu (~30 m) — z wczytanego cache OSM (BEZ sieci).
            // 3) inaczej dokładny klik. W obu przypadkach kropka pojawia się natychmiast.
            const snapped = nearestWayNode(osmWaysRef.current, lat, lng, 30, transport);
            onMapClick(snapped ?? [lat, lng]);
        };

        map.on("click", handler);
        return () => { map.off("click", handler); };
    }, [onMapClick, transport]);

    return <div ref={ref} className={className} style={{ height, width: "100%" }} />;
}
