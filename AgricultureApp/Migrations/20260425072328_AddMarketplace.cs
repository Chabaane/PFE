using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketplace : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Commandes",
                columns: table => new
                {
                    IdCommande = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NumeroCommande = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IdAgriculteur = table.Column<int>(type: "int", nullable: true),
                    IdUtilisateur = table.Column<int>(type: "int", nullable: true),
                    NomClient = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EmailClient = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TelephoneClient = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AdresseLivraison = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    VilleLivraison = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GouvernoratLivraison = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CodePostalLivraison = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SousTotal = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    FraisLivraison = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Total = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ModePaiement = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NotesCommande = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateCommande = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateLivraison = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateExpedition = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Commandes", x => x.IdCommande);
                });

            migrationBuilder.CreateTable(
                name: "Paniers",
                columns: table => new
                {
                    IdPanier = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdUtilisateur = table.Column<int>(type: "int", nullable: true),
                    SessionId = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateMaj = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Paniers", x => x.IdPanier);
                });

            migrationBuilder.CreateTable(
                name: "Produits",
                columns: table => new
                {
                    IdProduit = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Categorie = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Prix = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Unite = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StockDisponible = table.Column<int>(type: "int", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Fabricant = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NumeroAMM = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CulturesCompatibles = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MatieresActives = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NoteMoyenne = table.Column<double>(type: "float", nullable: false),
                    NombreAvis = table.Column<int>(type: "int", nullable: false),
                    EstActif = table.Column<bool>(type: "bit", nullable: false),
                    EstEnPromotion = table.Column<bool>(type: "bit", nullable: false),
                    PrixPromo = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    DateAjout = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Produits", x => x.IdProduit);
                });

            migrationBuilder.CreateTable(
                name: "AvisProduits",
                columns: table => new
                {
                    IdAvis = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdProduit = table.Column<int>(type: "int", nullable: false),
                    IdUtilisateur = table.Column<int>(type: "int", nullable: true),
                    NomAuteur = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<int>(type: "int", nullable: false),
                    Commentaire = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Verifie = table.Column<bool>(type: "bit", nullable: false),
                    DateAvis = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AvisProduits", x => x.IdAvis);
                    table.ForeignKey(
                        name: "FK_AvisProduits_Produits_IdProduit",
                        column: x => x.IdProduit,
                        principalTable: "Produits",
                        principalColumn: "IdProduit",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LignesCommande",
                columns: table => new
                {
                    IdLigneCommande = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdCommande = table.Column<int>(type: "int", nullable: false),
                    IdProduit = table.Column<int>(type: "int", nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    PrixUnitaire = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    SousTotal = table.Column<decimal>(type: "decimal(10,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LignesCommande", x => x.IdLigneCommande);
                    table.ForeignKey(
                        name: "FK_LignesCommande_Commandes_IdCommande",
                        column: x => x.IdCommande,
                        principalTable: "Commandes",
                        principalColumn: "IdCommande",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LignesCommande_Produits_IdProduit",
                        column: x => x.IdProduit,
                        principalTable: "Produits",
                        principalColumn: "IdProduit",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LignesPanier",
                columns: table => new
                {
                    IdLignePanier = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdPanier = table.Column<int>(type: "int", nullable: false),
                    IdProduit = table.Column<int>(type: "int", nullable: false),
                    Quantite = table.Column<int>(type: "int", nullable: false),
                    DateAjout = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LignesPanier", x => x.IdLignePanier);
                    table.ForeignKey(
                        name: "FK_LignesPanier_Paniers_IdPanier",
                        column: x => x.IdPanier,
                        principalTable: "Paniers",
                        principalColumn: "IdPanier",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LignesPanier_Produits_IdProduit",
                        column: x => x.IdProduit,
                        principalTable: "Produits",
                        principalColumn: "IdProduit",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AvisProduits_IdProduit",
                table: "AvisProduits",
                column: "IdProduit");

            migrationBuilder.CreateIndex(
                name: "IX_Commandes_NumeroCommande",
                table: "Commandes",
                column: "NumeroCommande",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LignesCommande_IdCommande",
                table: "LignesCommande",
                column: "IdCommande");

            migrationBuilder.CreateIndex(
                name: "IX_LignesCommande_IdProduit",
                table: "LignesCommande",
                column: "IdProduit");

            migrationBuilder.CreateIndex(
                name: "IX_LignesPanier_IdPanier",
                table: "LignesPanier",
                column: "IdPanier");

            migrationBuilder.CreateIndex(
                name: "IX_LignesPanier_IdProduit",
                table: "LignesPanier",
                column: "IdProduit");

            migrationBuilder.CreateIndex(
                name: "IX_Paniers_IdUtilisateur",
                table: "Paniers",
                column: "IdUtilisateur");

            migrationBuilder.CreateIndex(
                name: "IX_Paniers_SessionId",
                table: "Paniers",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Produits_Categorie",
                table: "Produits",
                column: "Categorie");

            migrationBuilder.CreateIndex(
                name: "IX_Produits_EstActif",
                table: "Produits",
                column: "EstActif");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AvisProduits");

            migrationBuilder.DropTable(
                name: "LignesCommande");

            migrationBuilder.DropTable(
                name: "LignesPanier");

            migrationBuilder.DropTable(
                name: "Commandes");

            migrationBuilder.DropTable(
                name: "Paniers");

            migrationBuilder.DropTable(
                name: "Produits");
        }
    }
}
