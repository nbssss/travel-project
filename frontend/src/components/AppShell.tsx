import { NavLink, useNavigate } from "react-router-dom";
import { Compass, LayoutGrid, LogOut, Map, Plus, User } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import type { ReactNode } from "react";

const nav = [
    { to: "/app", label: "Moje trasy", icon: LayoutGrid, end: true },
    { to: "/app/explore", label: "Odkrywaj", icon: Compass },
    { to: "/app/profile", label: "Profil", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-screen bg-background">
            <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                <div className="flex h-16 items-center px-5">
                    <Logo to="/app" />
                </div>
                <nav className="flex-1 space-y-0.5 px-3">
                    {nav.map(({ to, label, icon: Icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                                }`
                            }
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="border-t p-3 space-y-2" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/app/route/new/edit")}>
                        <Plus className="h-4 w-4" /> Nowa trasa
                    </Button>
                    <div className="flex items-center justify-between px-1">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Wyloguj
                        </button>
                        <ThemeToggle />
                    </div>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-8" style={{ borderColor: "hsl(var(--hairline))" }}>
                    <div className="flex items-center gap-3 md:hidden">
                        <Logo to="/app" />
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                        <Map className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Twój panel</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="hero" onClick={() => navigate("/app/route/new/edit")} className="hidden sm:inline-flex">
                            <Plus className="h-4 w-4" /> Nowa trasa
                        </Button>
                        <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground sm:flex">NB</span>
                        <div className="md:hidden"><ThemeToggle /></div>
                    </div>
                </header>
                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}
