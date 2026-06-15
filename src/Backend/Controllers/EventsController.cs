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
    public class EventsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EventsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<EventResponse>>> GetEvents()
        {
            var events = await _context.Events
                .Select(e => new EventResponse
                {
                    Id = e.Id,
                    Name = e.Name,
                    FromDate = e.FromDate,
                    ToDate = e.ToDate,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt,
                    CreatedBy = e.CreatedBy
                })
                .ToListAsync();

            return Ok(events);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<EventResponse>> GetEvent(int id)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null) return NotFound(new { message = "Không tìm thấy sự kiện." });

            return Ok(new EventResponse
            {
                Id = ev.Id,
                Name = ev.Name,
                FromDate = ev.FromDate,
                ToDate = ev.ToDate,
                IsActive = ev.IsActive,
                CreatedAt = ev.CreatedAt,
                CreatedBy = ev.CreatedBy
            });
        }

        [HttpPost]
        public async Task<ActionResult<EventResponse>> CreateEvent([FromBody] EventCreateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Tên sự kiện không được để trống." });
            }

            var nextId = (await _context.Events.MaxAsync(e => (int?)e.Id) ?? 0) + 1;

            var ev = new Event
            {
                Id = nextId,
                Name = request.Name,
                FromDate = request.FromDate,
                ToDate = request.ToDate,
                IsActive = request.IsActive,
                CreatedAt = DateTime.Now,
                CreatedBy = 1 // Default Admin User Id
            };

            _context.Events.Add(ev);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetEvent), new { id = ev.Id }, new EventResponse
            {
                Id = ev.Id,
                Name = ev.Name,
                FromDate = ev.FromDate,
                ToDate = ev.ToDate,
                IsActive = ev.IsActive,
                CreatedAt = ev.CreatedAt,
                CreatedBy = ev.CreatedBy
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] EventCreateRequest request)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null) return NotFound(new { message = "Không tìm thấy sự kiện." });

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(new { message = "Tên sự kiện không được để trống." });
            }

            ev.Name = request.Name;
            ev.FromDate = request.FromDate;
            ev.ToDate = request.ToDate;
            ev.IsActive = request.IsActive;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var ev = await _context.Events.FindAsync(id);
            if (ev == null) return NotFound(new { message = "Không tìm thấy sự kiện." });

            _context.Events.Remove(ev);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
