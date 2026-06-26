import { NavLink, Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { NewRouteButton } from "./NewRouteButton";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth";
import type { ReactNode } from "react";

const nav = [
    { to: "/app", label: "Moje trasy", end: true, authOnly: true },
    { to: "/app/explore", label: "Odkrywaj", authOnly: false },
];

export function AppShell({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const { logout, userName, isAuthenticated } = useAuth();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const navItems = nav.filter((n) => !n.authOnly || isAuthenticated);

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
                            {navItems.map(({ to, label, end }) => (
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
                        <ThemeToggle />
                        {isAuthenticated ? (
                            <>
                                <NewRouteButton />
                                <button
                                    onClick={() => navigate("/app/profile")}
                                    aria-label="Profil"
                                    title={userName ?? "Profil"}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                    {userName ? userName[0].toUpperCase() : "?"}
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Wyloguj</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" size="sm" asChild><Link to="/login">Zaloguj</Link></Button>
                                <Button variant="hero" size="sm" asChild><Link to="/register">Załóż konto</Link></Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile nav row */}
                <nav
                    className="flex items-center gap-1 overflow-x-auto border-t px-4 py-2 md:hidden"
                    style={{ borderColor: "hsl(var(--hairline))" }}
                >
                    {navItems.map(({ to, label, end }) => (
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
