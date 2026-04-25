using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Mvc.NewtonsoftJson;
using Newtonsoft.Json.Serialization;
using System.Text;
using AgricultureApp.Data;
using AgricultureApp.Data.Migrations;
using AgricultureApp.Models.Entities;
using AgricultureApp.Services;
using AgricultureApp.Authorization;
using Microsoft.AspNetCore.Authorization;

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
builder.Services.AddScoped<IPermissionService, PermissionService>();

// Enregistrement des handlers d'autorisation
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddScoped<IAuthorizationHandler, RegionAccessHandler>();

// Configuration de l'autorisation
builder.Services.AddAuthorization(options =>
{
    // Politiques existantes (rôles)
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(UserRoles.Admin));
    options.AddPolicy("AgentOrAdmin", policy => policy.RequireRole(UserRoles.Admin, UserRoles.Agent));
    options.AddPolicy("AgriculteurOnly", policy => policy.RequireRole(UserRoles.Agriculteur));
    options.AddPolicy("Authenticated", policy => policy.RequireAuthenticatedUser());

    // Politiques de permission
    options.AddPolicy("Permission_users.view", policy => policy.Requirements.Add(new PermissionRequirement("users.view")));
    options.AddPolicy("Permission_roles.view", policy => policy.Requirements.Add(new PermissionRequirement("roles.view")));
    options.AddPolicy("Permission_roles.create", policy => policy.Requirements.Add(new PermissionRequirement("roles.create")));
    options.AddPolicy("Permission_roles.edit", policy => policy.Requirements.Add(new PermissionRequirement("roles.edit")));
    options.AddPolicy("Permission_roles.delete", policy => policy.Requirements.Add(new PermissionRequirement("roles.delete")));
    options.AddPolicy("Permission_permissions.view", policy => policy.Requirements.Add(new PermissionRequirement("permissions.view")));
    options.AddPolicy("Permission_permissions.grant", policy => policy.Requirements.Add(new PermissionRequirement("permissions.grant")));
    options.AddPolicy("Permission_regions.view", policy => policy.Requirements.Add(new PermissionRequirement("regions.view")));
    options.AddPolicy("Permission_users.roles.view", policy => policy.Requirements.Add(new PermissionRequirement("users.roles.view")));
    options.AddPolicy("Permission_users.roles.edit", policy => policy.Requirements.Add(new PermissionRequirement("users.roles.edit")));
    options.AddPolicy("Permission_users.permissions.view", policy => policy.Requirements.Add(new PermissionRequirement("users.permissions.view")));
    options.AddPolicy("Permission_users.permissions.edit", policy => policy.Requirements.Add(new PermissionRequirement("users.permissions.edit")));
    options.AddPolicy("Permission_users.regions.view", policy => policy.Requirements.Add(new PermissionRequirement("users.regions.view")));
    options.AddPolicy("Permission_users.regions.edit", policy => policy.Requirements.Add(new PermissionRequirement("users.regions.edit")));
    options.AddPolicy("Permission_regions.all", policy => policy.Requirements.Add(new PermissionRequirement("regions.all")));
});

// ── Controllers with Newtonsoft ───────────────────────────────────────────────
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
        options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
        options.SerializerSettings.DateFormatString = "yyyy-MM-ddTHH:mm:ss";
    });

// ── TensorFlow ────────────────────────────────────────────────────────────────
string modelFolder = Path.Combine(builder.Environment.ContentRootPath, "Models");

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

// ── Auth & JWT ────────────────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();

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

// ──────────────────────────────────────────────────────────────────────────────
// NOW build the app (AFTER all services are registered)
// ──────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngularApp");
app.UseAuthentication();
app.UseAuthorization();

// ── Database migration and seeding ───────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();
    MarketplaceSeed.SeedProduits(db);
}

app.MapControllers();
app.Run();