import { useEffect, useRef, useState } from "react";
import type { ElevationPoint } from "@/lib/routing";

type Props = {
  /** Seria profilu z snapToTrails (skumulowany dystans + wysokość). */
  data: ElevationPoint[];
  /** Wysokość wykresu w px. */
  height?: number;
  className?: string;
};

/**
 * Lekki wykres profilu wysokościowego (SVG, bez zewnętrznych zależności).
 * Oś X = dystans [km], oś Y = wysokość [m]. Hover pokazuje odczyt punktu.
 */
export function ElevationProfile({ data, height = 132, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (data.length < 2) return null;

  const padT = 12, padB = 18, padL = 38, padR = 10;
  const W = Math.max(width, 1);
  const H = height;
  const plotW = Math.max(1, W - padL - padR);
  const plotH = Math.max(1, H - padT - padB);

  const xs = data.map((d) => d.distKm);
  const ys = data.map((d) => d.ele);
  const minX = xs[0];
  const maxX = xs[xs.length - 1];
  const spanX = Math.max(1e-6, maxX - minX);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (maxY - minY < 10) { maxY += 5; minY -= 5; } // unikaj zupełnie płaskiej linii
  const spanY = maxY - minY;

  const px = (d: number) => padL + ((d - minX) / spanX) * plotW;
  const py = (e: number) => padT + (1 - (e - minY) / spanY) * plotH;

  const linePath = "M" + data.map((d) => `${px(d.distKm).toFixed(1)},${py(d.ele).toFixed(1)}`).join(" L");
  const baseY = (padT + plotH).toFixed(1);
  const areaPath = `${linePath} L${px(maxX).toFixed(1)},${baseY} L${px(minX).toFixed(1)},${baseY} Z`;

  const gridLevels = [maxY, (maxY + minY) / 2, minY];

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left - padL) / plotW));
    const targetDist = minX + ratio * spanX;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(data[i].distKm - targetDist);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHover(best);
  };

  const hp = hover != null && hover < data.length ? data[hover] : null;

  return (
    <div className={className}>
      <div ref={wrapRef} style={{ width: "100%" }}>
        {width > 0 && (
          <svg
            width={W}
            height={H}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
            style={{ display: "block", touchAction: "none" }}
          >
            <defs>
              <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {gridLevels.map((v, i) => (
              <g key={i}>
                <line x1={padL} y1={py(v)} x2={W - padR} y2={py(v)} stroke="hsl(var(--hairline))" strokeWidth="1" />
                <text x={padL - 5} y={py(v) + 3} textAnchor="end" fontSize="9" fill="hsl(var(--muted-foreground))">
                  {Math.round(v)}
                </text>
              </g>
            ))}

            <path d={areaPath} fill="url(#elev-grad)" />
            <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />

            <text x={padL} y={H - 5} fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="start">{minX.toFixed(1)} km</text>
            <text x={W - padR} y={H - 5} fontSize="9" fill="hsl(var(--muted-foreground))" textAnchor="end">{maxX.toFixed(1)} km</text>

            {hp && (
              <g>
                <line x1={px(hp.distKm)} y1={padT} x2={px(hp.distKm)} y2={padT + plotH} stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={px(hp.distKm)} cy={py(hp.ele)} r="3.5" fill="hsl(var(--primary))" stroke="#fff" strokeWidth="1.5" />
              </g>
            )}
          </svg>
        )}
      </div>
      <div className="h-4 text-center text-[11px] text-muted-foreground">
        {hp
          ? <span><span className="font-medium text-foreground">{hp.ele} m n.p.m.</span> · {hp.distKm.toFixed(1)} km</span>
          : <span>Najedź, aby odczytać wysokość</span>}
      </div>
    </div>
  );
}
