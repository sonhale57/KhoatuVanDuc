using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class Bed
    {
        public int Id { get; set; }
        public int? AreaId { get; set; }
        public string? Code { get; set; }
        public string? Description { get; set; }
        public bool? Active { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public int? RowNumber { get; set; }
        public int? OrderNumber { get; set; }
        public string? Type { get; set; }

        // Navigation properties
        [JsonIgnore]
        public Area? Area { get; set; }

        [JsonIgnore]
        public List<Registration> Registrations { get; set; } = new List<Registration>();
    }
}
