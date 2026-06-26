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

const morskieOko: Route = {
  id: "r1",
  slug: "morskie-oko-rysy",
  title: "Morskie Oko → Rysy",
  region: "Tatry Wysokie",
  country: "Polska",
  difficulty: "hard",
  distanceKm: 22.4,
  ascentM: 1685,
  durationH: 9.5,
  description:
    "Klasyczna trasa na najwyższy szczyt polskich Tatr. Wariant przez Czarny Staw i wantę nad Morskim Okiem. Wymaga dobrej formy i pewnego stąpania.",
  author: { name: "Natalia B.", initials: "NB" },
  isPublic: true,
  updatedAt: "2026-04-12",
  tags: ["szczyt", "całodniowa", "expozycja"],
  path: routeTracks["morskie-oko-rysy"],
  pois: [
    { id: "p1", name: "Polana Palenica", kind: "start", coords: [49.2701, 20.0805], elevation: 980, note: "Parking, początek asfaltówki." },
    { id: "p2", name: "Włosienica", kind: "waypoint", coords: [49.2645, 20.0865], elevation: 1320 },
    { id: "p3", name: "Schronisko nad Morskim Okiem", kind: "shelter", coords: [49.2602, 20.0875], elevation: 1410, note: "Kawa, herbata, ostatnia woda." },
    { id: "p4", name: "Czarny Staw pod Rysami", kind: "lake", coords: [49.2486, 20.0820], elevation: 1583 },
    { id: "p5", name: "Bula pod Rysami", kind: "viewpoint", coords: [49.2418, 20.0884], elevation: 2070, note: "Zacięcie z łańcuchami — uważnie." },
    { id: "p6", name: "Rysy 2499 m", kind: "summit", coords: [49.2367, 20.0880], elevation: 2499, note: "Najwyższy szczyt Polski." },
  ],
};

const dolinaKoscieliska: Route = {
  id: "r2",
  slug: "dolina-koscieliska",
  title: "Doliną Kościeliską",
  region: "Tatry Zachodnie",
  country: "Polska",
  difficulty: "easy",
  distanceKm: 8.2,
  ascentM: 180,
  durationH: 2.5,
  description: "Spacer szeroką doliną wśród skał wapiennych. Idealny na rozgrzewkę lub z dziećmi.",
  author: { name: "Natalia B.", initials: "NB" },
  isPublic: true,
  updatedAt: "2026-04-10",
  tags: ["rodzinna", "łatwa", "dolina"],
  path: routeTracks["dolina-koscieliska"],
  pois: [
    { id: "k1", name: "Kiry — wejście", kind: "start", coords: [49.2767, 19.8732], elevation: 925 },
    { id: "k2", name: "Brama Kraszewskiego", kind: "viewpoint", coords: [49.2680, 19.8704], elevation: 980 },
    { id: "k3", name: "Polana Pisana", kind: "waypoint", coords: [49.2640, 19.8682], elevation: 1010 },
    { id: "k4", name: "Schronisko Ornak", kind: "shelter", coords: [49.2566, 19.8645], elevation: 1100, note: "Punkt zwrotny." },
  ],
};

const giewont: Route = {
  id: "r3",
  slug: "giewont-przez-kondracka",
  title: "Giewont przez Kondracką",
  region: "Tatry Zachodnie",
  country: "Polska",
  difficulty: "moderate",
  distanceKm: 15.6,
  ascentM: 1120,
  durationH: 6,
  description: "Symbol Zakopanego — śpiący rycerz. Końcowy odcinek z łańcuchami, unikać przy burzy.",
  author: { name: "Maciek K.", initials: "MK" },
  isPublic: true,
  updatedAt: "2026-03-30",
  tags: ["szczyt", "łańcuchy", "popularna"],
  path: routeTracks["giewont-przez-kondracka"],
  pois: [
    { id: "g1", name: "Kuźnice", kind: "start", coords: [49.2992, 19.9492], elevation: 1010 },
    { id: "g2", name: "Hala Kondratowa", kind: "shelter", coords: [49.2880, 19.9472], elevation: 1333 },
    { id: "g3", name: "Kondracka Przełęcz", kind: "waypoint", coords: [49.2772, 19.9438], elevation: 1725 },
    { id: "g4", name: "Giewont 1894 m", kind: "summit", coords: [49.2735, 19.9423], elevation: 1894, note: "Krzyż Giewontu." },
  ],
};

// Pętla — startuje i kończy się w tym samym miejscu (Zakopane, u wylotu Doliny Białego).
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

export const mockRoutes: Route[] = [morskieOko, dolinaKoscieliska, giewont, petlaBialegoStrazyska];

/** Pętla prezentowana jako „trasa dnia" na ekranie logowania/rejestracji. */
export const routeOfTheDay = petlaBialegoStrazyska;

export const getRoute = (slug: string) => mockRoutes.find(r => r.slug === slug);

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

/** Aggregate distance/ascent across a set of routes (defaults to all mock routes). */
export const getRouteTotals = (routes: Route[] = mockRoutes) => ({
  totalKm: routes.reduce((s, r) => s + r.distanceKm, 0),
  totalAscent: routes.reduce((s, r) => s + r.ascentM, 0),
});
