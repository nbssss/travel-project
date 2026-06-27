using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TravelProject.Models;
using Route = TravelProject.Models.Route;

namespace TravelProject.Data
{
    // Do demo
    public static class DemoDataSeeder
    {
        private const string DemoPassword = "Demo1234!";

        public static async Task SeedAsync(IServiceProvider services)
        {
            var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DemoDataSeeder");

            try
            {
                var db = services.GetRequiredService<ApplicationDbContext>();
                var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

                // 1) Autorzy demo — po jednym na kategorię (Identity = poprawne hashowanie hasła).
                var authorsSpec = new[]
                {
                    (Key: "mountain", UserName: "kasia.gorska",     Email: "kasia.gorska@travelroutes.local"),
                    (Key: "city",     UserName: "tomek.miejski",    Email: "tomek.miejski@travelroutes.local"),
                    (Key: "sea",      UserName: "ola.morska",       Email: "ola.morska@travelroutes.local"),
                    (Key: "abroad",   UserName: "marek.globtroter", Email: "marek.globtroter@travelroutes.local"),
                };

                var authorIds = new Dictionary<string, string>();
                foreach (var a in authorsSpec)
                {
                    var user = await userManager.FindByNameAsync(a.UserName);
                    if (user is null)
                    {
                        user = new ApplicationUser { UserName = a.UserName, Email = a.Email, EmailConfirmed = true };
                        var result = await userManager.CreateAsync(user, DemoPassword);
                        if (!result.Succeeded)
                        {
                            logger.LogWarning("Demo seed: nie udało się utworzyć autora {User}: {Errors}",
                                a.UserName, string.Join("; ", result.Errors.Select(e => e.Description)));
                            return;
                        }
                    }
                    authorIds[a.Key] = user.Id;
                }

                // 2) Idempotencja — jeśli ci autorzy mają już trasy, nie dubluj.
                var ids = authorIds.Values.ToList();
                if (await db.Routes.AnyAsync(r => ids.Contains(r.OwnerId)))
                {
                    logger.LogInformation("Demo seed: trasy demo już istnieją — pomijam.");
                    return;
                }

                // 3) Trasy — naprzemienna kolejność kategorii, by paginacja pokazała mix na obu stronach
                //    (strona 1 = 12 = po 3 z każdej kategorii, strona 2 = 4 = po 1 z każdej).
                var baseTime = DateTime.UtcNow;
                var routes = new List<Route>();
                var order = 0;
                for (var i = 0; i < 4; i++)
                {
                    routes.Add(BuildRoute(Mountain[i], authorIds["mountain"], baseTime.AddMinutes(-order++ * 7)));
                    routes.Add(BuildRoute(City[i],     authorIds["city"],     baseTime.AddMinutes(-order++ * 7)));
                    routes.Add(BuildRoute(Sea[i],      authorIds["sea"],      baseTime.AddMinutes(-order++ * 7)));
                    routes.Add(BuildRoute(Abroad[i],   authorIds["abroad"],   baseTime.AddMinutes(-order++ * 7)));
                }

                // 4) Trochę polubień (1–3 na trasę, od autorów innych niż właściciel), żeby karty
                //    nie miały wszędzie „0 serc".
                var likes = new List<RouteLike>();
                for (var i = 0; i < routes.Count; i++)
                {
                    var route = routes[i];
                    var likers = ids.Where(id => id != route.OwnerId).Take((i % 3) + 1);
                    foreach (var likerId in likers)
                        likes.Add(new RouteLike
                        {
                            Id = Guid.NewGuid(),
                            RouteId = route.Id,
                            UserId = likerId,
                            CreatedAt = route.CreatedAt,
                        });
                }

                db.Routes.AddRange(routes);
                db.RouteLikes.AddRange(likes);
                await db.SaveChangesAsync();

                logger.LogInformation("Demo seed: dodano {Routes} tras i {Likes} polubień.", routes.Count, likes.Count);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Demo seed: błąd podczas seedowania danych demonstracyjnych.");
            }
        }

