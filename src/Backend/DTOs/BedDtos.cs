using System;

namespace Backend.DTOs
{
    public class BedCreateRequest
    {
        public int? AreaId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool Active { get; set; } = true;
        public int? RowNumber { get; set; }
        public int? OrderNumber { get; set; }
        public string? Type { get; set; }
    }

    public class BedPositionUpdate
    {
        public int Id { get; set; }
        public int RowNumber { get; set; }
        public int OrderNumber { get; set; }
    }

    public class BedResponse
    {
        public int Id { get; set; }
        public int? AreaId { get; set; }
        public string? AreaName { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool Active { get; set; }
        public int? RowNumber { get; set; }
        public int? OrderNumber { get; set; }
        public string? Type { get; set; }
        
        // Dynamic status for a specific course/retreat
        public int? CurrentMemberId { get; set; }
        public string? CurrentMemberName { get; set; }
        public bool IsOccupied { get; set; }
    }
}
