using Microsoft.EntityFrameworkCore;
using Backend.Models;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Area> Areas { get; set; }
        public DbSet<Bed> Beds { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<Registration> Registrations { get; set; }
        public DbSet<Event> Events { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure table names
            modelBuilder.Entity<User>().ToTable("User");
            modelBuilder.Entity<Area>().ToTable("Area");
            modelBuilder.Entity<Bed>().ToTable("Bed");
            modelBuilder.Entity<Course>().ToTable("Course");
            modelBuilder.Entity<Member>().ToTable("Member");
            modelBuilder.Entity<Registration>().ToTable("Registration");
            modelBuilder.Entity<Event>().ToTable("Event");

            // Configure primary keys to not generate values on Add since SQL script has no IDENTITY columns
            modelBuilder.Entity<User>().HasKey(u => u.Id);
            modelBuilder.Entity<User>().Property(u => u.Id).ValueGeneratedNever();

            modelBuilder.Entity<Area>().HasKey(a => a.Id);
            modelBuilder.Entity<Area>().Property(a => a.Id).ValueGeneratedNever();

            modelBuilder.Entity<Bed>().HasKey(b => b.Id);
            modelBuilder.Entity<Bed>().Property(b => b.Id).ValueGeneratedNever();

            modelBuilder.Entity<Course>().HasKey(c => c.Id);
            modelBuilder.Entity<Course>().Property(c => c.Id).ValueGeneratedNever();

            modelBuilder.Entity<Member>().HasKey(m => m.Id);
            modelBuilder.Entity<Member>().Property(m => m.Id).ValueGeneratedNever();

            modelBuilder.Entity<Event>().HasKey(e => e.Id);
            modelBuilder.Entity<Event>().Property(e => e.Id).ValueGeneratedNever();

            // Configure Composite Key for Registration
            modelBuilder.Entity<Registration>()
                .HasKey(r => new { r.MemberId, r.CourseId });

            modelBuilder.Entity<Registration>()
                .HasIndex(r => new { r.CourseId, r.BedId })
                .HasFilter("[Todate] IS NULL")
                .IsUnique();

            // Configure relationships
            modelBuilder.Entity<Bed>()
                .HasOne(b => b.Area)
                .WithMany(a => a.Beds)
                .HasForeignKey(b => b.AreaId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Registration>()
                .HasOne(r => r.Member)
                .WithMany(m => m.Registrations)
                .HasForeignKey(r => r.MemberId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Registration>()
                .HasOne(r => r.Course)
                .WithMany(c => c.Registrations)
                .HasForeignKey(r => r.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Registration>()
                .HasOne(r => r.Bed)
                .WithMany(b => b.Registrations)
                .HasForeignKey(r => r.BedId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
