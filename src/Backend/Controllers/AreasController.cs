using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AreasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AreasController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AreaResponse>>> GetAreas()
        {
            var areas = await _context.Areas
                .AsNoTracking()
                .Select(a => new AreaResponse
                {
                    Id = a.Id,
                    Name = a.Name ?? string.Empty,
                    Description = a.Description,
                    Rows = a.Rows,
                    Cols = a.Cols,
                    CreatedAt = a.CreatedAt,
                    CreatedBy = a.CreatedBy
                })
                .ToListAsync();

            return Ok(areas);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AreaResponse>> GetArea(int id)
        {
            var a = await _context.Areas
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (a == null) return NotFound(new { message = "Không tìm thấy khu vực." });

            return Ok(new AreaResponse
            {
                Id = a.Id,
                Name = a.Name ?? string.Empty,
                Description = a.Description,
                Rows = a.Rows,
                Cols = a.Cols,
                CreatedAt = a.CreatedAt,
                CreatedBy = a.CreatedBy
            });
        }

        [HttpPost]
        public async Task<ActionResult<AreaResponse>> CreateArea([FromBody] AreaCreateRequest request)
        {
            // Manually assign ID
            var nextId = (await _context.Areas.MaxAsync(a => (int?)a.Id) ?? 0) + 1;

            var a = new Area
            {
                Id = nextId,
                Name = request.Name,
                Description = request.Description,
                Rows = request.Rows,
                Cols = request.Cols,
                CreatedAt = DateTime.Now,
                CreatedBy = 1 // Default Admin User Id
            };

            _context.Areas.Add(a);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetArea), new { id = a.Id }, new AreaResponse
            {
                Id = a.Id,
                Name = a.Name,
                Description = a.Description,
                Rows = a.Rows,
                Cols = a.Cols,
                CreatedAt = a.CreatedAt,
                CreatedBy = a.CreatedBy
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateArea(int id, [FromBody] AreaCreateRequest request)
        {
            var a = await _context.Areas.FindAsync(id);
            if (a == null) return NotFound(new { message = "Không tìm thấy khu vực." });

            a.Name = request.Name;
            a.Description = request.Description;
            a.Rows = request.Rows;
            a.Cols = request.Cols;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteArea(int id)
        {
            var a = await _context.Areas.FindAsync(id);
            if (a == null) return NotFound(new { message = "Không tìm thấy khu vực." });

            // Check if any beds are associated with this area
            var hasBeds = await _context.Beds.AnyAsync(b => b.AreaId == id);
            if (hasBeds)
            {
                return BadRequest(new { message = "Không thể xóa khu vực đang chứa chỗ ngủ. Hãy xóa hoặc chuyển các chỗ ngủ trước." });
            }

            _context.Areas.Remove(a);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
