using System;

namespace Backend.DTOs
{
    public class RegistrationCreateRequest
    {
        public int CourseId { get; set; }
        public int MemberId { get; set; }
        public int BedId { get; set; }
        public int? DayAttend { get; set; }
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public string? Description { get; set; }
        public bool? RecievePhone { get; set; }
        public bool? RecieveIdentity { get; set; }
    }

    public class RegistrationResponse
    {
        public int CourseId { get; set; }
        public string CourseName { get; set; } = string.Empty;
        public int MemberId { get; set; }
        public string MemberName { get; set; } = string.Empty;
        public string MemberCode { get; set; } = string.Empty;
        public string? MemberOtherName { get; set; }
        public int BedId { get; set; }
        public string BedCode { get; set; } = string.Empty;
        public int? AreaId { get; set; }
        public string? AreaName { get; set; }
        public int? DayAttend { get; set; }
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public string? Description { get; set; }
        public bool? RecievePhone { get; set; }
        public bool? RecieveIdentity { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }
    }
}