        private static Route BuildRoute(RouteSeed s, string ownerId, DateTime createdAt)
        {
            var id = Guid.NewGuid();
            return new Route
            {
                Id = id,
                Title = s.Title,
                Slug = s.Slug,
                Description = s.Description,
                Region = s.Region,
                Country = s.Country,
                Difficulty = s.Difficulty,
                IsPublic = true,
                Tags = [.. s.Tags],
                DistanceKm = s.DistanceKm,
                AscentM = s.AscentM,
                DescentM = s.DescentM,
                DurationH = s.DurationH,
                OwnerId = ownerId,
                CreatedAt = createdAt,
                UpdatedAt = createdAt,
                Points = [.. s.Points.Select((p, i) => new RoutePoint
                {
                    Id = Guid.NewGuid(),
                    RouteId = id,
                    Order = i,
                    Lat = p.Lat,
                    Lng = p.Lng,
                    Elevation = p.Ele,
                    Kind = p.Kind,
                    Name = p.Name,
                })],
            };
        }

        private sealed record RouteSeed(
            string Title,
            string Slug,
            string Description,
            string Region,
            string Country,
            string Difficulty,
            string[] Tags,
            double DistanceKm,
            int AscentM,
            int DescentM,
            double DurationH,
            (double Lat, double Lng, double Ele, string Kind, string Name)[] Points);

        // --- Dane: GÓRY -------------------------------------------------------
        private static readonly RouteSeed[] Mountain =
        [
            new("Rysy przez Morskie Oko", "rysy-przez-morskie-oko",
                "Klasyka polskich Tatr — od Morskiego Oka przez Czarny Staw na najwyższy szczyt Polski. Wymagająca całodniowa wyprawa z łańcuchami.",
                "Tatry", "Polska", "hard", ["góry", "tatry", "szczyt"],
                12.6, 1010, 1010, 8.0,
                [
                    (49.2741, 20.0860, 985,  "start",     "Palenica Białczańska"),
                    (49.2010, 20.0703, 1395, "lake",      "Morskie Oko"),
                    (49.1900, 20.0790, 1583, "lake",      "Czarny Staw pod Rysami"),
                    (49.1795, 20.0883, 2499, "summit",    "Rysy"),
                ]),
            new("Giewont z Kuźnic", "giewont-z-kuznic",
                "Najbardziej rozpoznawalny szczyt nad Zakopanem. Przez Halę Kondratową i Przełęcz Kondracką na szczyt z krzyżem.",
                "Tatry", "Polska", "moderate", ["góry", "tatry", "widoki"],
                11.2, 935, 935, 5.5,
                [
                    (49.2700, 19.9826, 1010, "start",     "Kuźnice"),
                    (49.2566, 19.9646, 1333, "shelter",   "Schronisko na Hali Kondratowej"),
                    (49.2487, 19.9440, 1725, "waypoint",  "Przełęcz Kondracka"),
                    (49.2511, 19.9325, 1894, "summit",    "Giewont"),
                ]),
            new("Babia Góra – Diablak", "babia-gora-diablak",
                "Królowa Beskidów. Z Przełęczy Krowiarki granią przez Sokolicę na Diablak — najwyższy szczyt Beskidów Zachodnich.",
                "Beskid Żywiecki", "Polska", "moderate", ["góry", "beskidy", "grań"],
                9.4, 715, 715, 4.5,
                [
                    (49.5870, 19.5470, 1009, "start",     "Przełęcz Krowiarki"),
                    (49.5800, 19.5360, 1367, "viewpoint", "Sokolica"),
                    (49.5731, 19.5294, 1725, "summit",    "Diablak (Babia Góra)"),
                ]),
            new("Śnieżka z Karpacza", "sniezka-z-karpacza",
                "Najwyższy szczyt Karkonoszy i Sudetów. Z Karpacza obok Samotni i przez Kopę na szczyt z obserwatorium.",
                "Karkonosze", "Polska", "moderate", ["góry", "sudety", "szczyt"],
                13.1, 905, 905, 5.5,
                [
                    (50.7785, 15.7490, 790,  "start",     "Karpacz – Biały Jar"),
                    (50.7560, 15.7250, 1195, "shelter",   "Schronisko Samotnia"),
                    (50.7430, 15.7340, 1377, "waypoint",  "Kopa"),
                    (50.7361, 15.7400, 1603, "summit",    "Śnieżka"),
                ]),
        ];

