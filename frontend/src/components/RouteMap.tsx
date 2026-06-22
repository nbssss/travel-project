import { useEffect, useRef } from "react";
import L from "leaflet";
import { poiKindLabel, type POI } from "@/data/mockRoutes";

type MapRoute = {
    path?: [number, number][];
    pois?: Pick<POI, "kind" | "coords" | "name" | "elevation" | "note">[];
};

type Props = {
    route: MapRoute;
    height?: string;
    interactive?: boolean;
    onMapClick?: (latlng: [number, number]) => void;
    className?: string;
    /** Show the +/- zoom buttons. Defaults to `interactive`. */
    zoomControl?: boolean;
    /** When set, the map flies to these coordinates at zoom 13. */
    flyTo?: [number, number];
};

export function RouteMap({ route, height = "100%", interactive = true, onMapClick, className, zoomControl, flyTo }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

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

        // OpenTopoMap: topographic basemap with walking trails, contour lines and
        // hillshading — far better for hiking routes than the road-focused OSM tiles.
        L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
            attribution: '© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)',
            maxZoom: 17,
        }).addTo(map);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [interactive, zoomControl]);

    // Render path + markers when route changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const layers: L.Layer[] = [];
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const accentColor = `hsl(${primary})`;
        const path = route.path ?? [];
        const pois = route.pois ?? [];

        if (path.length > 1) {
            // White casing under a colored track — the classic walking-route look.
            const casing = L.polyline(path, { color: "#ffffff", weight: 8, opacity: 0.7, lineCap: "round", lineJoin: "round" }).addTo(map);
            const line = L.polyline(path, { color: accentColor, weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round", smoothFactor: 1 }).addTo(map);
            layers.push(casing, line);
        }

        pois.forEach((poi) => {
            const cls = poi.kind === "start" ? "start" : poi.kind === "summit" || poi.kind === "end" ? "end" : "";
            const icon = L.divIcon({
                className: "",
                html: `<div class="poi-marker ${cls}"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });
            const marker = L.marker(poi.coords, { icon }).addTo(map);
            marker.bindPopup(
                `<div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">${poiKindLabel[poi.kind] ?? "Punkt"}</div>
          <div style="font-weight:600;margin-top:2px">${poi.name}</div>
          ${poi.elevation ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#666;margin-top:2px">${poi.elevation} m n.p.m.</div>` : ""}
          ${poi.note ? `<div style="font-size:12px;margin-top:6px;color:#444">${poi.note}</div>` : ""}
        </div>`
            );
            layers.push(marker);
        });

        if (path.length > 0) {
            map.fitBounds(L.latLngBounds(path), { padding: [40, 40] });
        } else if (pois.length > 0) {
            map.setView(pois[0].coords, 13);
        } else {
            map.setView([49.27, 19.95], 11);
        }

        return () => {
            layers.forEach((l) => map.removeLayer(l));
        };
    }, [route]);

    // Fly to searched location
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !flyTo) return;
        map.flyTo(flyTo, 13, { duration: 1 });
    }, [flyTo]);

    // Click handler
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !onMapClick) return;
        const handler = (e: L.LeafletMouseEvent) => onMapClick([e.latlng.lat, e.latlng.lng]);
        map.on("click", handler);
        return () => { map.off("click", handler); };
    }, [onMapClick]);

    return <div ref={ref} className={className} style={{ height, width: "100%" }} />;
}
