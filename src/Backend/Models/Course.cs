using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Course
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }

        // Navigation properties
        public List<Registration> Registrations { get; set; } = new List<Registration>();
    }
}
