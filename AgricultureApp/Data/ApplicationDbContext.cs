using Microsoft.EntityFrameworkCore;
using AgricultureApp.Models.Entities;

namespace AgricultureApp.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Agriculteur> Agriculteurs { get; set; }
        public DbSet<Parcelle> Parcelles { get; set; }
        public DbSet<Utilisateur> Utilisateurs { get; set; }
        public DbSet<DonneesMeteo> DonneesMeteo { get; set; }
        public DbSet<StationMeteo> StationsMeteo { get; set; }
        public DbSet<ImageSatellite> ImagesSatellite { get; set; }
        public DbSet<DiagnosticAcrique> DiagnosticsAcriques { get; set; }
        public DbSet<DonneeLocale> DonneesLocales { get; set; }
        public DbSet<Synchronisation> Synchronisations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuration des relations
            modelBuilder.Entity<Parcelle>()
                .HasOne(p => p.Agriculteur)
                .WithMany(a => a.Parcelles)
                .HasForeignKey(p => p.AgriculteurId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configuration des indexes
            modelBuilder.Entity<DonneesMeteo>()
                .HasIndex(d => d.DateHeure);

            modelBuilder.Entity<Utilisateur>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Valeurs par défaut
            modelBuilder.Entity<Parcelle>()
                .Property(p => p.DateCreation)
                .HasDefaultValueSql("GETDATE()");

            modelBuilder.Entity<Utilisateur>()
                 .Property(u => u.DateCreation)
                 .HasDefaultValueSql("GETDATE()");

        }
    }
}