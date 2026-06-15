using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class Member
    {
        public int Id { get; set; }
        public int? UniqueId { get; set; }
        public string? Code { get; set; }
        public string? Name { get; set; }
        public string? OtherName { get; set; }
        public int? YearOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public DateTime CreatedAt { get; set; }
        public int CreatedBy { get; set; }
        public string? IdentityImage { get; set; }
        public string? RelativePhone { get; set; }

        // Navigation properties
        [JsonIgnore]
        public List<Registration> Registrations { get; set; } = new List<Registration>();
    }
}
