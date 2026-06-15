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
    public class CoursesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CoursesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CourseResponse>>> GetCourses()
        {
            var courses = await _context.Courses
                .Include(c => c.Registrations)
                .Select(c => new CourseResponse
                {
                    Id = c.Id,
                    Name = c.Name ?? string.Empty,
                    Fromdate = c.Fromdate,
                    Todate = c.Todate,
                    CreatedAt = c.CreatedAt,
                    CreatedBy = c.CreatedBy,
                    ParticipantCount = c.Registrations.Count
                })
                .ToListAsync();

            return Ok(courses);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CourseResponse>> GetCourse(int id)
        {
            var course = await _context.Courses
                .Include(c => c.Registrations)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null) return NotFound(new { message = "Không tìm thấy khóa tu." });

            return Ok(new CourseResponse
            {
                Id = course.Id,
                Name = course.Name ?? string.Empty,
                Fromdate = course.Fromdate,
                Todate = course.Todate,
                CreatedAt = course.CreatedAt,
                CreatedBy = course.CreatedBy,
                ParticipantCount = course.Registrations.Count
            });
        }

        [HttpPost]
        public async Task<ActionResult<CourseResponse>> CreateCourse([FromBody] CourseCreateRequest request)
        {
            if (request.Fromdate > request.Todate)
            {
                return BadRequest(new { message = "Ngày bắt đầu không thể sau ngày kết thúc." });
            }

            // Manually assign ID
            var nextId = (await _context.Courses.MaxAsync(c => (int?)c.Id) ?? 0) + 1;

            var course = new Course
            {
                Id = nextId,
                Name = request.Name,
                Fromdate = request.Fromdate?.Date,
                Todate = request.Todate?.Date,
                CreatedAt = DateTime.Now,
                CreatedBy = 1 // Default Admin User Id
            };

            _context.Courses.Add(course);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCourse), new { id = course.Id }, new CourseResponse
            {
                Id = course.Id,
                Name = course.Name ?? string.Empty,
                Fromdate = course.Fromdate,
                Todate = course.Todate,
                CreatedAt = course.CreatedAt,
                CreatedBy = course.CreatedBy,
                ParticipantCount = 0
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCourse(int id, [FromBody] CourseCreateRequest request)
        {
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == id);

            if (course == null) return NotFound(new { message = "Không tìm thấy khóa tu." });

            if (request.Fromdate > request.Todate)
            {
                return BadRequest(new { message = "Ngày bắt đầu không thể sau ngày kết thúc." });
            }

            course.Name = request.Name;
            course.Fromdate = request.Fromdate?.Date;
            course.Todate = request.Todate?.Date;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCourse(int id)
        {
            var course = await _context.Courses.FindAsync(id);
            if (course == null) return NotFound(new { message = "Không tìm thấy khóa tu." });

            _context.Courses.Remove(course);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
