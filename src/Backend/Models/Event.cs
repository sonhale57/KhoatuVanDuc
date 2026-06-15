using System;

namespace Backend.Models
{
    public class Event
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FromDate { get; set; } = string.Empty; // Lunar date e.g. "15/01"
        public string ToDate { get; set; } = string.Empty;   // Lunar date e.g. "15/01"
        public bool IsActive { get; set; } // Show on dashboard
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
    }
}