        // --- Dane: MIASTO -----------------------------------------------------
        private static readonly RouteSeed[] City =
        [
            new("Kraków – pętla Plant i Wawel", "krakow-planty-i-wawel",
                "Spacer po sercu Krakowa: Rynek Główny, Brama Floriańska, Wzgórze Wawelskie i bulwary nad Wisłą, z metą na Kazimierzu.",
                "Małopolskie", "Polska", "easy", ["miasto", "spacer", "zwiedzanie"],
                5.4, 35, 35, 1.5,
                [
                    (50.0617, 19.9373, 219, "start",     "Rynek Główny"),
                    (50.0651, 19.9415, 217, "waypoint",  "Brama Floriańska"),
                    (50.0541, 19.9352, 228, "viewpoint", "Wzgórze Wawelskie"),
                    (50.0506, 19.9370, 205, "viewpoint", "Bulwary Wiślane"),
                    (50.0490, 19.9445, 210, "end",       "Kazimierz"),
                ]),
            new("Warszawa – Trakt Królewski", "warszawa-trakt-krolewski",
                "Reprezentacyjny szlak stolicy: od Zamku Królewskiego Krakowskim Przedmieściem i Nowym Światem aż do Łazienek.",
                "Mazowieckie", "Polska", "easy", ["miasto", "spacer", "zwiedzanie"],
                6.1, 30, 30, 1.7,
                [
                    (52.2479, 21.0137, 108, "start",     "Zamek Królewski"),
                    (52.2410, 21.0160, 110, "waypoint",  "Krakowskie Przedmieście"),
                    (52.2330, 21.0190, 112, "waypoint",  "Nowy Świat"),
                    (52.2155, 21.0335, 110, "end",       "Łazienki Królewskie"),
                ]),
            new("Wrocław – Stare Miasto i Ostrów Tumski", "wroclaw-ostrow-tumski",
                "Od wrocławskiego Rynku przez Halę Targową na najstarszą część miasta — Ostrów Tumski z katedrą i latarnikiem.",
                "Dolnośląskie", "Polska", "easy", ["miasto", "spacer", "zwiedzanie"],
                4.6, 20, 20, 1.3,
                [
                    (51.1100, 17.0314, 118, "start",     "Rynek we Wrocławiu"),
                    (51.1140, 17.0405, 116, "waypoint",  "Hala Targowa"),
                    (51.1148, 17.0460, 119, "viewpoint", "Ostrów Tumski"),
                    (51.1135, 17.0445, 115, "end",       "Most Tumski"),
                ]),
            new("Gdańsk – Główne Miasto", "gdansk-glowne-miasto",
                "Najpiękniejsza pierzeja Bałtyku: Złota Brama, Długi Targ, Żuraw nad Motławą i klimatyczna Wyspa Spichrzów.",
                "Pomorskie", "Polska", "easy", ["miasto", "spacer", "nadmorskie"],
                3.9, 12, 12, 1.2,
                [
                    (54.3489, 18.6470, 5, "start",     "Złota Brama"),
                    (54.3486, 18.6536, 4, "waypoint",  "Długi Targ"),
                    (54.3505, 18.6571, 3, "viewpoint", "Żuraw nad Motławą"),
                    (54.3470, 18.6560, 3, "end",       "Wyspa Spichrzów"),
                ]),
        ];

        // --- Dane: MORZE ------------------------------------------------------
        private static readonly RouteSeed[] Sea =
        [
            new("Klif Orłowo – Gdynia", "klif-orlowo-gdynia",
                "Krótki, ale efektowny spacer brzegiem morza: molo w Orłowie, stromy Klif Orłowski i dzika plaża u jego stóp.",
                "Pomorskie", "Polska", "easy", ["morze", "klif", "spacer"],
                5.2, 65, 65, 1.5,
                [
                    (54.4832, 18.5655, 2,  "start",     "Molo w Orłowie"),
                    (54.4865, 18.5625, 38, "viewpoint", "Klif Orłowski"),
                    (54.4885, 18.5640, 2,  "end",       "Plaża Orłowo"),
                ]),
            new("Półwysep Helski – z Helu do Juraty", "polwysep-helski-hel-jurata",
                "Wędrówka mierzeją wśród sosen i wydm, z morzem po obu stronach — od Helu nadmorskim szlakiem do kameralnej Juraty.",
                "Pomorskie", "Polska", "easy", ["morze", "mierzeja", "plaża"],
                11.8, 25, 25, 3.0,
                [
                    (54.6082, 18.8010, 3, "start",    "Hel"),
                    (54.6450, 18.7350, 5, "waypoint", "Mierzeja Helska"),
                    (54.6770, 18.6650, 3, "end",      "Jurata"),
                ]),
            new("Wybrzeże Wolińskie – Międzyzdroje", "wolin-miedzyzdroje-klif",
                "Promenadą w Międzyzdrojach na Kawczą Górę i dalej klifowym brzegiem Wolińskiego Parku Narodowego do Wisełki.",
                "Zachodniopomorskie", "Polska", "moderate", ["morze", "klif", "park narodowy"],
                8.3, 185, 185, 2.5,
                [
                    (53.9280, 14.4480, 3,  "start",     "Promenada w Międzyzdrojach"),
                    (53.9320, 14.4600, 61, "viewpoint", "Kawcza Góra"),
                    (53.9400, 14.4900, 40, "viewpoint", "Klif woliński"),
                    (53.9450, 14.5200, 20, "end",       "Wisełka"),
                ]),
            new("Latarnia Stilo i nadmorskie wydmy", "latarnia-stilo-wydmy",
                "Leśną drogą z Osetnika do zabytkowej latarni Stilo, a potem przez ruchome wydmy prosto na dziką bałtycką plażę.",
                "Pomorskie", "Polska", "easy", ["morze", "latarnia", "wydmy"],
                7.1, 40, 40, 2.0,
                [
                    (54.7900, 17.7350, 12, "start",     "Osetnik"),
                    (54.7920, 17.7520, 30, "viewpoint", "Latarnia Morska Stilo"),
                    (54.7980, 17.7600, 8,  "waypoint",  "Wydmy nadmorskie"),
                    (54.8010, 17.7550, 2,  "end",       "Plaża"),
                ]),
        ];

