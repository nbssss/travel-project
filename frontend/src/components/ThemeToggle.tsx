import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const CYCLE: Record<string, string> = { light: "dark", dark: "pride", pride: "light" };

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    // flaga mounted zapobiega niespójności motywu na pierwszym renderze; efekt to właściwe miejsce
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);

    if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" />;

    const current = theme ?? "light";

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Przełącz motyw"
            onClick={() => setTheme(CYCLE[current] ?? "dark")}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
        >
            {current === "pride" ? (
                <span className="text-base leading-none select-none" role="img" aria-label="Pride">🌈</span>
            ) : current === "dark" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </Button>
    );
}
