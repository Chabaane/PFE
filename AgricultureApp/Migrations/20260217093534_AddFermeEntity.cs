using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class AddFermeEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AltitudeMoyenne",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "ContourJson",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "PenteMoyenne",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Superficie",
                table: "Parcelles");

            migrationBuilder.RenameColumn(
                name: "EtatSynchronisation",
                table: "Parcelles",
                newName: "Couleur");

            migrationBuilder.RenameColumn(
                name: "IdParcelle",
                table: "Parcelles",
                newName: "Id");

            migrationBuilder.AlterColumn<string>(
                name: "Nom",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<string>(
                name: "Culture",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DatePlantation",
                table: "Parcelles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateRecolte",
                table: "Parcelles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Delegation",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DerniereSynchronisation",
                table: "Parcelles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EstSynchronise",
                table: "Parcelles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "FermeId",
                table: "Parcelles",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Geometrie",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Gouvernorat",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Parcelles",
                type: "decimal(18,15)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Parcelles",
                type: "decimal(18,15)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Secteur",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Surface",
                table: "Parcelles",
                type: "decimal(10,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "Fermes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AgriculteurId = table.Column<int>(type: "int", nullable: false),
                    Gouvernorat = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Delegation = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Secteur = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Couleur = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DateCreation = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateModification = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fermes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fermes_Agriculteurs_AgriculteurId",
                        column: x => x.AgriculteurId,
                        principalTable: "Agriculteurs",
                        principalColumn: "idAgriculteur",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Parcelles_FermeId",
                table: "Parcelles",
                column: "FermeId");

            migrationBuilder.CreateIndex(
                name: "IX_Fermes_AgriculteurId",
                table: "Fermes",
                column: "AgriculteurId");

            migrationBuilder.AddForeignKey(
                name: "FK_Parcelles_Fermes_FermeId",
                table: "Parcelles",
                column: "FermeId",
                principalTable: "Fermes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parcelles_Fermes_FermeId",
                table: "Parcelles");

            migrationBuilder.DropTable(
                name: "Fermes");

            migrationBuilder.DropIndex(
                name: "IX_Parcelles_FermeId",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Culture",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "DatePlantation",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "DateRecolte",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Delegation",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "DerniereSynchronisation",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "EstSynchronise",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "FermeId",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Geometrie",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Gouvernorat",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Secteur",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Surface",
                table: "Parcelles");

            migrationBuilder.RenameColumn(
                name: "Couleur",
                table: "Parcelles",
                newName: "EtatSynchronisation");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Parcelles",
                newName: "IdParcelle");

            migrationBuilder.AlterColumn<string>(
                name: "Nom",
                table: "Parcelles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<double>(
                name: "AltitudeMoyenne",
                table: "Parcelles",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContourJson",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "PenteMoyenne",
                table: "Parcelles",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Superficie",
                table: "Parcelles",
                type: "float",
                nullable: true);
        }
    }
}
