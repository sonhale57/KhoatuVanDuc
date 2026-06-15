using System;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class Registration
    {
        public int MemberId { get; set; }
        public int CourseId { get; set; }
        public int BedId { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public int? DayAttend { get; set; }
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public string? Description { get; set; }
        public bool? RecievePhone { get; set; }
        public bool? RecieveIdentity { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }

        // Navigation properties
        public Member? Member { get; set; }
        
        [JsonIgnore]
        public Course? Course { get; set; }
        
        public Bed? Bed { get; set; }
    }
}
