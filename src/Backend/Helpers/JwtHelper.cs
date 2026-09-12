using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Models;

namespace Backend.Helpers
{
    public static class JwtHelper
    {
        public static string GenerateToken(User user, IConfiguration configuration)
        {
            var secretKey = configuration["JwtSettings:SecretKey"] ?? "KhoatuVanDuc_Super_Secret_Key_For_Jwt_Token_Authentication_2026!#";
            var issuer = configuration["JwtSettings:Issuer"] ?? "KhoatuVanDucApi";
            var audience = configuration["JwtSettings:Audience"] ?? "KhoatuVanDucClient";
            var expiryMinutes = int.TryParse(configuration["JwtSettings:ExpiryInMinutes"], out var mins) ? mins : 480;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username ?? string.Empty),
                new Claim(ClaimTypes.GivenName, user.DisplayName ?? string.Empty),
                new Claim(ClaimTypes.Role, "Admin")
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
