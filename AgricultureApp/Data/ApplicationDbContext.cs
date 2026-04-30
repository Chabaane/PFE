using Microsoft.EntityFrameworkCore;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;   // Adjust namespace if needed (e.g., AgricultureApp.Models.Marketplace)

namespace AgricultureApp.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        // Existing DbSets
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
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<Region> Regions { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }
        public DbSet<UserRegionAccess> UserRegionAccesses { get; set; }

        // New marketplace DbSets
        public DbSet<Produit> Produits { get; set; }
        public DbSet<Panier> Paniers { get; set; }
        public DbSet<LignePanier> LignesPanier { get; set; }
        public DbSet<Commande> Commandes { get; set; }
        public DbSet<LigneCommande> LignesCommande { get; set; }
        public DbSet<AvisProduit> AvisProduits { get; set; }
        public DbSet<DiagnosticImage> DiagnosticsImages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ---------- Existing configurations ----------
            // Relation Ferme -> Agriculteur
            modelBuilder.Entity<Ferme>()
                .HasOne(f => f.Agriculteur)
                .WithMany(a => a.Fermes)  // You must add this property to Agriculteur
                .HasForeignKey(f => f.AgriculteurId)
                .HasPrincipalKey(a => a.idAgriculteur)
                .OnDelete(DeleteBehavior.Restrict);

            // Relation Parcelle -> Ferme
            modelBuilder.Entity<Parcelle>()
                .HasOne(p => p.Ferme)
                .WithMany(f => f.Parcelles)
                .HasForeignKey(p => p.FermeId)
                .OnDelete(DeleteBehavior.SetNull);

            // Agriculteur -> Parcelles
            modelBuilder.Entity<Agriculteur>()
               .HasMany(a => a.Parcelles)
               .WithOne(p => p.Agriculteur)
               .HasForeignKey(p => p.AgriculteurId)
               .OnDelete(DeleteBehavior.Cascade);

            // Indexes
            modelBuilder.Entity<DonneesMeteo>()
                .HasIndex(d => d.DateHeure);

            modelBuilder.Entity<Utilisateur>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // Default values
            modelBuilder.Entity<Parcelle>()
                .Property(p => p.DateCreation)
                .HasDefaultValueSql("GETDATE()");

            modelBuilder.Entity<Utilisateur>()
                 .Property(u => u.DateCreation)
                 .HasDefaultValueSql("GETDATE()");

            // Composite keys for security tables
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });

            modelBuilder.Entity<UserPermission>()
                .HasKey(up => new { up.UserId, up.PermissionId });

            modelBuilder.Entity<UserRegionAccess>()
                .HasKey(ura => new { ura.UserId, ura.RegionId });

            // ---------- Marketplace configurations ----------
            // Produit
            modelBuilder.Entity<Produit>(e =>
            {
                e.HasKey(p => p.IdProduit);
                e.Property(p => p.Prix).HasPrecision(10, 2);
                e.Property(p => p.PrixPromo).HasPrecision(10, 2);
                e.HasMany(p => p.Avis).WithOne(a => a.Produit).HasForeignKey(a => a.IdProduit);
                e.HasMany(p => p.LignesPanier).WithOne(l => l.Produit).HasForeignKey(l => l.IdProduit);
                e.HasMany(p => p.LignesCommande).WithOne(l => l.Produit).HasForeignKey(l => l.IdProduit);
            });

            // Commande
            modelBuilder.Entity<Commande>(e =>
            {
                e.HasKey(c => c.IdCommande);
                e.HasMany(c => c.Lignes).WithOne(l => l.Commande).HasForeignKey(l => l.IdCommande);
                e.Property(c => c.Statut).HasConversion<string>();
            });

            // Panier
            modelBuilder.Entity<Panier>(e =>
            {
                e.HasKey(p => p.IdPanier);
                e.HasMany(p => p.Lignes).WithOne(l => l.Panier).HasForeignKey(l => l.IdPanier);
            });

            // Indexes for marketplace
            modelBuilder.Entity<Produit>().HasIndex(p => p.Categorie);
            modelBuilder.Entity<Produit>().HasIndex(p => p.EstActif);
            modelBuilder.Entity<Commande>().HasIndex(c => c.NumeroCommande).IsUnique();
            modelBuilder.Entity<Panier>().HasIndex(p => p.IdUtilisateur);
            modelBuilder.Entity<Panier>().HasIndex(p => p.SessionId);
        }
    }
}