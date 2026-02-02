using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class FixUserColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DateInscription",
                table: "Utilisateurs",
                newName: "DateCreation");

            migrationBuilder.RenameColumn(
                name: "IdUtilisateur",
                table: "Utilisateurs",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "IdAgriculteur",
                table: "Agriculteurs",
                newName: "idAgriculteur");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Utilisateurs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<int>(
                name: "AgriculteurId",
                table: "Utilisateurs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DerniereConnexion",
                table: "Utilisateurs",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EstActif",
                table: "Utilisateurs",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Localisation",
                table: "Utilisateurs",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Prenom",
                table: "Utilisateurs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Telephone",
                table: "Utilisateurs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Utilisateurs_AgriculteurId",
                table: "Utilisateurs",
                column: "AgriculteurId");

            migrationBuilder.AddForeignKey(
                name: "FK_Utilisateurs_Agriculteurs_AgriculteurId",
                table: "Utilisateurs",
                column: "AgriculteurId",
                principalTable: "Agriculteurs",
                principalColumn: "idAgriculteur");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Utilisateurs_Agriculteurs_AgriculteurId",
                table: "Utilisateurs");

            migrationBuilder.DropIndex(
                name: "IX_Utilisateurs_AgriculteurId",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "AgriculteurId",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "DerniereConnexion",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "EstActif",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "Localisation",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "Prenom",
                table: "Utilisateurs");

            migrationBuilder.DropColumn(
                name: "Telephone",
                table: "Utilisateurs");

            migrationBuilder.RenameColumn(
                name: "DateCreation",
                table: "Utilisateurs",
                newName: "DateInscription");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Utilisateurs",
                newName: "IdUtilisateur");

            migrationBuilder.RenameColumn(
                name: "idAgriculteur",
                table: "Agriculteurs",
                newName: "IdAgriculteur");

            migrationBuilder.AlterColumn<string>(
                name: "Role",
                table: "Utilisateurs",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);
        }
    }
}
