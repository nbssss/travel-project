import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { poiKindLabel, type POI } from "@/data/mockRoutes";
import { snapToTrails } from "@/lib/routing";

type MapRoute = {
    path?: [number, number][];
    pois?: Pick<POI, "kind" | "coords" | "name" | "elevation" | "note">[];
};

type OsmWay = { nodes: [number, number][]; highway: string };

// ── Highway classification ───────────────────────────────────────────────────
const PEDESTRIAN_HW = /^(footway|path|track|bridleway|cycleway|pedestrian|steps)$/;
const ROAD_HW       = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road)$/;

type Props = {
    route: MapRoute;
    height?: string;
    interactive?: boolean;
    onMapClick?: (latlng: [number, number]) => void;
    onPoiMove?: (index: number, latlng: [number, number]) => void;
    className?: string;
    zoomControl?: boolean;
    flyTo?: [number, number];
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
    snap = false,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const osmWaysRef  = useRef<OsmWay[]>([]);
    const osmLoadedRef = useRef(false);
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
                    if (roadPaths.length > 0) {
                        roadLayer = L.polyline(roadPaths as L.LatLngExpression[][], {
                            color: "#1a1a1a", weight: 2.2, opacity: 0.75,
                        }).addTo(map);
                    }
                    if (pedestrianPaths.length > 0) {
                        pedestrianLayer = L.polyline(pedestrianPaths as L.LatLngExpression[][], {
                            color: "#16a34a", weight: 2.5, opacity: 0.85,
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
                    for (const node of data.elements ?? []) {
                        const icon = L.divIcon({
                            className: "peak-marker",
                            html: "▲",
                            iconSize: [14, 14],
                            iconAnchor: [7, 7],
                        });
                        L.marker([node.lat, node.lon], { icon }).addTo(map);
                        peakLayers.push(L.marker([node.lat, node.lon], { icon }));
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
                color: "#ffffff", weight: 5, opacity: 0.75,
                lineCap: "round", lineJoin: "round",
            }).addTo(map);
            const line = L.polyline(displayPath, {
                color: accentColor, weight: 3, opacity: 1,
                lineCap: "round", lineJoin: "round", smoothFactor: 1,
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

        if (displayPath.length > 0) {
            map.fitBounds(L.latLngBounds(displayPath), { padding: [40, 40] });
        } else if (pois.length > 0) {
            map.setView(pois[0].coords, 13);
        } else {
            map.setView([49.27, 19.95], 11);
        }

        return () => { layers.forEach(l => map.removeLayer(l)); };
    }, [route, routedPath, interactive, onPoiMove]);

    // ── FlyTo ────────────────────────────────────────────────────────────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !flyTo) return;
        map.flyTo(flyTo, 13, { duration: 1 });
    }, [flyTo]);

    // ── Click handler — dodaje punkt dokładnie w miejscu kliknięcia ───────────
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !onMapClick) return;

        const handler = (e: L.LeafletMouseEvent) => {
            onMapClick([e.latlng.lat, e.latlng.lng]);
        };

        map.on("click", handler);
        return () => { map.off("click", handler); };
    }, [onMapClick]);

    return <div ref={ref} className={className} style={{ height, width: "100%" }} />;
}
