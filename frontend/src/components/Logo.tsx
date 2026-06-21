import { Link } from "react-router-dom";

export function Logo({ to = "/", compact = false }: { to?: string; compact?: boolean }) {
    return (
        <Link to={to} onClick={() => window.scrollTo(0, 0)} className="group inline-flex items-center gap-2.5">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M4 18 L10 6 L14 14 L20 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="10" cy="6" r="1.4" fill="currentColor" />
          <circle cx="20" cy="4" r="1.4" fill="currentColor" />
        </svg>
      </span>
            {!compact && (
                <span className="font-display text-[17px] font-medium leading-none tracking-tight">
          travel<span className="text-primary">routes</span>
        </span>
            )}
        </Link>
    );
}
