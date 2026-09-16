import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";
import {
  LayoutDashboard,
  Users,
  Compass,
  BedDouble,
  ClipboardList,
  LogOut,
  Menu,
  ChevronRight,
  User as UserIcon,
  BookUser,
  CalendarDays,
  Smartphone
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Retrieve user session
  const userJson = localStorage.getItem("user");
  const user = userJson ? JSON.parse(userJson) : { displayName: "Khách", role: "Staff", username: "guest" };

  const { confirm, toast } = useToast();

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: "Xác nhận đăng xuất",
      description: "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý khóa tu?",
      confirmText: "Đăng xuất",
      cancelText: "Hủy bỏ",
      variant: "destructive"
    });

    if (isConfirmed) {
      localStorage.removeItem("user");
      toast("info", "Đã đăng xuất", "Hẹn gặp lại quý vị.");
      navigate("/login");
    }
  };

  const navItems = [
    { title: "Tổng quan", path: "/", icon: LayoutDashboard },
    { title: "Quản lý Khóa tu", path: "/retreats", icon: Compass },
    { title: "Quản lý Thành viên", path: "/members", icon: BookUser },
    { title: "Sơ đồ Chỗ ngủ", path: "/beds", icon: BedDouble },
    { title: "Đăng ký Tham gia", path: "/registrations", icon: ClipboardList },
    { title: "Quản lý Sự kiện", path: "/events", icon: CalendarDays },
    { title: "Quản trị Users", path: "/users", icon: Users, adminOnly: true },
  ];

  // Map route path to human-readable Vietnamese breadcrumb label
  const getBreadcrumbLabel = () => {
    switch (currentPath) {
      case "/":
        return "Tổng quan";
      case "/users":
        return "Quản trị Users";
      case "/retreats":
        return "Quản lý Khóa tu";
      case "/members":
        return "Quản lý Thành viên";
      case "/beds":
        return "Sơ đồ Chỗ ngủ";
      case "/registrations":
        return "Đăng ký Tham gia";
      case "/events":
        return "Quản lý Sự kiện";
      case "/mobile":
      case "/qr":
        return "Giao diện Mobile";
      default:
        return "Hệ thống";
    }
  };

  return (
    <SidebarProvider>
      {/* Sidebar implementation */}
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
        <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b border-sidebar-border group-data-[state=collapsed]:p-0">
          <div className="flex items-center gap-2 font-semibold w-full justify-start group-data-[state=collapsed]:justify-center">
            <div className="flex h-10 w-10 items-center justify-center shrink-0">
              <img src="/images/logo_cvd.png" alt="Logo" className="h-10 w-10 animate-pulse" />
            </div>
            <img src="/images/logo_KTPT.png" alt="Logo" className="w-25 group-data-[state=collapsed]:hidden" />
          </div>
        </SidebarHeader>

        <SidebarContent className="py-4">
          <SidebarGroup>
            <SidebarGroupContent className="mt-2">
              <SidebarMenu>
                {navItems.map((item) => {
                  // Filter admin only items
                  if (item.adminOnly && user.role !== "Admin") return null;

                  const isActive = currentPath === item.path;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.path} className="py-0.5">
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${isActive
                          ? "bg-primary text-primary-foreground font-medium shadow-sm scale-[1.02]"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                          }`}
                      >
                        <Link to={item.path} className="flex items-center gap-3 w-full">
                          <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-primary-foreground group-hover:text-gray-500" : "text-muted-foreground"}`} />
                          <span className="text-sm font-medium tracking-wide group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex flex-col gap-3 group-data-[collapsible=icon]:items-center">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-inner">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden truncate">
                <span className="text-sm font-semibold text-foreground truncate">{user.displayName || user.fullName}</span>
                <span className="text-xs text-muted-foreground capitalize font-medium">{user.role}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 hover:text-destructive font-medium transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
              <span className="group-data-[collapsible=icon]:hidden">Đăng xuất</span>
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content Area */}
      <SidebarInset className="flex flex-col flex-1 overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-border bg-card sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-all">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <span>Hệ thống</span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-semibold">{getBreadcrumbLabel()}</span>
            </div>
          </div>

          <Link to="/mobile" className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Giao diện Mobile</span>
            <span className="sm:hidden">Mobile</span>
          </Link>
        </header>

        <main className="flex-1 p-6 md:p-8 bg-background overflow-y-auto">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
