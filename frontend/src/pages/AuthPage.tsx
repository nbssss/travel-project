import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RouteMap } from "@/components/RouteMap";
import { mockRoutes } from "@/data/mockRoutes";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { FormEvent, ReactNode } from "react";

type Props = {
  mode: "login" | "register";
};

const AuthPage = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const isLogin = mode === "login";

  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isLogin) {
        await authApi.register({ userName, email, password });
      }
      // logujemy po nazwie użytkownika (po rejestracji — tymi samymi danymi)
      const { accessToken } = await authApi.login({ userName, password });
      login(accessToken, userName);
      navigate("/app");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-sm animate-fade-in">
            <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> wróć
            </Link>
            <h1 className="font-display text-3xl font-medium tracking-tight">
              {isLogin ? "Witaj z powrotem." : "Załóż konto."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin ? "Zaloguj się, żeby zobaczyć swoje trasy." : "Kilka pól i ruszamy w teren."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <Field label="Nazwa użytkownika">
                <Input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </Field>
              {!isLogin && (
                <Field label="Email">
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
              )}
              <Field label="Hasło" hint={isLogin ? <Link to="#" className="text-xs text-muted-foreground hover:text-foreground">Zapomniałeś?</Link> : undefined}>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Chwila…" : isLogin ? "Zaloguj" : "Załóż konto"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                {isLogin ? "Nie masz konta? " : "Masz już konto? "}
                <Link to={isLogin ? "/register" : "/login"} className="font-medium text-primary hover:underline">
                  {isLogin ? "Zarejestruj się" : "Zaloguj"}
                </Link>
              </div>
            </form>
          </div>
        </div>

        <footer className="px-6 py-4 text-[11px] text-muted-foreground">
          UJ FAIS · PAI 2025/2026 · projekt UI
        </footer>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden border-l md:block" style={{ borderColor: "hsl(var(--hairline))" }}>
        <RouteMap route={mockRoutes[0]} interactive={false} height="100%" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 rounded-xl border bg-card/95 p-5 shadow-lift backdrop-blur" style={{ borderColor: "hsl(var(--hairline))" }}>
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Trasa dnia</div>
          <div className="mt-1 font-display text-xl font-medium">Morskie Oko → Rysy</div>
          <div className="mt-3 flex gap-5 text-xs text-muted-foreground data-num">
            <span>22.4 km</span><span>↑ 1685 m</span><span>9.5 h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        {hint}
      </div>
      {children}
    </div>
  );
}

export default AuthPage;
