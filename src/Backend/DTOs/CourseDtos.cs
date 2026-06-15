using System;
using System.Collections.Generic;

namespace Backend.DTOs
{
    public class CourseCreateRequest
    {
        public string Name { get; set; } = string.Empty;
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
    }

    public class CourseResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DateTime? Fromdate { get; set; }
        public DateTime? Todate { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public int ParticipantCount { get; set; }
    }
}
