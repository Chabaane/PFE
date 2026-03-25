using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class AddTerrainAnalysisProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AltitudeMax",
                table: "Parcelles",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AltitudeMin",
                table: "Parcelles",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AltitudeMoyenne",
                table: "Parcelles",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClassePente",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Exposition",
                table: "Parcelles",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PenteMoyenne",
                table: "Parcelles",
                type: "decimal(18,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AltitudeMax",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "AltitudeMin",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "AltitudeMoyenne",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "ClassePente",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "Exposition",
                table: "Parcelles");

            migrationBuilder.DropColumn(
                name: "PenteMoyenne",
                table: "Parcelles");
        }
    }
}
