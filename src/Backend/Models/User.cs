using System;

namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string? DisplayName { get; set; }
        public string? Username { get; set; }
        public string? Password { get; set; } // Stores hashed password
        public bool? Active { get; set; }
    }
}
