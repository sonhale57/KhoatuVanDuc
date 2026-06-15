using System;

namespace Backend.DTOs
{
    public class AreaCreateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Rows { get; set; } = 6;
        public int Cols { get; set; } = 6;
    }

    public class AreaResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Rows { get; set; }
        public int Cols { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
    }
}
