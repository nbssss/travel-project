import { routeTracks } from "./routeTracks";

export type POI = {
  id: string;
  name: string;
  kind: "start" | "end" | "viewpoint" | "shelter" | "summit" | "lake" | "waypoint";
  coords: [number, number]; // [lat, lng]
  note?: string;
  elevation?: number;
};

export type Route = {
  id: string;
  slug: string;
  title: string;
  region: string;
  country: string;
  difficulty: "easy" | "moderate" | "hard";
  distanceKm: number;
  ascentM: number;
  durationH: number;
  description: string;
  author: { name: string; initials: string };
  isPublic: boolean;
  updatedAt: string;
  path: [number, number][];
  pois: POI[];
  tags: string[];
};

// Pętla — startuje i kończy się w tym samym miejscu (Zakopane, u wylotu Doliny Białego).
// Jedyna „przykładowa" trasa, jaka została — prezentowana jako „trasa dnia" na ekranie logowania.
const petlaBialegoStrazyska: Route = {
  id: "r4",
  slug: "petla-bialego-strazyska",
  title: "Pętla: Doliną Białego i Strążyską",
  region: "Tatry Zachodnie",
  country: "Polska",
  difficulty: "easy",
  distanceKm: 6.3,
  ascentM: 140,
  durationH: 2.3,
  description:
    "Spokojna pętla u podnóża Tatr — w górę Doliną Białego, grzbietem nad doliny i z powrotem Doliną Strążyską. Zaczyna i kończy się w tym samym miejscu, idealna na popołudnie.",
  author: { name: "Natalia B.", initials: "NB" },
  isPublic: true,
  updatedAt: "2026-04-14",
  tags: ["pętla", "rodzinna", "łatwa"],
  path: routeTracks["petla-bialego-strazyska"],
  pois: [
    { id: "pb1", name: "Zakopane — wylot Doliny Białego", kind: "start", coords: [49.28785, 19.96457], elevation: 875, note: "Start i meta pętli." },
    { id: "pb2", name: "Dolina Białego", kind: "viewpoint", coords: [49.27938, 19.96058], elevation: 905 },
    { id: "pb3", name: "Grzbiet między dolinami", kind: "waypoint", coords: [49.28401, 19.94198], elevation: 925, note: "Najwyższy punkt pętli." },
    { id: "pb4", name: "Polana Strążyska", kind: "viewpoint", coords: [49.2887, 19.948], elevation: 885 },
  ],
};

/** Pętla prezentowana jako „trasa dnia" na ekranie logowania/rejestracji. */
export const routeOfTheDay = petlaBialegoStrazyska;

/** Polish labels for POI kinds — shared by the map popups and the route detail list. */
export const poiKindLabel: Record<POI["kind"], string> = {
  start: "Start",
  end: "Meta",
  viewpoint: "Punkt widokowy",
  shelter: "Schronisko",
  summit: "Szczyt",
  lake: "Jezioro",
  waypoint: "Punkt",
};
