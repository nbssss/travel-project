import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";

/** Header action that opens the route creator. Shown in every page header,
 *  always immediately to the left of the theme toggle. */
export function NewRouteButton({ className }: { className?: string }) {
    return (
        <Button variant="outline" size="sm" asChild className={className}>
            <Link to="/app/route/new/edit">
                <Plus className="h-4 w-4" /> Nowa trasa
            </Link>
        </Button>
    );
}
