using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc.NewtonsoftJson;
using Newtonsoft.Json.Serialization;
using System.Text;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Configuration du logging
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Add services to the container.
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        options.SerializerSettings.DateFormatString = "yyyy-MM-ddTHH:mm:ss";
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configuration CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Configuration de la base de données
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
Console.WriteLine($"Connection string: {connectionString}");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString);
    options.EnableSensitiveDataLogging();
    options.LogTo(Console.WriteLine, LogLevel.Information);
});

// Services d'authentification
builder.Services.AddScoped<IAuthService, AuthService>();

// Configuration JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "VotreCleSecreteSuperLonguePourLaSecurite123456789";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "AgricultureApp";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "AgricultureAppUsers";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(UserRoles.Admin));
    options.AddPolicy("AgentOrAdmin", policy => policy.RequireRole(UserRoles.Admin, UserRoles.Agent));
    options.AddPolicy("AgriculteurOnly", policy => policy.RequireRole(UserRoles.Agriculteur));
    options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");
app.UseAuthentication(); // IMPORTANT: Avant UseAuthorization
app.UseAuthorization();
app.MapControllers();

// Initialisation BD
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Création de la base de données...");

    // Appliquer les migrations
    dbContext.Database.Migrate();

    // Ajout de données de test si nécessaire
    if (!dbContext.Agriculteurs.Any())
    {
        dbContext.Agriculteurs.AddRange(
            new Agriculteur
            {
                Nom = "Dupont",
                Prenom = "Jean",
                Telephone = "12345678",
                Localisation = "Tunis"
            },
            new Agriculteur
            {
                Nom = "Martin",
                Prenom = "Pierre",
                Telephone = "87654321",
                Localisation = "Sousse"
            },
            new Agriculteur
            {
                Nom = "Ben Ali",
                Prenom = "Mohamed",
                Telephone = "11223344",
                Localisation = "Sfax"
            }
        );

        dbContext.SaveChanges();
        logger.LogInformation("Données de test ajoutées!");
    }

    // Créer un utilisateur admin par défaut
    if (!dbContext.Utilisateurs.Any())
    {
        var admin = new Utilisateur
        {
            Nom = "Admin",
            Prenom = "System",
            Email = "admin@agriculture.tn",
            MotDePasseHash = authService.HashPassword("Admin123!"),
            Role = UserRoles.Admin,
            Telephone = "00000000",
            Localisation = "Tunis",
            EstActif = true,
            DateCreation = DateTime.UtcNow
        };

        dbContext.Utilisateurs.Add(admin);
        dbContext.SaveChanges();

        logger.LogInformation("Utilisateur admin créé: admin@agriculture.tn / Admin123!");
    }
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Erreur d'initialisation BD");
}

app.Run();