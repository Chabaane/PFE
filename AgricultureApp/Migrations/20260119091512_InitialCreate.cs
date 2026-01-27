using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Agriculteurs",
                columns: table => new
                {
                    IdAgriculteur = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Prenom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Telephone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Localisation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agriculteurs", x => x.IdAgriculteur);
                });

            migrationBuilder.CreateTable(
                name: "DonneesLocales",
                columns: table => new
                {
                    IdLocal = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeObjet = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ContenuJSON = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Etat = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateSynchronisation = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeviceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonneesLocales", x => x.IdLocal);
                });

            migrationBuilder.CreateTable(
                name: "ImagesSatellite",
                columns: table => new
                {
                    IdImage = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateCapture = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TypeImage = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UrlImage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Source = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Resolution = table.Column<double>(type: "float", nullable: true),
                    MetadataJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DateImport = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImagesSatellite", x => x.IdImage);
                });

            migrationBuilder.CreateTable(
                name: "StationsMeteo",
                columns: table => new
                {
                    IdStation = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TypeStation = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Fournisseur = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Localisation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StationsMeteo", x => x.IdStation);
                });

            migrationBuilder.CreateTable(
                name: "Utilisateurs",
                columns: table => new
                {
                    IdUtilisateur = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MotDePasseHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DateInscription = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Utilisateurs", x => x.IdUtilisateur);
                });

            migrationBuilder.CreateTable(
                name: "Parcelles",
                columns: table => new
                {
                    IdParcelle = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ContourJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Superficie = table.Column<double>(type: "float", nullable: true),
                    AltitudeMoyenne = table.Column<double>(type: "float", nullable: true),
                    PenteMoyenne = table.Column<double>(type: "float", nullable: true),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETDATE()"),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EtatSynchronisation = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AgriculteurId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parcelles", x => x.IdParcelle);
                    table.ForeignKey(
                        name: "FK_Parcelles_Agriculteurs_AgriculteurId",
                        column: x => x.AgriculteurId,
                        principalTable: "Agriculteurs",
                        principalColumn: "IdAgriculteur",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DonneesMeteo",
                columns: table => new
                {
                    IdDonnee = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateHeure = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Temperature = table.Column<double>(type: "float", nullable: false),
                    Humidite = table.Column<double>(type: "float", nullable: false),
                    Pression = table.Column<double>(type: "float", nullable: false),
                    VitesseVent = table.Column<double>(type: "float", nullable: false),
                    DirectionVent = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Pluviometrie = table.Column<double>(type: "float", nullable: false),
                    RayonnementSolaire = table.Column<double>(type: "float", nullable: false),
                    StationMeteoId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DonneesMeteo", x => x.IdDonnee);
                    table.ForeignKey(
                        name: "FK_DonneesMeteo_StationsMeteo_StationMeteoId",
                        column: x => x.StationMeteoId,
                        principalTable: "StationsMeteo",
                        principalColumn: "IdStation");
                });

            migrationBuilder.CreateTable(
                name: "Synchronisations",
                columns: table => new
                {
                    IdSync = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateSync = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NombreObjetsSync = table.Column<int>(type: "int", nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    UtilisateurId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Synchronisations", x => x.IdSync);
                    table.ForeignKey(
                        name: "FK_Synchronisations_Utilisateurs_UtilisateurId",
                        column: x => x.UtilisateurId,
                        principalTable: "Utilisateurs",
                        principalColumn: "IdUtilisateur");
                });

            migrationBuilder.CreateTable(
                name: "DiagnosticsAcriques",
                columns: table => new
                {
                    IdDiagnostic = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DateDiagnostic = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TypeStress = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NiveauRisque = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Commentaire = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ScoreConfiance = table.Column<double>(type: "float", nullable: true),
                    ParcelleId = table.Column<int>(type: "int", nullable: true),
                    ImageSatelliteId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticsAcriques", x => x.IdDiagnostic);
                    table.ForeignKey(
                        name: "FK_DiagnosticsAcriques_ImagesSatellite_ImageSatelliteId",
                        column: x => x.ImageSatelliteId,
                        principalTable: "ImagesSatellite",
                        principalColumn: "IdImage");
                    table.ForeignKey(
                        name: "FK_DiagnosticsAcriques_Parcelles_ParcelleId",
                        column: x => x.ParcelleId,
                        principalTable: "Parcelles",
                        principalColumn: "IdParcelle");
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticsAcriques_ImageSatelliteId",
                table: "DiagnosticsAcriques",
                column: "ImageSatelliteId");

            migrationBuilder.CreateIndex(
                name: "IX_DiagnosticsAcriques_ParcelleId",
                table: "DiagnosticsAcriques",
                column: "ParcelleId");

            migrationBuilder.CreateIndex(
                name: "IX_DonneesMeteo_DateHeure",
                table: "DonneesMeteo",
                column: "DateHeure");

            migrationBuilder.CreateIndex(
                name: "IX_DonneesMeteo_StationMeteoId",
                table: "DonneesMeteo",
                column: "StationMeteoId");

            migrationBuilder.CreateIndex(
                name: "IX_Parcelles_AgriculteurId",
                table: "Parcelles",
                column: "AgriculteurId");

            migrationBuilder.CreateIndex(
                name: "IX_Synchronisations_UtilisateurId",
                table: "Synchronisations",
                column: "UtilisateurId");

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateurs_Email",
                table: "Utilisateurs",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiagnosticsAcriques");

            migrationBuilder.DropTable(
                name: "DonneesLocales");

            migrationBuilder.DropTable(
                name: "DonneesMeteo");

            migrationBuilder.DropTable(
                name: "Synchronisations");

            migrationBuilder.DropTable(
                name: "ImagesSatellite");

            migrationBuilder.DropTable(
                name: "Parcelles");

            migrationBuilder.DropTable(
                name: "StationsMeteo");

            migrationBuilder.DropTable(
                name: "Utilisateurs");

            migrationBuilder.DropTable(
                name: "Agriculteurs");
        }
    }
}
