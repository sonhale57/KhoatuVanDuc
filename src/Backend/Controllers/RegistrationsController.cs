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
    public class RegistrationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RegistrationsController(AppDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            if (Request.Headers.TryGetValue("X-User-Id", out var value) &&
                int.TryParse(value.FirstOrDefault(), out int userId) &&
                userId > 0)
            {
                return userId;
            }
            return 1; // fallback: admin
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RegistrationResponse>>> GetRegistrations([FromQuery] int? courseId)
        {
            IQueryable<Registration> query = _context.Registrations
                .Include(r => r.Course)
                .Include(r => r.Member)
                .Include(r => r.Bed)
                    .ThenInclude(b => b != null ? b.Area : null);

            if (courseId.HasValue)
            {
                query = query.Where(r => r.CourseId == courseId.Value);
            }

            var list = await query.ToListAsync();

            var response = list.Select(r => new RegistrationResponse
            {
                CourseId = r.CourseId,
                CourseName = r.Course?.Name ?? string.Empty,
                MemberId = r.MemberId,
                MemberName = r.Member?.Name ?? string.Empty,
                MemberCode = r.Member?.Code ?? string.Empty,
                MemberOtherName = r.Member?.OtherName,
                BedId = r.BedId,
                BedCode = r.Bed?.Code ?? string.Empty,
                AreaId = r.Bed?.AreaId,
                AreaName = r.Bed?.Area?.Name,
                DayAttend = r.DayAttend,
                Fromdate = r.Fromdate,
                Todate = r.Todate,
                Description = r.Description,
                RecievePhone = r.RecievePhone,
                RecieveIdentity = r.RecieveIdentity,
                CreatedAt = r.CreatedAt,
                CreatedBy = r.CreatedBy,
                UpdatedAt = r.UpdatedAt,
                UpdatedBy = r.UpdatedBy
            }).ToList();

            return Ok(response);
        }

        [HttpGet("{memberId}/{courseId}")]
        public async Task<ActionResult<RegistrationResponse>> GetRegistration(int memberId, int courseId)
        {
            var r = await _context.Registrations
                .Include(reg => reg.Course)
                .Include(reg => reg.Member)
                .Include(reg => reg.Bed)
                    .ThenInclude(b => b != null ? b.Area : null)
                .FirstOrDefaultAsync(reg => reg.MemberId == memberId && reg.CourseId == courseId);

            if (r == null) return NotFound(new { message = "Không tìm thấy đăng ký." });

            return Ok(new RegistrationResponse
            {
                CourseId = r.CourseId,
                CourseName = r.Course?.Name ?? string.Empty,
                MemberId = r.MemberId,
                MemberName = r.Member?.Name ?? string.Empty,
                MemberCode = r.Member?.Code ?? string.Empty,
                MemberOtherName = r.Member?.OtherName,
                BedId = r.BedId,
                BedCode = r.Bed?.Code ?? string.Empty,
                AreaId = r.Bed?.AreaId,
                AreaName = r.Bed?.Area?.Name,
                DayAttend = r.DayAttend,
                Fromdate = r.Fromdate,
                Todate = r.Todate,
                Description = r.Description,
                RecievePhone = r.RecievePhone,
                RecieveIdentity = r.RecieveIdentity,
                CreatedAt = r.CreatedAt,
                CreatedBy = r.CreatedBy,
                UpdatedAt = r.UpdatedAt,
                UpdatedBy = r.UpdatedBy
            });
        }

        [HttpPost]
        public async Task<ActionResult<RegistrationResponse>> CreateRegistration([FromBody] RegistrationCreateRequest request)
        {
            var member = await _context.Members.FindAsync(request.MemberId);
            if (member == null) return BadRequest(new { message = "Thành viên không tồn tại." });

            var course = await _context.Courses.FindAsync(request.CourseId);
            if (course == null) return BadRequest(new { message = "Khóa tu không tồn tại." });

            var bed = await _context.Beds.FindAsync(request.BedId);
            if (bed == null) return BadRequest(new { message = "Chỗ ngủ không tồn tại." });

            var existingReg = await _context.Registrations
                .FirstOrDefaultAsync(r => r.CourseId == request.CourseId && r.MemberId == request.MemberId);

            if (existingReg != null)
            {
                // Thành viên đang tham gia khóa tu (chưa về) → không cho đăng ký lại
                if (existingReg.Todate == null)
                {
                    return BadRequest(new { message = "Thành viên này đang tham gia khóa tu này rồi." });
                }

                // Thành viên đã về → xử lý như đăng ký lại (UPDATE record cũ, reset Todate về null)
                var bedOccupiedForReReg = await _context.Registrations
                    .AnyAsync(r => !(r.MemberId == existingReg.MemberId && r.CourseId == existingReg.CourseId)
                                   && r.CourseId == request.CourseId && r.BedId == request.BedId && r.Todate == null);
                if (bedOccupiedForReReg)
                {
                    return BadRequest(new { message = "Chỗ ngủ này đã được đăng ký bởi thành viên khác trong khóa tu này." });
                }

                // Cập nhật lại thông tin đăng ký (đăng ký lại)
                existingReg.BedId = request.BedId;
                existingReg.DayAttend = request.DayAttend;
                existingReg.Fromdate = request.Fromdate;
                existingReg.Todate = null;
                existingReg.Description = request.Description;
                existingReg.RecievePhone = request.RecievePhone;
                existingReg.RecieveIdentity = request.RecieveIdentity;
                existingReg.UpdatedAt = DateTime.Now;
                existingReg.UpdatedBy = GetCurrentUserId();

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    return BadRequest(new { message = "Không thể cập nhật đăng ký. Vui lòng tải lại trang và thử lại." });
                }

                var reReg = await _context.Registrations
                    .Include(reg => reg.Course)
                    .Include(reg => reg.Member)
                    .Include(reg => reg.Bed)
                        .ThenInclude(b => b != null ? b.Area : null)
                    .FirstAsync(reg => reg.MemberId == existingReg.MemberId && reg.CourseId == existingReg.CourseId);

                return Ok(new RegistrationResponse
                {
                    CourseId = reReg.CourseId,
                    CourseName = reReg.Course?.Name ?? string.Empty,
                    MemberId = reReg.MemberId,
                    MemberName = reReg.Member?.Name ?? string.Empty,
                    MemberCode = reReg.Member?.Code ?? string.Empty,
                    MemberOtherName = reReg.Member?.OtherName,
                    BedId = reReg.BedId,
                    BedCode = reReg.Bed?.Code ?? string.Empty,
                    AreaId = reReg.Bed?.AreaId,
                    AreaName = reReg.Bed?.Area?.Name,
                    DayAttend = reReg.DayAttend,
                    Fromdate = reReg.Fromdate,
                    Todate = reReg.Todate,
                    Description = reReg.Description,
                    RecievePhone = reReg.RecievePhone,
                    RecieveIdentity = reReg.RecieveIdentity,
                    CreatedAt = reReg.CreatedAt,
                    CreatedBy = reReg.CreatedBy,
                    UpdatedAt = reReg.UpdatedAt,
                    UpdatedBy = reReg.UpdatedBy
                });
            }

            var occupied = request.Todate == null && await _context.Registrations
                .AnyAsync(r => r.CourseId == request.CourseId && r.BedId == request.BedId && r.Todate == null);
            if (occupied)
            {
                return BadRequest(new { message = "Chỗ ngủ này đã được đăng ký bởi thành viên khác trong khóa tu này." });
            }

            var r = new Registration
            {
                CourseId = request.CourseId,
                MemberId = request.MemberId,
                BedId = request.BedId,
                DayAttend = request.DayAttend,
                Fromdate = request.Fromdate,
                Todate = request.Todate,
                Description = request.Description,
                RecievePhone = request.RecievePhone,
                RecieveIdentity = request.RecieveIdentity,
                CreatedAt = DateTime.Now,
                CreatedBy = GetCurrentUserId()
            };

            try
            {
                _context.Registrations.Add(r);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Không thể đăng ký. Có thể thành viên này đã đăng ký tham gia khóa tu, hoặc giường này đã được người khác chọn. Vui lòng tải lại trang và thử lại." });
            }

            var created = await _context.Registrations
                .Include(reg => reg.Course)
                .Include(reg => reg.Member)
                .Include(reg => reg.Bed)
                    .ThenInclude(b => b != null ? b.Area : null)
                .FirstAsync(reg => reg.MemberId == r.MemberId && reg.CourseId == r.CourseId);

            return CreatedAtAction(nameof(GetRegistration), new { memberId = created.MemberId, courseId = created.CourseId }, new RegistrationResponse
            {
                CourseId = created.CourseId,
                CourseName = created.Course?.Name ?? string.Empty,
                MemberId = created.MemberId,
                MemberName = created.Member?.Name ?? string.Empty,
                MemberCode = created.Member?.Code ?? string.Empty,
                MemberOtherName = created.Member?.OtherName,
                BedId = created.BedId,
                BedCode = created.Bed?.Code ?? string.Empty,
                AreaId = created.Bed?.AreaId,
                AreaName = created.Bed?.Area?.Name,
                DayAttend = created.DayAttend,
                Fromdate = created.Fromdate,
                Todate = created.Todate,
                Description = created.Description,
                RecievePhone = created.RecievePhone,
                RecieveIdentity = created.RecieveIdentity,
                CreatedAt = created.CreatedAt,
                CreatedBy = created.CreatedBy,
                UpdatedAt = created.UpdatedAt,
                UpdatedBy = created.UpdatedBy
            });
        }

        [HttpPut("{memberId}/{courseId}")]
        public async Task<IActionResult> UpdateRegistration(int memberId, int courseId, [FromBody] RegistrationCreateRequest request)
        {
            var r = await _context.Registrations.FirstOrDefaultAsync(reg => reg.MemberId == memberId && reg.CourseId == courseId);
            if (r == null) return NotFound(new { message = "Không tìm thấy đăng ký." });

            var member = await _context.Members.FindAsync(request.MemberId);
            if (member == null) return BadRequest(new { message = "Thành viên không tồn tại." });

            var course = await _context.Courses.FindAsync(request.CourseId);
            if (course == null) return BadRequest(new { message = "Khóa tu không tồn tại." });

            var bed = await _context.Beds.FindAsync(request.BedId);
            if (bed == null) return BadRequest(new { message = "Chỗ ngủ không tồn tại." });

            var occupied = request.Todate == null && await _context.Registrations
                .AnyAsync(reg => !(reg.MemberId == memberId && reg.CourseId == courseId) && reg.CourseId == request.CourseId && reg.BedId == request.BedId && reg.Todate == null);
            if (occupied)
            {
                return BadRequest(new { message = "Chỗ ngủ này đã được đăng ký bởi thành viên khác trong khóa tu này." });
            }

            // Since primary key cannot be easily modified directly in EF Core, if they are modifying MemberId or CourseId:
            if (r.MemberId != request.MemberId || r.CourseId != request.CourseId)
            {
                // Delete old one and create new one
                _context.Registrations.Remove(r);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    return BadRequest(new { message = "Lỗi khi cập nhật đăng ký." });
                }

                var newReg = new Registration
                {
                    CourseId = request.CourseId,
                    MemberId = request.MemberId,
                    BedId = request.BedId,
                    DayAttend = request.DayAttend,
                    Fromdate = request.Fromdate,
                    Todate = request.Todate,
                    Description = request.Description,
                    RecievePhone = request.RecievePhone,
                    RecieveIdentity = request.RecieveIdentity,
                    CreatedAt = DateTime.Now,
                    CreatedBy = GetCurrentUserId(),
                    UpdatedAt = request.Todate != null ? DateTime.Now : null,
                    UpdatedBy = request.Todate != null ? GetCurrentUserId() : null
                };
                _context.Registrations.Add(newReg);
            }
            else
            {
                r.BedId = request.BedId;
                r.DayAttend = request.DayAttend;
                r.Fromdate = request.Fromdate;
                r.Todate = request.Todate;
                r.Description = request.Description;
                r.RecievePhone = request.RecievePhone;
                r.RecieveIdentity = request.RecieveIdentity;
                r.UpdatedAt = DateTime.Now;
                r.UpdatedBy = GetCurrentUserId();
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { message = "Không thể lưu thông tin. Giường ngủ hoặc thành viên này đã được đăng ký bởi người khác. Vui lòng tải lại trang và thử lại." });
            }
            return NoContent();
        }

        [HttpDelete("{memberId}/{courseId}")]
        public async Task<IActionResult> DeleteRegistration(int memberId, int courseId)
        {
            var r = await _context.Registrations.FirstOrDefaultAsync(reg => reg.MemberId == memberId && reg.CourseId == courseId);
            if (r == null) return NotFound(new { message = "Không tìm thấy đăng ký." });

            _context.Registrations.Remove(r);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
