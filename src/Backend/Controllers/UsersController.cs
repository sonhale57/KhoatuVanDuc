using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using Backend.Helpers;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new UserResponse
                {
                    Id = u.Id,
                    Username = u.Username ?? string.Empty,
                    DisplayName = u.DisplayName ?? string.Empty,
                    Role = "Admin", // Hardcoded for frontend compatibility
                    Active = u.Active ?? false
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserResponse>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            return Ok(new UserResponse
            {
                Id = user.Id,
                Username = user.Username ?? string.Empty,
                DisplayName = user.DisplayName ?? string.Empty,
                Role = "Admin",
                Active = user.Active ?? false
            });
        }

        [HttpPost]
        public async Task<ActionResult<UserResponse>> CreateUser([FromBody] UserCreateRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại." });
            }

            // Manually assign ID
            var nextId = (await _context.Users.MaxAsync(u => (int?)u.Id) ?? 0) + 1;

            var user = new User
            {
                Id = nextId,
                Username = request.Username,
                Password = HashHelper.HashPassword(request.Password),
                DisplayName = request.DisplayName,
                Active = request.Active
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new UserResponse
            {
                Id = user.Id,
                Username = user.Username,
                DisplayName = user.DisplayName ?? string.Empty,
                Role = "Admin",
                Active = user.Active ?? false
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserUpdateRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            user.DisplayName = request.DisplayName;
            user.Active = request.Active;

            if (!string.IsNullOrEmpty(request.Password))
            {
                user.Password = HashHelper.HashPassword(request.Password);
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "Không tìm thấy người dùng." });

            // Prevent deleting the default admin account
            if (user.Username == "admin")
            {
                return BadRequest(new { message = "Không thể xóa tài khoản admin mặc định của hệ thống." });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
