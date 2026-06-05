import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { mockRoutes } from "@/data/mockRoutes";

const Profile = () => {
  const totalKm = mockRoutes.reduce((s, r) => s + r.distanceKm, 0);
  const totalAsc = mockRoutes.reduce((s, r) => s + r.ascentM, 0);

  return (
    <AppShell>
      <div className="container max-w-4xl py-8 md:py-12">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-hero font-display text-3xl font-medium text-primary-foreground shadow-lift">
            NB
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Profil</div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-tight">Natalia Borsuk</h1>
            <p className="mt-1 text-sm text-muted-foreground">natalia@uj.edu.pl · członkini od kwietnia 2026</p>
          </div>
          <Button variant="outline">Edytuj profil</Button>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-hairline" style={{ borderColor: "hsl(var(--hairline))" }}>
          <Big n={mockRoutes.length} label="trasy" />
          <Big n={totalKm.toFixed(1)} unit="km" label="łącznie" />
          <Big n={totalAsc.toLocaleString("pl-PL")} unit="m ↑" label="podejścia" />
        </div>

        <div className="mt-10">
          <h2 className="font-display text-xl font-medium">Ostatnia aktywność</h2>
          <ul className="mt-4 divide-y rounded-xl border" style={{ borderColor: "hsl(var(--hairline))" }}>
            {mockRoutes.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.region} · {r.updatedAt}</div>
                </div>
                <div className="data-num text-xs text-muted-foreground">{r.distanceKm} km · ↑ {r.ascentM} m</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
};

function Big({ n, unit, label }: { n: number | string; unit?: string; label: string }) {
  return (
    <div className="bg-card p-5">
      <div className="flex items-baseline gap-1.5">
        <span className="data-num font-display text-3xl font-medium tracking-tight">{n}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
    </div>
  );
}

export default Profile;
