using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using Backend.Helpers;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || string.IsNullOrEmpty(user.Password) || !HashHelper.VerifyPassword(request.Password, user.Password))
            {
                return Unauthorized(new { message = "Tên đăng nhập hoặc mật khẩu không chính xác." });
            }

            var token = JwtHelper.GenerateToken(user, _configuration);

            return Ok(new UserResponse
            {
                Id = user.Id,
                Username = user.Username ?? string.Empty,
                DisplayName = user.DisplayName ?? string.Empty,
                Role = "Admin",
                Active = user.Active ?? false,
                Token = token
            });
        }

        [HttpPost("seed")]
        public async Task<IActionResult> Seed()
        {
            if (!await _context.Users.AnyAsync())
            {
                var admin = new User
                {
                    Id = 1,
                    Username = "admin",
                    Password = HashHelper.HashPassword("admin123"),
                    DisplayName = "Quản trị viên",
                    Active = true
                };
                _context.Users.Add(admin);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã khởi tạo tài khoản admin thành công (username: admin, password: admin123)." });
            }
            return Ok(new { message = "Đã có tài khoản trong hệ thống." });
        }
    }
}
