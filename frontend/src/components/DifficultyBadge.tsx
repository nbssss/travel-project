import type { Route } from "@/data/mockRoutes";

const colors: Record<Route["difficulty"], string> = {
    easy: "bg-success/15 text-success border-success/20",
    moderate: "bg-accent/15 text-accent border-accent/30",
    hard: "bg-destructive/10 text-destructive border-destructive/20",
};

const labels: Record<Route["difficulty"], string> = {
    easy: "łatwa",
    moderate: "średnia",
    hard: "trudna",
};

export function DifficultyBadge({ difficulty }: { difficulty: Route["difficulty"] }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${colors[difficulty]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {labels[difficulty]}
    </span>
    );
}
