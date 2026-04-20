using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc.NewtonsoftJson;
using Newtonsoft.Json.Serialization;
using System.Text;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;



var builder = WebApplication.CreateBuilder(args);

// ── Cache Elevation ────────────────────────────────────────────────────────────
builder.Services.AddSingleton<ElevationCacheService>();
builder.Services.AddSingleton<PythonModelService>();
// ── Services d'élévation ───────────────────────────────────────────────────────
builder.Services.AddHttpClient<IElevationService, ElevationService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddScoped<IElevationService, ElevationService>();

// ── Logging ───────────────────────────────────────────────────────────────────
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IFermeService, FermeService>();
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();

builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        options.SerializerSettings.DateFormatString = "yyyy-MM-ddTHH:mm:ss";
    });


//--------TenserFlow-----------------------
// Chemin vers le dossier contenant saved_model.pb (pas le fichier lui-même, mais le dossier)
string modelFolder = Path.Combine(builder.Environment.ContentRootPath, "Models");


//---------------------------------------------
// ── Météo ─────────────────────────────────────────────────────────────────────
builder.Services.AddHttpClient<IMeteoService, MeteoService>(client =>
{
    client.BaseAddress = new Uri("https://api.open-meteo.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<ChatMemoryService>();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ── Base de données ───────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseSqlServer(connectionString);
    options.EnableSensitiveDataLogging();
});

// ── Auth ──────────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();

// ── JWT ───────────────────────────────────────────────────────────────────────
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// ⚠️ IMPORTANT: UseCors AVANT l'authentification
app.UseCors("AllowAngularApp");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();