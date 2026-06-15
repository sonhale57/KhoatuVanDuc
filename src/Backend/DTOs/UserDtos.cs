using System;

namespace Backend.DTOs
{
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserCreateRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public bool Active { get; set; } = true;
    }

    public class UserUpdateRequest
    {
        public string DisplayName { get; set; } = string.Empty;
        public string? Password { get; set; }
        public bool Active { get; set; } = true;
    }

    public class UserResponse
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = "Admin"; // Kept for frontend compatibility
        public bool Active { get; set; }
    }
}
