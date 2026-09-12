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
    public class BedsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BedsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<BedResponse>>> GetBeds([FromQuery] int? courseId)
        {
            var beds = await _context.Beds
                .AsNoTracking()
                .Include(b => b.Area)
                .ToListAsync();

            List<Registration> registrations = new List<Registration>();
            if (courseId.HasValue)
            {
                registrations = await _context.Registrations
                    .AsNoTracking()
                    .Include(r => r.Member)
                    .Where(r => r.CourseId == courseId.Value)
                    .ToListAsync();
            }
            else
            {
                var latestCourse = await _context.Courses
                    .AsNoTracking()
                    .OrderByDescending(c => c.Fromdate)
                    .FirstOrDefaultAsync();

                if (latestCourse != null)
                {
                    registrations = await _context.Registrations
                        .AsNoTracking()
                        .Include(r => r.Member)
                        .Where(r => r.CourseId == latestCourse.Id)
                        .ToListAsync();
                }
            }

            var response = beds.Select(b =>
            {
                var reg = registrations.FirstOrDefault(r => r.BedId == b.Id && r.Todate == null);
                return new BedResponse
                {
                    Id = b.Id,
                    AreaId = b.AreaId,
                    AreaName = b.Area?.Name,
                    Code = b.Code ?? string.Empty,
                    Description = b.Description,
                    Active = b.Active ?? false,
                    RowNumber = b.RowNumber,
                    OrderNumber = b.OrderNumber,
                    Type = b.Type,
                    CurrentMemberId = reg?.MemberId,
                    CurrentMemberName = reg?.Member?.Name,
                    IsOccupied = reg != null
                };
            }).ToList();

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<BedResponse>> GetBed(int id)
        {
            var b = await _context.Beds
                .AsNoTracking()
                .Include(x => x.Area)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (b == null) return NotFound(new { message = "Không tìm thấy chỗ ngủ." });

            return Ok(new BedResponse
            {
                Id = b.Id,
                AreaId = b.AreaId,
                AreaName = b.Area?.Name,
                Code = b.Code ?? string.Empty,
                Description = b.Description,
                Active = b.Active ?? false,
                RowNumber = b.RowNumber,
                OrderNumber = b.OrderNumber,
                Type = b.Type
            });
        }

        [HttpPost]
        public async Task<ActionResult<BedResponse>> CreateBed([FromBody] BedCreateRequest request)
        {
            // Manually assign ID
            var nextId = (await _context.Beds.MaxAsync(b => (int?)b.Id) ?? 0) + 1;

            var b = new Bed
            {
                Id = nextId,
                AreaId = request.AreaId,
                Code = request.Code,
                Description = request.Description,
                Active = request.Active,
                RowNumber = request.RowNumber,
                OrderNumber = request.OrderNumber,
                Type = request.Type,
                CreatedAt = DateTime.Now,
                CreatedBy = 1 // Default Admin User Id
            };

            _context.Beds.Add(b);
            await _context.SaveChangesAsync();

            // Load Area details for response
            var area = await _context.Areas.AsNoTracking().FirstOrDefaultAsync(a => a.Id == b.AreaId);

            return CreatedAtAction(nameof(GetBed), new { id = b.Id }, new BedResponse
            {
                Id = b.Id,
                AreaId = b.AreaId,
                AreaName = area?.Name,
                Code = b.Code,
                Description = b.Description,
                Active = b.Active ?? false,
                RowNumber = b.RowNumber,
                OrderNumber = b.OrderNumber,
                Type = b.Type
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBed(int id, [FromBody] BedCreateRequest request)
        {
            var b = await _context.Beds.FindAsync(id);
            if (b == null) return NotFound(new { message = "Không tìm thấy chỗ ngủ." });

            b.AreaId = request.AreaId;
            b.Code = request.Code;
            b.Description = request.Description;
            b.Active = request.Active;
            b.RowNumber = request.RowNumber;
            b.OrderNumber = request.OrderNumber;
            b.Type = request.Type;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("batch-update-positions")]
        public async Task<IActionResult> BatchUpdatePositions([FromBody] List<BedPositionUpdate> updates)
        {
            if (updates == null || !updates.Any()) return BadRequest(new { message = "Không có cập nhật nào." });

            foreach (var update in updates)
            {
                var spot = await _context.Beds.FindAsync(update.Id);
                if (spot != null)
                {
                    spot.RowNumber = update.RowNumber;
                    spot.OrderNumber = update.OrderNumber;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật vị trí sơ đồ thành công." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBed(int id)
        {
            var b = await _context.Beds.FindAsync(id);
            if (b == null) return NotFound(new { message = "Không tìm thấy chỗ ngủ." });

            _context.Beds.Remove(b);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
