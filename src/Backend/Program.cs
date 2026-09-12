using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Backend.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configure Swagger with JWT Bearer Support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "KhoatuVanDuc API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure SQL Server Database with SQL Server 2008 / 2008 R2 Compatibility Level (100)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.UseCompatibilityLevel(100); // Ensures ROW_NUMBER() OVER() is used instead of OFFSET...FETCH
            sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
        }
    ));

// Configure JWT Authentication
var secretKey = builder.Configuration["JwtSettings:SecretKey"] ?? "KhoatuVanDuc_Super_Secret_Key_For_Jwt_Token_Authentication_2026!#";
var key = Encoding.UTF8.GetBytes(secretKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS Policy (Strict for Production, Dev friendly fallback)
var allowedOrigins = builder.Configuration.GetSection("CorsAllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173", "http://localhost:3000", "http://apiqlkt.chuavanduc.vn", "http://chuavanduc.vn" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("StrictCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "KhoatuVanDuc API V1");
});

app.UseCors("StrictCorsPolicy");

app.UseAuthentication();
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
