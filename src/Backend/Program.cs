using Microsoft.EntityFrameworkCore;
using Backend.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure SQL Server Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Enable CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "V1 API");
    // Option: If you want Swagger at the app root URL (e.g. http://localhost/ or http://localhost/backend/), set:
    // c.RoutePrefix = string.Empty;
});

// In local dev, we don't strictly require HTTPS redirection to simplify frontend-backend connectivity
// app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

// Seed database at startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        if (!context.Users.Any())
        {
            context.Users.Add(new Backend.Models.User
            {
                Id = 1,
                Username = "admin",
                Password = Backend.Helpers.HashHelper.HashPassword("admin123"),
                DisplayName = "Quản trị viên",
                Active = true
            });
            context.SaveChanges();
        }

        // Fix zero rows and cols for existing areas
        var zeroAreas = context.Areas.Where(a => a.Rows == 0 || a.Cols == 0).ToList();
        if (zeroAreas.Any())
        {
            foreach (var a in zeroAreas)
            {
                if (a.Rows == 0) a.Rows = 6;
                if (a.Cols == 0) a.Cols = 6;
            }
            context.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

app.Run();