        // --- Dane: ZAGRANICA --------------------------------------------------
        private static readonly RouteSeed[] Abroad =
        [
            new("Tre Cime di Lavaredo – pętla", "tre-cime-di-lavaredo",
                "Najsłynniejsza pętla Dolomitów wokół trzech skalnych iglic. Od Rifugio Auronzo przez Forcella Lavaredo do Locatelli.",
                "Dolomity", "Włochy", "moderate", ["góry", "dolomity", "pętla"],
                10.2, 410, 410, 4.0,
                [
                    (46.6150, 12.2960, 2320, "start",     "Rifugio Auronzo"),
                    (46.6230, 12.3040, 2344, "shelter",   "Rifugio Lavaredo"),
                    (46.6260, 12.3070, 2454, "waypoint",  "Forcella Lavaredo"),
                    (46.6180, 12.3070, 2405, "viewpoint", "Rifugio Locatelli"),
                ]),
            new("Plitvička jezera – Wielka pętla", "plitvicka-jezera",
                "Szmaragdowe jeziora i wodospady Chorwacji. Drewnianymi kładkami obok Veliki slap i wzdłuż jeziora Kozjak.",
                "Lika-Senj", "Chorwacja", "easy", ["jeziora", "wodospady", "park narodowy"],
                8.6, 240, 240, 3.5,
                [
                    (44.9012, 15.6065, 503, "start",     "Ulaz 1"),
                    (44.9020, 15.5995, 505, "viewpoint", "Veliki slap"),
                    (44.8870, 15.6050, 535, "lake",      "Jezioro Kozjak"),
                    (44.8810, 15.6160, 580, "end",       "Ulaz 2"),
                ]),
            new("Jezioro Bled i wąwóz Vintgar", "bled-vintgar",
                "Pocztówkowa Słowenia: znad jeziora Bled do malowniczego wąwozu Vintgar z kładkami nad rzeką i wodospadem Šum.",
                "Górna Kraina", "Słowenia", "easy", ["jezioro", "wąwóz", "spacer"],
                9.2, 210, 210, 3.0,
                [
                    (46.3625, 14.0945, 501, "start",     "Jezioro Bled"),
                    (46.3930, 14.0850, 520, "waypoint",  "Wejście do wąwozu Vintgar"),
                    (46.3970, 14.0820, 540, "viewpoint", "Wąwóz Vintgar"),
                    (46.4010, 14.0790, 560, "end",       "Wodospad Šum"),
                ]),
            new("Dachstein – taras Five Fingers", "dachstein-five-fingers",
                "Kolejką na Krippenstein i lekkim szlakiem do platformy widokowej Five Fingers nad przepaścią — austriackie Alpy w pigułce.",
                "Górna Austria", "Austria", "moderate", ["góry", "alpy", "widoki"],
                6.4, 230, 230, 2.5,
                [
                    (47.5140, 13.6890, 2100, "start",     "Krippenstein"),
                    (47.5095, 13.6975, 1990, "viewpoint", "Five Fingers"),
                    (47.5110, 13.6940, 2050, "waypoint",  "Welterbespirale"),
                    (47.5150, 13.6900, 2080, "shelter",   "Lodge am Krippenstein"),
                ]),
        ];
    }
}
