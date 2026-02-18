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
        public DbSet<Ferme> Fermes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Relation Ferme -> Agriculteur
            modelBuilder.Entity<Ferme>()
                .HasOne(f => f.Agriculteur)
                .WithMany(a => a.Fermes)  // Vous devrez ajouter cette propriété à Agriculteur
                .HasForeignKey(f => f.AgriculteurId)
                .HasPrincipalKey(a => a.idAgriculteur)
                .OnDelete(DeleteBehavior.Restrict);

            // Relation Parcelle -> Ferme
            modelBuilder.Entity<Parcelle>()
                .HasOne(p => p.Ferme)
                .WithMany(f => f.Parcelles)
                .HasForeignKey(p => p.FermeId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configuration des relations
            modelBuilder.Entity<Agriculteur>()
               .HasMany(a => a.Parcelles)
               .WithOne(p => p.Agriculteur)
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