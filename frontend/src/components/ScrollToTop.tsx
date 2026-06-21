import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Resets scroll to the top whenever the route (pathname) changes.
 *  Hash-only changes (e.g. #features anchors) are left untouched. */
export function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}
