using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc.NewtonsoftJson;
using Newtonsoft.Json.Serialization;
using AgricultureApp.Data;

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

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");
app.UseAuthorization();
app.MapControllers();

// Initialisation BD - CORRECTION ICI : Sans await
// Initialisation BD
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    logger.LogInformation("Création de la base de données...");

    // Appliquer les migrations
    dbContext.Database.Migrate();

    // Ajout de données de test si nécessaire
    if (!dbContext.Agriculteurs.Any())
    {
        dbContext.Agriculteurs.AddRange(
            new AgricultureApp.Models.Entities.Agriculteur
            {
                Nom = "Dupont",
                Prenom = "Jean",
                Telephone = "12345678",
                Localisation = "Tunis"
            },
            new AgricultureApp.Models.Entities.Agriculteur
            {
                Nom = "Martin",
                Prenom = "Pierre",
                Telephone = "87654321",
                Localisation = "Sousse"
            },
            new AgricultureApp.Models.Entities.Agriculteur
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
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "Erreur d'initialisation BD");
}

app.Run();