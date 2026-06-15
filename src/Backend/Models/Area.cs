using System;
using System.Collections.Generic;

namespace Backend.Models
{
    public class Area
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int Rows { get; set; } = 6;
        public int Cols { get; set; } = 6;
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }

        // Navigation properties
        public List<Bed> Beds { get; set; } = new List<Bed>();
    }
}
