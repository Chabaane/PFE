using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AgricultureApp.Migrations
{
    /// <inheritdoc />
    public partial class AddDiagnosticImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DiagnosticsImages",
                columns: table => new
                {
                    IdDiagnostic = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdUtilisateur = table.Column<int>(type: "int", nullable: true),
                    NomFichier = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PlanteDetectee = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MaladieDetectee = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Confiance = table.Column<double>(type: "float", nullable: false),
                    EstSain = table.Column<bool>(type: "bit", nullable: false),
                    ProduitsRecommandes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateDiagnostic = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiagnosticsImages", x => x.IdDiagnostic);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiagnosticsImages");
        }
    }
}
