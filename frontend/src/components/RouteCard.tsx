import { Link } from "react-router-dom";
import { ArrowUpRight, Mountain, Route as RouteIcon, Timer } from "lucide-react";
import type { RouteDto } from "@/lib/api";
import { DifficultyBadge } from "./DifficultyBadge";
import { RouteMap } from "./RouteMap";

export function RouteCard({ route }: { route: RouteDto }) {
    return (
        <Link
            to={`/app/route/${route.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
        >
            <div className="relative h-44 overflow-hidden border-b" style={{ borderColor: "hsl(var(--hairline))" }}>
                <RouteMap route={{}} interactive={false} height="100%" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/80 to-transparent" />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{route.region}</div>
                        <h3 className="mt-1 truncate font-display text-lg font-medium leading-tight">{route.title}</h3>
                    </div>
                    <DifficultyBadge difficulty={route.difficulty} />
                </div>
                <div className="grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: "hsl(var(--hairline))" }}>
                    <Stat icon={<RouteIcon className="h-3.5 w-3.5" />} value={`${route.distanceKm}`} unit="km" />
                    <Stat icon={<Mountain className="h-3.5 w-3.5" />} value={`${route.ascentM}`} unit="m ↑" />
                    <Stat icon={<Timer className="h-3.5 w-3.5" />} value={`${route.durationH}`} unit="h" />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{route.ownerUserName ?? ""}</span>
                    <ArrowUpRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 text-primary" />
                </div>
            </div>
        </Link>
    );
}

function Stat({ icon, value, unit }: { icon: React.ReactNode; value: string; unit: string }) {
    return (
        <div className="flex flex-col items-start gap-1">
            <span className="text-muted-foreground">{icon}</span>
            <div className="flex items-baseline gap-1">
                <span className="data-num text-sm font-medium">{value}</span>
                <span className="text-[10px] text-muted-foreground">{unit}</span>
            </div>
        </div>
    );
}
