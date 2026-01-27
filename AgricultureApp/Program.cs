using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
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
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configuration pour les dates dans JSON
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.DateFormatString = "yyyy-MM-ddTHH:mm:ss";
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
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

// Route de test
app.MapGet("/api/test", () =>
{
    return Results.Ok(new
    {
        message = "API AgricultureApp fonctionnelle!",
        status = "OK",
        timestamp = DateTime.UtcNow
    });
});

// AJOUTEZ CE USING EN HAUT ou utilisez le nom complet
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    // Créer la base de données
    dbContext.Database.EnsureCreated();

    Console.WriteLine("Base de données créée avec succès!");

    // Ajouter des données de test - Utilisez le nom complet
    if (!dbContext.Agriculteurs.Any())
    {
        dbContext.Agriculteurs.Add(new AgricultureApp.Models.Entities.Agriculteur
        {
            Nom = "Test",
            Prenom = "Agriculteur",
            Telephone = "00000000",
            Localisation = "Test"
        });
        dbContext.SaveChanges();
        Console.WriteLine("Données de test ajoutées!");
    }
}

app.Run();