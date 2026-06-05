import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Route } from "@/data/mockRoutes";

type Props = {
    route: Route;
    height?: string;
    interactive?: boolean;
    onMapClick?: (latlng: [number, number]) => void;
    className?: string;
};

const kindLabel: Record<string, string> = {
    start: "Start",
    end: "Meta",
    viewpoint: "Punkt widokowy",
    shelter: "Schronisko",
    summit: "Szczyt",
    lake: "Jezioro",
    waypoint: "Punkt",
};

export function RouteMap({ route, height = "100%", interactive = true, onMapClick, className }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!ref.current || mapRef.current) return;
        const map = L.map(ref.current, {
            zoomControl: interactive,
            dragging: interactive,
            scrollWheelZoom: interactive,
            doubleClickZoom: interactive,
            touchZoom: interactive,
            attributionControl: true,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© OpenStreetMap',
            maxZoom: 18,
        }).addTo(map);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [interactive]);

    // Render path + markers when route changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const layers: L.Layer[] = [];
        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        const accentColor = `hsl(${primary})`;

        if (route.path.length > 1) {
            const halo = L.polyline(route.path, { color: "#ffffff", weight: 7, opacity: 0.6 }).addTo(map);
            const line = L.polyline(route.path, { color: accentColor, weight: 4, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(map);
            layers.push(halo, line);
        }

        route.pois.forEach((poi) => {
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
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#888">${kindLabel[poi.kind] ?? "Punkt"}</div>
          <div style="font-weight:600;margin-top:2px">${poi.name}</div>
          ${poi.elevation ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#666;margin-top:2px">${poi.elevation} m n.p.m.</div>` : ""}
          ${poi.note ? `<div style="font-size:12px;margin-top:6px;color:#444">${poi.note}</div>` : ""}
        </div>`
            );
            layers.push(marker);
        });

        if (route.path.length > 0) {
            map.fitBounds(L.latLngBounds(route.path), { padding: [40, 40] });
        } else if (route.pois.length > 0) {
            map.setView(route.pois[0].coords, 13);
        } else {
            map.setView([49.27, 19.95], 11);
        }

        return () => {
            layers.forEach((l) => map.removeLayer(l));
        };
    }, [route]);

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
