using System;

namespace Backend.DTOs
{
    public class MemberCreateRequest
    {
        public int? UniqueId { get; set; }
        public string? Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? OtherName { get; set; }
        public int? YearOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public string? RelativePhone { get; set; }
        public string? IdentityImage { get; set; }
    }

    public class MemberResponse
    {
        public int Id { get; set; }
        public int? UniqueId { get; set; }
        public string? Code { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? OtherName { get; set; }
        public int? YearOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public string? RelativePhone { get; set; }
        public string? IdentityImage { get; set; }
        public int JoinedCoursesCount { get; set; }
        public List<MemberCourseHistoryDto>? CourseHistory { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
    }

    public class MemberCourseHistoryDto
    {
        public int CourseId { get; set; }
        public string CourseName { get; set; } = string.Empty;
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public int? DayAttend { get; set; }
        public int? ActualDays { get; set; }
    }
}
