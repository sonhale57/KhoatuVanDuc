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
    public class MembersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MembersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MemberResponse>>> GetMembers()
        {
            var membersList = await _context.Members
                .Include(m => m.Registrations)
                    .ThenInclude(r => r.Course)
                .ToListAsync();

            var members = membersList.Select(m => new MemberResponse
            {
                Id = m.Id,
                UniqueId = m.UniqueId,
                Code = m.Code,
                Name = m.Name ?? string.Empty,
                OtherName = m.OtherName,
                YearOfBirth = m.YearOfBirth,
                Gender = m.Gender,
                Phone = m.Phone,
                RelativePhone = m.RelativePhone,
                IdentityImage = m.IdentityImage,
                JoinedCoursesCount = m.Registrations.Count,
                CourseHistory = m.Registrations.Select(r => new MemberCourseHistoryDto
                {
                    CourseId = r.CourseId,
                    CourseName = r.Course?.Name ?? string.Empty,
                    Fromdate = r.Fromdate,
                    Todate = r.Todate,
                    DayAttend = r.DayAttend,
                    ActualDays = r.Todate.HasValue && r.Fromdate.HasValue ? (int?)((r.Todate.Value - r.Fromdate.Value).Days + 1) : null
                }).ToList(),
                CreatedAt = m.CreatedAt,
                CreatedBy = m.CreatedBy
            }).ToList();

            return Ok(members);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MemberResponse>> GetMember(int id)
        {
            var m = await _context.Members
                .Include(x => x.Registrations)
                    .ThenInclude(r => r.Course)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (m == null) return NotFound(new { message = "Không tìm thấy thành viên." });

            return Ok(new MemberResponse
            {
                Id = m.Id,
                UniqueId = m.UniqueId,
                Code = m.Code,
                Name = m.Name ?? string.Empty,
                OtherName = m.OtherName,
                YearOfBirth = m.YearOfBirth,
                Gender = m.Gender,
                Phone = m.Phone,
                RelativePhone = m.RelativePhone,
                IdentityImage = m.IdentityImage,
                JoinedCoursesCount = m.Registrations.Count,
                CourseHistory = m.Registrations.Select(r => new MemberCourseHistoryDto
                {
                    CourseId = r.CourseId,
                    CourseName = r.Course?.Name ?? string.Empty,
                    Fromdate = r.Fromdate,
                    Todate = r.Todate,
                    DayAttend = r.DayAttend,
                    ActualDays = r.Todate.HasValue && r.Fromdate.HasValue ? (int?)((r.Todate.Value - r.Fromdate.Value).Days + 1) : null
                }).ToList(),
                CreatedAt = m.CreatedAt,
                CreatedBy = m.CreatedBy
            });
        }

        [HttpPost]
        public async Task<ActionResult<MemberResponse>> CreateMember([FromBody] MemberCreateRequest request)
        {
            // Manually assign ID
            var nextId = (await _context.Members.MaxAsync(m => (int?)m.Id) ?? 0) + 1;

            // Generate unique STT based Code (lowest available VD + 5 digits)
            var existingCodes = await _context.Members
                .Where(m => m.Code != null && m.Code.StartsWith("VD"))
                .Select(m => m.Code)
                .ToListAsync();

            var existingNums = new HashSet<int>();
            foreach (var existingCode in existingCodes)
            {
                if (existingCode != null && existingCode.Length >= 3 && int.TryParse(existingCode.Substring(2), out int num))
                {
                    existingNums.Add(num);
                }
            }

            int stt = 1;
            while (existingNums.Contains(stt))
            {
                stt++;
            }
            var generatedCode = $"VD{stt:D5}";

            // Generate unique UniqueId
            var maxUniqueId = await _context.Members.MaxAsync(m => m.UniqueId) ?? 100000;
            var genUniqueId = maxUniqueId + 1;

            var member = new Member
            {
                Id = nextId,
                UniqueId = genUniqueId,
                Code = generatedCode,
                Name = request.Name,
                OtherName = request.OtherName,
                YearOfBirth = request.YearOfBirth,
                Gender = request.Gender,
                Phone = request.Phone,
                RelativePhone = request.RelativePhone,
                IdentityImage = request.IdentityImage,
                CreatedAt = DateTime.Now,
                CreatedBy = 1 // Default Admin User Id
            };

            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetMember), new { id = member.Id }, new MemberResponse
            {
                Id = member.Id,
                UniqueId = member.UniqueId,
                Code = member.Code,
                Name = member.Name ?? string.Empty,
                OtherName = member.OtherName,
                YearOfBirth = member.YearOfBirth,
                Gender = member.Gender,
                Phone = member.Phone,
                RelativePhone = member.RelativePhone,
                IdentityImage = member.IdentityImage,
                JoinedCoursesCount = 0,
                CourseHistory = new List<MemberCourseHistoryDto>(),
                CreatedAt = member.CreatedAt,
                CreatedBy = member.CreatedBy
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMember(int id, [FromBody] MemberCreateRequest request)
        {
            var member = await _context.Members.FindAsync(id);
            if (member == null) return NotFound(new { message = "Không tìm thấy thành viên." });

            // Do not allow updating UniqueId or Code
            member.Name = request.Name;
            member.OtherName = request.OtherName;
            member.YearOfBirth = request.YearOfBirth;
            member.Gender = request.Gender;
            member.Phone = request.Phone;
            member.RelativePhone = request.RelativePhone;
            member.IdentityImage = request.IdentityImage;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMember(int id)
        {
            var member = await _context.Members.FindAsync(id);
            if (member == null) return NotFound(new { message = "Không tìm thấy thành viên." });

            _context.Members.Remove(member);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
