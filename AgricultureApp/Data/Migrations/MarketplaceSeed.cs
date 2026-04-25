// Data/Migrations/MarketplaceSeed.cs
// Données initiales pour la marketplace — médicaments agricoles tunisiens
using AgricultureApp.Data;


using AgricultureApp.Models.Entities;

namespace AgricultureApp.Data.Migrations
{
    public static class MarketplaceSeed
    {
        public static void SeedProduits(ApplicationDbContext context)
        {
            if (context.Produits.Any()) return;

            var produits = new List<Produit>
            {
                // ?? Fongicides ?????????????????????????????????????????????
                new Produit
                {
                    Nom = "Score 250 EC",
                    Description = "Fongicide systémique à base de difénoconazole. Efficace contre la tavelure, l'oïdium et les maladies foliaires sur nombreuses cultures. Action curative et préventive.",
                    Categorie = "Fongicide",
                    Prix = 45.90m,
                    Unite = "L",
                    StockDisponible = 120,
                    Fabricant = "Syngenta",
                    NumeroAMM = "AMM-TN-2021-F001",
                    MatieresActives = "Difénoconazole 250 g/L",
                    CulturesCompatibles = "Blé, Orge, Tomate, Vigne, Olivier",
                    NoteMoyenne = 4.6,
                    NombreAvis = 28,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Bordeaux Mixture WG",
                    Description = "Fongicide de contact à base de sulfate de cuivre. Protection polyvalente contre les maladies fongiques et bactériennes. Autorisé en agriculture biologique.",
                    Categorie = "Fongicide",
                    Prix = 18.50m,
                    Unite = "Kg",
                    StockDisponible = 200,
                    Fabricant = "Isagro",
                    NumeroAMM = "AMM-TN-2019-F012",
                    MatieresActives = "Cuivre 200 g/Kg",
                    CulturesCompatibles = "Vigne, Pomme de terre, Tomate, Olivier, Agrumes",
                    NoteMoyenne = 4.2,
                    NombreAvis = 45,
                    EstActif = true,
                    EstEnPromotion = true,
                    PrixPromo = 14.90m,
                    ImageUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Topsin M 70 WP",
                    Description = "Fongicide systémique à large spectre. Agit par inhibition de la biosynthèse de l'ergostérol. Excellent pour la lutte contre la pourriture grise et les oïdiums.",
                    Categorie = "Fongicide",
                    Prix = 32.00m,
                    Unite = "Kg",
                    StockDisponible = 85,
                    Fabricant = "Nippon Soda",
                    NumeroAMM = "AMM-TN-2020-F008",
                    MatieresActives = "Thiophanate-méthyl 700 g/Kg",
                    CulturesCompatibles = "Fraise, Vigne, Colza, Céréales",
                    NoteMoyenne = 4.4,
                    NombreAvis = 19,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Switch 62.5 WG",
                    Description = "Fongicide combiné cyprodinil + fludioxonil. Action préventive et curative remarquable contre la pourriture grise (Botrytis). Haute efficacité en conditions humides.",
                    Categorie = "Fongicide",
                    Prix = 78.00m,
                    Unite = "Kg",
                    StockDisponible = 42,
                    Fabricant = "Syngenta",
                    NumeroAMM = "AMM-TN-2022-F015",
                    MatieresActives = "Cyprodinil 375 g/Kg + Fludioxonil 250 g/Kg",
                    CulturesCompatibles = "Vigne, Fraise, Tomate, Poivron",
                    NoteMoyenne = 4.8,
                    NombreAvis = 36,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },

                // ?? Insecticides ????????????????????????????????????????????
                new Produit
                {
                    Nom = "Karate Zeon 5 CS",
                    Description = "Insecticide pyréthrinoïde à action rapide. Efficace contre les pucerons, thrips, acariens et lépidoptères. Formulation microencapsulée pour une durée d'action prolongée.",
                    Categorie = "Insecticide",
                    Prix = 38.50m,
                    Unite = "L",
                    StockDisponible = 95,
                    Fabricant = "Syngenta",
                    NumeroAMM = "AMM-TN-2021-I003",
                    MatieresActives = "Lambda-cyhalothrine 50 g/L",
                    CulturesCompatibles = "Tomate, Pomme de terre, Coton, Céréales, Agrumes",
                    NoteMoyenne = 4.5,
                    NombreAvis = 52,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Confidor 200 OD",
                    Description = "Insecticide systémique à base d'imidaclopride. Action choc sur les insectes piqueurs-suceurs. Absorption rapide par les feuilles et excellent effet systémique.",
                    Categorie = "Insecticide",
                    Prix = 55.00m,
                    Unite = "L",
                    StockDisponible = 60,
                    Fabricant = "Bayer",
                    NumeroAMM = "AMM-TN-2020-I007",
                    MatieresActives = "Imidaclopride 200 g/L",
                    CulturesCompatibles = "Agrumes, Olivier, Maraîchage, Cereales",
                    NoteMoyenne = 4.7,
                    NombreAvis = 41,
                    EstActif = true,
                    EstEnPromotion = true,
                    PrixPromo = 46.99m,
                    ImageUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Spintor 480 SC",
                    Description = "Insecticide biologique à base de spinosad. Très efficace contre les thrips, les mineuses et les lépidoptères. Faible impact sur les insectes auxiliaires et les abeilles.",
                    Categorie = "Insecticide",
                    Prix = 82.00m,
                    Unite = "L",
                    StockDisponible = 30,
                    Fabricant = "Dow AgroSciences",
                    NumeroAMM = "AMM-TN-2023-I019",
                    MatieresActives = "Spinosad 480 g/L",
                    CulturesCompatibles = "Tomate, Poivron, Agrumes, Vigne",
                    NoteMoyenne = 4.9,
                    NombreAvis = 23,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Actara 25 WG",
                    Description = "Insecticide systémique thiamethoxam. Action rapide et longue durée. Protège contre les pucerons, aleurodes, cicadelles et autres insectes suceurs.",
                    Categorie = "Insecticide",
                    Prix = 62.50m,
                    Unite = "Kg",
                    StockDisponible = 4,
                    Fabricant = "Syngenta",
                    NumeroAMM = "AMM-TN-2019-I011",
                    MatieresActives = "Thiamethoxam 250 g/Kg",
                    CulturesCompatibles = "Tomate, Concombre, Courgette, Poivron",
                    NoteMoyenne = 4.3,
                    NombreAvis = 17,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"
                },

                // ?? Herbicides ?????????????????????????????????????????????
                new Produit
                {
                    Nom = "Roundup 360 SL",
                    Description = "Herbicide total non sélectif à base de glyphosate. Élimine efficacement toutes les adventices vivaces et annuelles. Action systémique jusqu'aux racines.",
                    Categorie = "Herbicide",
                    Prix = 22.00m,
                    Unite = "L",
                    StockDisponible = 180,
                    Fabricant = "Bayer",
                    NumeroAMM = "AMM-TN-2018-H002",
                    MatieresActives = "Glyphosate 360 g/L",
                    CulturesCompatibles = "Utilisation en inter-rangs — toutes cultures",
                    NoteMoyenne = 4.1,
                    NombreAvis = 67,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Stomp Aqua",
                    Description = "Herbicide sélectif de pré-levée à base de pendiméthaline. Contrôle les graminées et dicotylédones annuelles dans les cultures légumières et maraîchères.",
                    Categorie = "Herbicide",
                    Prix = 34.00m,
                    Unite = "L",
                    StockDisponible = 70,
                    Fabricant = "BASF",
                    NumeroAMM = "AMM-TN-2020-H009",
                    MatieresActives = "Pendiméthaline 455 g/L",
                    CulturesCompatibles = "Oignon, Ail, Carotte, Poireau, Tournesol",
                    NoteMoyenne = 4.0,
                    NombreAvis = 14,
                    EstActif = true,
                    EstEnPromotion = true,
                    PrixPromo = 28.50m,
                    ImageUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                },

                // ?? Engrais ????????????????????????????????????????????????
                new Produit
                {
                    Nom = "Nitrate d'Ammonium 33.5%",
                    Description = "Engrais azoté à action rapide. Idéal pour la couverture en végétation. Granulés homogènes faciles à épandre. Augmente significativement les rendements céréaliers.",
                    Categorie = "Engrais",
                    Prix = 890.00m,
                    Unite = "Kg",
                    StockDisponible = 50,
                    Fabricant = "GCT Tunisie",
                    NumeroAMM = "AMM-TN-2021-E001",
                    MatieresActives = "N 33.5%",
                    CulturesCompatibles = "Céréales, Maraîchage, Fourrages",
                    NoteMoyenne = 4.5,
                    NombreAvis = 89,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Fertigation NPK 20-20-20",
                    Description = "Engrais hydrosoluble complet équilibré pour la fertigation et les traitements foliaires. Enrichi en oligo-éléments chélatés pour une nutrition optimale.",
                    Categorie = "Engrais",
                    Prix = 48.00m,
                    Unite = "Kg",
                    StockDisponible = 150,
                    Fabricant = "Haifa Group",
                    NumeroAMM = "AMM-TN-2022-E008",
                    MatieresActives = "N 20% + P2O5 20% + K2O 20%",
                    CulturesCompatibles = "Maraîchage, Fruitiers, Serre, Hors-sol",
                    NoteMoyenne = 4.7,
                    NombreAvis = 34,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Humate de Potassium Bio",
                    Description = "Stimulateur racinaire organique à base d'acides humiques et fulviques. Améliore la structure du sol, la rétention hydrique et la disponibilité des éléments nutritifs.",
                    Categorie = "Engrais",
                    Prix = 65.00m,
                    Unite = "L",
                    StockDisponible = 0,
                    Fabricant = "Agricomsa",
                    NumeroAMM = "AMM-TN-2023-E014",
                    MatieresActives = "Acides humiques 12% + Acides fulviques 3%",
                    CulturesCompatibles = "Toutes cultures",
                    NoteMoyenne = 4.6,
                    NombreAvis = 21,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },

                // ?? Acaricides ?????????????????????????????????????????????
                new Produit
                {
                    Nom = "Vertimec 1.8 EC",
                    Description = "Acaricide et insecticide à base d'abamectine. Très efficace contre les acariens tétranyques et les mineuses. Action de choc avec effet ovicide.",
                    Categorie = "Acaricide",
                    Prix = 92.00m,
                    Unite = "L",
                    StockDisponible = 25,
                    Fabricant = "Syngenta",
                    NumeroAMM = "AMM-TN-2020-A003",
                    MatieresActives = "Abamectine 18 g/L",
                    CulturesCompatibles = "Tomate, Poivron, Aubergine, Concombre, Vigne",
                    NoteMoyenne = 4.8,
                    NombreAvis = 30,
                    EstActif = true,
                    EstEnPromotion = true,
                    PrixPromo = 79.00m,
                    ImageUrl = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80"
                },
                new Produit
                {
                    Nom = "Envidor 240 SC",
                    Description = "Acaricide spécifique à base de spirodiclofen. Agit sur tous les stades de développement des acariens. Longue persistance d'action sans résistance croisée.",
                    Categorie = "Acaricide",
                    Prix = 125.00m,
                    Unite = "L",
                    StockDisponible = 18,
                    Fabricant = "Bayer",
                    NumeroAMM = "AMM-TN-2021-A007",
                    MatieresActives = "Spirodiclofen 240 g/L",
                    CulturesCompatibles = "Agrumes, Pommier, Vigne, Fraise",
                    NoteMoyenne = 4.5,
                    NombreAvis = 12,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80"
                },

                // ?? Régulateur de croissance ???????????????????????????????
                new Produit
                {
                    Nom = "Ethrel 480 SL",
                    Description = "Régulateur de croissance à base d'éthéphon. Accélère la maturation des fruits, améliore la coloration et favorise le débourrement. Utilisé en fruiticulture et viticulture.",
                    Categorie = "Régulateur de croissance",
                    Prix = 41.00m,
                    Unite = "L",
                    StockDisponible = 55,
                    Fabricant = "Bayer",
                    NumeroAMM = "AMM-TN-2019-R002",
                    MatieresActives = "Éthéphon 480 g/L",
                    CulturesCompatibles = "Tomate, Poivron, Vigne, Pommier, Cerisier",
                    NoteMoyenne = 4.2,
                    NombreAvis = 26,
                    EstActif = true,
                    ImageUrl = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400&q=80"
                }
            };

            context.Produits.AddRange(produits);
            context.SaveChanges();
            Console.WriteLine($"? {produits.Count} produits marketplace insérés avec succès.");
        }
    }
}