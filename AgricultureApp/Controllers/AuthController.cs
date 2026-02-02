using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AgricultureApp.Data;
using AgricultureApp.Models.Entities;
using AgricultureApp.Models.DTOs;
using AgricultureApp.Services;
using System.Security.Claims;


namespace AgricultureApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(ApplicationDbContext context, IAuthService authService, ILogger<AuthController> logger)
        {
            _context = context;
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(LoginDto loginDto)
        {
            var user = await _context.Utilisateurs
                .FirstOrDefaultAsync(u => u.Email == loginDto.Email && u.EstActif);

            if (user == null || !_authService.VerifyPassword(loginDto.MotDePasse, user.MotDePasseHash))
            {
                return Unauthorized(new { message = "Email ou mot de passe incorrect" });
            }

            // Mettre à jour la dernière connexion
            user.DerniereConnexion = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var token = _authService.GenerateJwtToken(user);

            return Ok(new AuthResponseDto
            {
                Id = user.Id,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Email = user.Email,
                Role = user.Role,
                Token = token,
                Expiration = DateTime.Now.AddHours(3)
            });
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto registerDto)
        {
            // Vérifier si l'email existe déjà
            if (await _context.Utilisateurs.AnyAsync(u => u.Email == registerDto.Email))
            {
                return BadRequest(new { message = "Cet email est déjà utilisé" });
            }

            var user = new Utilisateur
            {
                Nom = registerDto.Nom,
                Prenom = registerDto.Prenom,
                Email = registerDto.Email,
                MotDePasseHash = _authService.HashPassword(registerDto.MotDePasse),
                Role = registerDto.Role,
                Telephone = registerDto.Telephone,
                Localisation = registerDto.Localisation,
                DateCreation = DateTime.UtcNow,
                EstActif = true
            };

            // Si c'est un agriculteur, créer aussi un profil agriculteur
            if (registerDto.Role == UserRoles.Agriculteur)
            {
                var agriculteur = new Agriculteur
                {
                    Nom = registerDto.Nom,
                    Prenom = registerDto.Prenom,
                    Telephone = registerDto.Telephone,
                    Localisation = registerDto.Localisation
                };

                _context.Agriculteurs.Add(agriculteur);
                await _context.SaveChangesAsync();

                user.AgriculteurId = agriculteur.idAgriculteur;
            }

            _context.Utilisateurs.Add(user);
            await _context.SaveChangesAsync();

            var token = _authService.GenerateJwtToken(user);

            return Ok(new AuthResponseDto
            {
                Id = user.Id,
                Nom = user.Nom,
                Prenom = user.Prenom,
                Email = user.Email,
                Role = user.Role,
                Token = token,
                Expiration = DateTime.Now.AddHours(3)
            });
        }

        [HttpGet("profile")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<ActionResult<object>> GetProfile()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

            var user = await _context.Utilisateurs
                .Include(u => u.Agriculteur)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound();

            return new
            {
                user.Id,
                user.Nom,
                user.Prenom,
                user.Email,
                user.Role,
                user.Telephone,
                user.Localisation,
                user.DateCreation,
                Agriculteur = user.Agriculteur != null ? new
                {
                    user.Agriculteur.idAgriculteur,
                    user.Agriculteur.Nom,
                    user.Agriculteur.Prenom
                } : null
            };
        }

        [HttpPost("logout")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public IActionResult Logout()
        {
            // Pour JWT, le logout se fait côté client en supprimant le token
            return Ok(new { message = "Déconnexion réussie" });
        }
    }
}