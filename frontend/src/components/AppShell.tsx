import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NewRouteButton } from "./NewRouteButton";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

const nav = [
    { to: "/app", label: "Moje trasy", end: true },
    { to: "/app/explore", label: "Odkrywaj" },
];

export function AppShell({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header
                className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur"
                style={{ borderColor: "hsl(var(--hairline))" }}
            >
                <div className="container flex h-16 items-center justify-between gap-4">
                    <div className="flex items-center gap-8">
                        <Logo to="/" />
                        <nav className="hidden items-center gap-6 text-sm md:flex">
                            {nav.map(({ to, label, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        isActive
                                            ? "font-medium text-foreground"
                                            : "text-muted-foreground transition-colors hover:text-foreground"
                                    }
                                >
                                    {label}
                                </NavLink>
                            ))}
                        </nav>
                    </div>
                    <div className="flex items-center gap-2">
                        <NewRouteButton />
                        <ThemeToggle />
                        <button
                            onClick={() => navigate("/app/profile")}
                            aria-label="Profil"
                            title="Profil"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
                        >
                            NB
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Wyloguj</span>
                        </button>
                    </div>
                </div>

                {/* Mobile nav row */}
                <nav
                    className="flex items-center gap-1 overflow-x-auto border-t px-4 py-2 md:hidden"
                    style={{ borderColor: "hsl(var(--hairline))" }}
                >
                    {nav.map(({ to, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                                    isActive
                                        ? "bg-secondary font-medium text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </header>

            <main className="flex-1">{children}</main>
        </div>
    );
}
