import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiService, type Course, type Member, type Bed, type Registration, type Event } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Compass,
  Users,
  BedDouble,
  ClipboardList,
  ArrowRight,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  const [retreats, setRetreats] = useState<Course[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [rData, mData, bData, regData, eData] = await Promise.all([
          apiService.courses.getAll(),
          apiService.members.getAll(),
          apiService.beds.getAll(),
          apiService.registrations.getAll(),
          apiService.events.getAll(),
        ]);
        setRetreats(rData);
        setMembers(mData);
        setBeds(bData);
        setRegistrations(regData);
        setEvents(eData);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu tổng quan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-sm text-muted-foreground font-medium">Đang tải dữ liệu tổng quan...</span>
      </div>
    );
  }

  // Derived statistics
  const totalRetreats = retreats.length;
  const totalMembers = members.length;

  const isCourseActive = (course: Course) => {
    if (!course.todate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(course.todate);
    end.setHours(0, 0, 0, 0);
    return today <= end;
  };

  const activeCoursesList = retreats.filter(isCourseActive);
  let targetCourse: Course | null = null;
  if (activeCoursesList.length > 0) {
    targetCourse = activeCoursesList[0];
  } else if (retreats.length > 0) {
    const sorted = [...retreats].sort((a, b) => new Date(b.fromdate).getTime() - new Date(a.fromdate).getTime());
    targetCourse = sorted[0];
  }

  // Bed stats: vacant beds / total assignable beds
  const totalAssignableBeds = beds.filter(b => b.active !== false && b.type !== "Vách ngăn").length;
  const occupiedBedsInCourse = targetCourse
    ? registrations.filter(r => r.courseId === targetCourse.id && !r.todate && r.bedId).length
    : 0;
  const vacantBedsCount = totalAssignableBeds - occupiedBedsInCourse;
  const bedVacancyRate = totalAssignableBeds > 0 ? Math.round((vacantBedsCount / totalAssignableBeds) * 100) : 0;

  // Participant stats: active participants (total - checked out) / total registrations
  const totalCourseRegs = targetCourse
    ? registrations.filter(r => r.courseId === targetCourse.id).length
    : 0;
  const attendingCourseRegs = targetCourse
    ? registrations.filter(r => r.courseId === targetCourse.id && !r.todate).length
    : 0;

  const stats = [
    {
      title: "Tổng số Thành viên",
      value: totalMembers,
      description: "Thành viên đã tham gia đăng ký",
      icon: Users,
      color: "from-emerald-500 to-teal-500",
      link: "/members",
    },
    {
      title: "Tổng số Khóa tu",
      value: totalRetreats,
      description: targetCourse
        ? (activeCoursesList.length > 0 ? `Đang diễn ra: ${targetCourse.name}` : `Khóa tu gần nhất: ${targetCourse.name}`)
        : "Hiện tại không có khóa tu diễn ra",
      icon: Compass,
      color: "from-blue-500 to-indigo-500",
      link: "/retreats",
    },
    {
      title: "Chỗ ngủ",
      value: `${vacantBedsCount} / ${totalAssignableBeds}`,
      description: `Còn trống ${vacantBedsCount} giường (${bedVacancyRate}%)`,
      icon: BedDouble,
      color: "from-amber-500 to-orange-500",
      link: "/beds",
    },
    {
      title: "Số lượng tham gia",
      value: `${attendingCourseRegs} / ${totalCourseRegs}`,
      description: `Đã về: ${totalCourseRegs - attendingCourseRegs}`,
      icon: ClipboardList,
      color: "from-pink-500 to-rose-500",
      link: "/registrations",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Tổng quan hệ thống</h1>
        <p className="text-muted-foreground">Chào mừng bạn trở lại trang quản lý Khóa tu - Chùa Vạn Đức.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden border border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.01]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${stat.color} text-white shadow-inner`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.description}</p>
                <Link to={stat.link} className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-4">
                  Chi tiết <ArrowRight className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Events card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">LỊCH TU HỌC & PHẬT SỰ</CardTitle>
              <CardDescription className="italic">Tất cả các ngày đều được tính bằng Âm lịch.</CardDescription>
            </div>
            <Link to="/events" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Chi tiết <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {events.filter(e => e.isActive).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                <Calendar className="h-10 w-10 text-muted-foreground/50" />
                Chưa có sự kiện nổi bật nào được bật hiển thị.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[...events]
                  .filter(e => e.isActive)
                  .sort((a, b) => {
                    const parseLunar = (d: string) => {
                      const [day, month] = d.split("/").map(Number);
                      return (month || 0) * 100 + (day || 0);
                    };
                    return parseLunar(a.fromDate) - parseLunar(b.fromDate);
                  })
                  .map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="space-y-1">
                        <span className="text-sm text-foreground block">{ev.fromDate === ev.toDate ? ` ${ev.fromDate}` : `${ev.fromDate} - ${ev.toDate}`} (ÂL): <span className="text-emerald-500 font-bold">{ev.name}</span></span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="border border-border shadow-sm bg-gradient-to-br from-card to-accent/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold">THAO TÁC NHANH</CardTitle>
            <CardDescription>Các liên kết tắt giúp bạn quản lý sơ đồ và bố trí chỗ nghỉ nhanh chóng.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link
              to="/members"
              className="flex flex-col items-center justify-center p-5 bg-card hover:bg-accent/10 border border-border rounded-xl text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground">Quản lý Thành viên</span>
              <span className="text-xs text-muted-foreground mt-1">Thông tin Phật tử</span>
            </Link>
            <Link
              to="/registrations"
              className="flex flex-col items-center justify-center p-5 bg-card hover:bg-accent/10 border border-border rounded-xl text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow"
            >
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                <ClipboardList className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground">Đăng ký mới</span>
              <span className="text-xs text-muted-foreground mt-1">Xếp phòng & chỗ nằm</span>
            </Link>


            <Link
              to="/retreats"
              className="flex flex-col items-center justify-center p-5 bg-card hover:bg-accent/10 border border-border rounded-xl text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow"
            >
              <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                <Compass className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground">Thông tin Khóa tu</span>
              <span className="text-xs text-muted-foreground mt-1">Cài đặt & quản lý khóa tu</span>
            </Link>
            <Link
              to="/beds"
              className="flex flex-col items-center justify-center p-5 bg-card hover:bg-accent/10 border border-border rounded-xl text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow"
            >
              <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <BedDouble className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground">Sắp xếp Sơ đồ ngủ</span>
              <span className="text-xs text-muted-foreground mt-1">Kéo thả chỗ ngủ</span>
            </Link>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
