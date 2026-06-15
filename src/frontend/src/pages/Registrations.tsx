import React, { useEffect, useState } from "react";
import { apiService, type Registration, type Course, type Member, type Bed, type Area, type User } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Plus, ClipboardList, BedDouble, LayoutGrid, List, UserPlus, UserCheck, RefreshCw, CalendarCheck, History } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const formatDescription = (desc: string | undefined | null) => {
  if (!desc) return "";
  return desc
    .split(/[-\n]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("\n");
};

export default function Registrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // History dialog states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReg, setHistoryReg] = useState<Registration | null>(null);

  // Matrix and View mode states
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [matrixCourseId, setMatrixCourseId] = useState<number | "">("");

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [editCourseId, setEditCourseId] = useState<number | null>(null);

  // Form Fields
  const [courseId, setCourseId] = useState<number | "">("");
  const [memberId, setMemberId] = useState<number | "">("");
  const [fromdate, setFromdate] = useState("");
  const [todate, setTodate] = useState("");
  const [dayAttend, setDayAttend] = useState<number>(3);
  const [bedId, setBedId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [recievePhone, setRecievePhone] = useState(false);
  const [recieveIdentity, setRecieveIdentity] = useState(false);

  // Form states for new member registration
  const [memberType, setMemberType] = useState<"existing" | "new">("existing");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberOtherName, setNewMemberOtherName] = useState("");
  const [newMemberGender, setNewMemberGender] = useState("Nam");
  const [newMemberBirthYear, setNewMemberBirthYear] = useState<number>(new Date().getFullYear() - 30);
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRelativePhone, setNewMemberRelativePhone] = useState("");

  // Checkout states
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutReg, setCheckoutReg] = useState<Registration | null>(null);
  const [actualTodate, setActualTodate] = useState("");

  // Sort states
  const [sortField, setSortField] = useState<"status" | "memberCode" | "fromdate" | null>("fromdate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const isCourseActive = (course: Course) => {
    if (!course.todate) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(course.todate);
    end.setHours(0, 0, 0, 0);
    return today <= end;
  };

  const activeCourses = courses.filter(isCourseActive);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [cData, mData, aData, uData] = await Promise.all([
        apiService.courses.getAll(),
        apiService.members.getAll(),
        apiService.areas.getAll(),
        apiService.users.getAll(),
      ]);
      setCourses(cData);
      setMembers(mData);
      setAreas(aData);
      setUsers(uData);

      if (selectedAreaId === null && aData.length > 0) {
        setSelectedAreaId(aData[0].id);
      }

      let currentCourseIdForBeds: number | undefined = undefined;
      let filterCourseId: number | undefined = undefined;

      const activeCoursesList = cData.filter(isCourseActive);
      let defaultCourseId: number | "" = "";
      if (activeCoursesList.length > 0) {
        defaultCourseId = activeCoursesList[0].id;
      } else if (cData.length > 0) {
        const sorted = [...cData].sort((a, b) => new Date(b.fromdate).getTime() - new Date(a.fromdate).getTime());
        defaultCourseId = sorted[0].id;
      }

      if (viewMode === "matrix") {
        if (matrixCourseId !== "") {
          currentCourseIdForBeds = Number(matrixCourseId);
        } else if (activeCoursesList.length > 0) {
          currentCourseIdForBeds = activeCoursesList[0].id;
          setMatrixCourseId(activeCoursesList[0].id);
        }
      } else {
        const activeFilter = selectedCourseFilter === "" ? defaultCourseId : Number(selectedCourseFilter);
        currentCourseIdForBeds = activeFilter === "" ? undefined : activeFilter;
        filterCourseId = currentCourseIdForBeds;
        if (selectedCourseFilter === "" && defaultCourseId !== "") {
          setSelectedCourseFilter(defaultCourseId);
        }
      }

      const [bData, regData] = await Promise.all([
        apiService.beds.getAll(currentCourseIdForBeds),
        apiService.registrations.getAll(filterCourseId),
      ]);

      setBeds(bData);
      setRegistrations(regData);
    } catch (err: any) {
      setError(err.message || "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCourseFilter, viewMode, matrixCourseId]);

  // Update dates and day attend when course selection changes
  useEffect(() => {
    if (courseId !== "") {
      const selected = courses.find(c => c.id === courseId);
      if (selected) {
        if (selected.fromdate) {
          setFromdate(selected.fromdate.substring(0, 10));
        }
        if (selected.fromdate && selected.todate) {
          const diffTime = Math.abs(new Date(selected.todate).getTime() - new Date(selected.fromdate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setDayAttend(diffDays);
        }
      }
    }
  }, [courseId, courses]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditMemberId(null);
    setEditCourseId(null);

    const activeCoursesList = courses.filter(isCourseActive);
    const initialCourseId = activeCoursesList.length > 0 ? activeCoursesList[0].id : "";

    setCourseId(initialCourseId);
    setMemberId("");
    setFromdate("");
    setTodate("");
    setDayAttend(3);

    // Select first vacant bed if available
    const selectable = getSelectableBeds(initialCourseId);
    setBedId(selectable.length > 0 ? selectable[0].id : "");

    setDescription("");
    setRecievePhone(false);
    setRecieveIdentity(false);
    setMemberType("existing");
    setNewMemberName("");
    setNewMemberOtherName("");
    setNewMemberGender("Nam");
    setNewMemberBirthYear(new Date().getFullYear() - 30);
    setNewMemberPhone("");
    setNewMemberRelativePhone("");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (reg: Registration) => {
    setIsEditing(true);
    setEditMemberId(reg.memberId);
    setEditCourseId(reg.courseId);
    setCourseId(reg.courseId);
    setMemberId(reg.memberId);
    setFromdate(reg.fromdate ? reg.fromdate.substring(0, 10) : "");
    setTodate(reg.todate ? reg.todate.substring(0, 10) : "");
    setDayAttend(reg.dayAttend ?? 3);
    setBedId(reg.bedId);
    setDescription(reg.description || "");
    setRecievePhone(reg.recievePhone ?? false);
    setRecieveIdentity(reg.recieveIdentity ?? false);
    setMemberType("existing");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (courseId === "" || bedId === "" || !fromdate) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc và chọn chỗ ngủ.");
      setSubmitting(false);
      return;
    }

    if (memberType === "existing" && memberId === "") {
      setError("Vui lòng chọn thành viên Phật tử.");
      setSubmitting(false);
      return;
    }

    if (memberType === "new" && !newMemberName.trim()) {
      setError("Họ tên thành viên mới không được bỏ trống.");
      setSubmitting(false);
      return;
    }

    try {
      let finalMemberId = memberId;

      if (!isEditing && memberType === "new") {
        const createdMember = await apiService.members.create({
          name: newMemberName,
          otherName: newMemberOtherName || undefined,
          gender: newMemberGender,
          yearOfBirth: newMemberBirthYear,
          phone: newMemberPhone || undefined,
          relativePhone: newMemberRelativePhone || undefined,
        });
        finalMemberId = createdMember.id;
      }

      const payload = {
        courseId,
        memberId: finalMemberId as number,
        bedId,
        dayAttend,
        fromdate,
        todate: isEditing ? (todate || undefined) : undefined,
        description,
        recievePhone,
        recieveIdentity
      };

      if (isEditing && editMemberId !== null && editCourseId !== null) {
        await apiService.registrations.update(editMemberId, editCourseId, payload);
        setSuccess("Cập nhật thông tin đăng ký thành công.");
      } else {
        await apiService.registrations.create(payload);
        setSuccess("Đăng ký thành viên tham gia khóa tu thành công.");
      }
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu đăng ký.");
    } finally {
      setSubmitting(false);
    }
  };

  const { confirm, toast } = useToast();

  const handleDelete = async (memberId: number, courseId: number) => {
    const isConfirmed = await confirm({
      title: "Xác nhận hủy đăng ký",
      description: "Bạn có chắc chắn muốn hủy đăng ký này? Chỗ ngủ của thành viên sẽ được trả về trạng thái trống.",
      confirmText: "Hủy đăng ký",
      cancelText: "Hủy bỏ",
      variant: "destructive"
    });

    if (!isConfirmed) return;
    setError("");
    setSuccess("");

    try {
      await apiService.registrations.delete(memberId, courseId);
      toast("success", "Thành công", "Hủy đăng ký khóa tu thành công.");
      loadData();
    } catch (err: any) {
      toast("error", "Lỗi", err.message || "Lỗi khi hủy đăng ký.");
    }
  };

  const getSelectableBeds = (activeCourseId: number | "" | null) => {
    const targetCourseId = activeCourseId || courseId;
    if (!targetCourseId) return [];

    const otherRegs = registrations.filter(
      r => r.courseId === targetCourseId &&
        !r.todate &&
        !(isEditing && r.memberId === editMemberId && r.courseId === editCourseId)
    );
    const occupiedBedIds = otherRegs.map(r => r.bedId);

    return beds.filter(
      b => b.active !== false && b.type === "Chỗ ngủ" && (!occupiedBedIds.includes(b.id) || b.id === bedId)
    );
  };

  const getSelectableMembers = () => {
    if (courseId === "") return [];
    return members.filter(m => {
      if (isEditing && m.id === editMemberId) return true;
      // Chỉ loại trừ thành viên ĐANG tham gia (Todate = null)
      // Thành viên đã về (Todate != null) vẫn có thể chọn để đăng ký lại
      const isCurrentlyActive = registrations.some(
        r => r.courseId === courseId && r.memberId === m.id && !r.todate
      );
      return !isCurrentlyActive;
    });
  };

  const handleOpenCheckout = (reg: Registration) => {
    setCheckoutReg(reg);
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localDate.toISOString().substring(0, 10);
    setActualTodate(todayStr);
    setCheckoutOpen(true);
  };

   const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutReg || !actualTodate) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        courseId: checkoutReg.courseId,
        memberId: checkoutReg.memberId,
        bedId: checkoutReg.bedId,
        dayAttend: checkoutReg.dayAttend,
        fromdate: checkoutReg.fromdate,
        todate: actualTodate,
        description: checkoutReg.description,
        recievePhone: checkoutReg.recievePhone,
        recieveIdentity: checkoutReg.recieveIdentity
      };
      await apiService.registrations.update(checkoutReg.memberId, checkoutReg.courseId, payload);
      setSuccess("Cập nhật ngày về thành công.");
      setCheckoutOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi cập nhật ngày về.");
    } finally {
      setSubmitting(false);
    }
  };


  const getSortedRegistrations = () => {
    let filtered = [...registrations];

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(r =>
        (r.memberName?.toLowerCase().includes(term)) ||
        (r.memberCode?.toLowerCase().includes(term)) ||
        (r.memberOtherName?.toLowerCase().includes(term)) ||
        (r.bedCode?.toLowerCase().includes(term)) ||
        (r.areaName?.toLowerCase().includes(term))
      );
    }

    if (!sortField) return filtered;

    filtered.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "memberCode") {
        valA = a.memberCode || "";
        valB = b.memberCode || "";
      } else if (sortField === "status") {
        valA = a.todate ? "completed" : "active";
        valB = b.todate ? "completed" : "active";
      } else if (sortField === "fromdate") {
        valA = a.fromdate ? new Date(a.fromdate).getTime() : 0;
        valB = b.fromdate ? new Date(b.fromdate).getTime() : 0;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const handleReRegister = (reg: Registration) => {
    setIsEditing(true);
    setEditMemberId(reg.memberId);
    setEditCourseId(reg.courseId);
    setCourseId(reg.courseId);
    setMemberId(reg.memberId);

    // Set new fromdate to today (local time)
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    setFromdate(localDate.toISOString().substring(0, 10));

    setTodate("");
    setDayAttend(3);
    setBedId("");
    setDescription(reg.description || "");
    setRecievePhone(reg.recievePhone ?? false);
    setRecieveIdentity(reg.recieveIdentity ?? false);
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenHistory = (reg: Registration) => {
    setHistoryReg(reg);
    setHistoryOpen(true);
  };

  const selectableBeds = getSelectableBeds(courseId === "" ? null : courseId);

  const handleCellClick = (bed: Bed) => {
    if (bed.type !== "Chỗ ngủ" || !bed.active) return;

    if (bed.isOccupied) {
      const targetCourseId = matrixCourseId || (activeCourses.length > 0 ? activeCourses[0].id : "");
      const reg = registrations.find(r => r.bedId === bed.id && r.courseId === targetCourseId && !r.todate);
      if (reg) {
        handleOpenEdit(reg);
      }
    } else {
      const targetCourseId = matrixCourseId || (activeCourses.length > 0 ? activeCourses[0].id : "");
      setIsEditing(false);
      setEditMemberId(null);
      setEditCourseId(null);
      setCourseId(targetCourseId);
      setMemberId("");
      setBedId(bed.id);

      const selectedCourse = courses.find(c => c.id === targetCourseId);
      if (selectedCourse) {
        if (selectedCourse.fromdate) setFromdate(selectedCourse.fromdate.substring(0, 10));
        if (selectedCourse.todate) setTodate(selectedCourse.todate.substring(0, 10));
      } else {
        setFromdate("");
        setTodate("");
      }
      setDayAttend(3);
      setDescription("");
      setRecievePhone(false);
      setRecieveIdentity(false);

      setMemberType("existing");
      setNewMemberName("");
      setNewMemberOtherName("");
      setNewMemberGender("Nam");
      setNewMemberBirthYear(new Date().getFullYear() - 30);
      setNewMemberPhone("");
      setNewMemberRelativePhone("");

      setError("");
      setSuccess("");
      setIsOpen(true);
    }
  };

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const gridRows = selectedArea?.rows || 6;
  const gridCols = selectedArea?.cols || 6;
  const activeAreaBeds = beds.filter(b => b.areaId === selectedAreaId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Đăng ký Khóa tu</h1>
          <p className="text-muted-foreground">Đăng ký tham gia và xếp chỗ ngủ cho từng Phật tử.</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center gap-1.5 font-semibold text-xs h-8"
            >
              <List className="h-3.5 w-3.5" /> Danh sách
            </Button>
            <Button
              variant={viewMode === "matrix" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("matrix")}
              className="flex items-center gap-1.5 font-semibold text-xs h-8"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Sơ đồ chỗ ngủ
            </Button>
          </div>

          <Button
            onClick={handleOpenAdd}
            disabled={activeCourses.length === 0}
            className="flex items-center gap-2 font-semibold text-xs h-8"
          >
            <Plus className="h-4 w-4" /> Đăng ký khóa tu
          </Button>
        </div>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 font-medium">
          {error}
        </div>
      )}

      {/* MATRIX VIEW SETTINGS */}
      {viewMode === "matrix" && (
        <Card className="border border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="w-[280px]">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Khóa tu hoạt động</Label>
              <Select value={matrixCourseId.toString()} onValueChange={(val) => setMatrixCourseId(Number(val))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Chọn khóa tu hoạt động" />
                </SelectTrigger>
                <SelectContent>
                  {activeCourses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[200px]">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Khu phòng</Label>
              <Select value={selectedAreaId?.toString() || ""} onValueChange={(val) => setSelectedAreaId(Number(val))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Chọn khu phòng" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end h-full">
              <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9 mt-5" title="Tải lại sơ đồ">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* LIST VIEW SETTINGS */}
      {viewMode === "list" && (
        <Card className="border border-border p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Tìm kiếm</Label>
              <Input
                placeholder="Tìm kiếm thông tin Phật tử hoặc vị trí chỗ ngủ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="w-[220px]">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Khóa tu</Label>
              <Select value={selectedCourseFilter.toString()} onValueChange={(val) => setSelectedCourseFilter(Number(val))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Chọn khóa tu" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[220px]">
              <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Sắp xếp</Label>
              <Select
                value={`${sortField || "fromdate"}-${sortOrder || "desc"}`}
                onValueChange={(val) => {
                  const [field, order] = val.split("-");
                  setSortField(field as any);
                  setSortOrder(order as any);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sắp xếp theo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fromdate-desc">Đăng ký mới nhất</SelectItem>
                  <SelectItem value="fromdate-asc">Đăng ký cũ nhất</SelectItem>
                  <SelectItem value="memberCode-asc">Mã Phật tử (A - Z)</SelectItem>
                  <SelectItem value="memberCode-desc">Mã Phật tử (Z - A)</SelectItem>
                  <SelectItem value="status-asc">Trạng thái (Chưa về trước)</SelectItem>
                  <SelectItem value="status-desc">Trạng thái (Đã về trước)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end h-full">
              <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9 mt-5" title="Tải lại danh sách">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* RENDER VIEW CONTENT */}
      {viewMode === "list" ? (
        <Card className="border border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">Danh sách đăng ký</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)", minHeight: "200px" }}>
                <Table noOverflow>
                  <TableHeader className="bg-muted/90 backdrop-blur-sm sticky top-0 z-10">
                    <TableRow className="border-b-2 border-border/70 hover:bg-transparent">
                      <TableHead className="font-bold text-center text-xs uppercase tracking-wide text-muted-foreground/80">Mã Thành viên</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-muted-foreground/80">Thành viên</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-muted-foreground/80">Ngày tham gia</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-muted-foreground/80">Số ngày Đăng ký</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-muted-foreground/80">Vị trí chỗ ngủ</TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wide text-muted-foreground/80">Trạng thái</TableHead>
                      <TableHead className="font-bold text-right text-xs uppercase tracking-wide text-muted-foreground/80">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Chưa có Phật tử nào đăng ký khóa tu này. Click nút Đăng ký để sắp xếp.
                        </TableCell>
                      </TableRow>
                    ) : (
                      getSortedRegistrations().map((r) => {
                        const getActualDays = (fromStr?: string, toStr?: string) => {
                          if (!fromStr || !toStr) return null;
                          const diffTime = new Date(toStr).getTime() - new Date(fromStr).getTime();
                          if (diffTime < 0) return 0;
                          return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                        };
                        const act = getActualDays(r.fromdate, r.todate);

                        return (
                          <TableRow key={`${r.memberId}-${r.courseId}`} className="hover:bg-accent/5">
                            <TableCell className="text-center">
                              <div className="font-semibold text-foreground">{r.memberCode}</div>
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground">{r.memberName}</div>
                              {r.memberOtherName && (
                                <div className="text-xs text-primary font-semibold mt-0.5">PD: {r.memberOtherName}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm font-medium">
                              {r.fromdate ? new Date(r.fromdate).toLocaleDateString("vi-VN") : ""} - {r.todate ? new Date(r.todate).toLocaleDateString("vi-VN") : "Chưa về"}
                            </TableCell>
                            <TableCell className="font-medium text-xs">
                              <span className="text-emerald-600 font-bold">{act !== null ? `${act} ngày` : "Chưa về"}</span>
                              <span className="text-muted-foreground/60 mx-1.5">/</span>
                              <span className="text-slate-600 font-semibold">{r.dayAttend} ngày đăng ký</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 w-fit">
                                  <BedDouble className="h-3 w-3" /> {r.bedCode}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium pl-1">{r.areaName || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${r.todate
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}>
                                {r.todate ? "Đã về" : "Đang tham gia"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenHistory(r)}
                                  className="h-8 w-8 text-slate-500 hover:bg-slate-500/10 rounded-lg"
                                  title="Xem lịch sử thao tác"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {r.todate ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReRegister(r)}
                                    className="h-8 w-8 text-blue-600 hover:bg-blue-500/10 rounded-lg animate-pulse"
                                    title="Đăng ký lại"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenCheckout(r)}
                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                                    title="Cập nhật ngày về"
                                  >
                                    <CalendarCheck className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEdit(r)}
                                  className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                                  title="Sửa đăng ký"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(r.memberId, r.courseId)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                                  title="Xóa đăng ký"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !selectedAreaId ? (
            <div className="text-center text-muted-foreground py-12">
              Vui lòng tạo Khu phòng ở trước khi xem sơ đồ.
            </div>
          ) : (
            <div>
              {/* Room Grid Matrix */}
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridRows }).flatMap((_, r) =>
                  Array.from({ length: gridCols }).map((_, c) => {
                    const bed = activeAreaBeds.find(b => b.rowNumber === r && b.orderNumber === c);
                    const targetCourseId = matrixCourseId || (activeCourses.length > 0 ? activeCourses[0]?.id : "");
                    const reg = bed ? registrations.find(rg => rg.bedId === bed.id && rg.courseId === targetCourseId && !rg.todate) : null;

                    let cellClass = "bg-muted/5 border-dashed border-slate-200/20 dark:border-slate-800/60 opacity-40 cursor-not-allowed";
                    if (bed) {
                      if (bed.type !== "Chỗ ngủ") {
                        cellClass = "bg-slate-700 dark:bg-slate-800 border-solid border-slate-900 shadow-sm text-slate-100";
                      } else if (!bed.active) {
                        cellClass = "bg-slate-100 dark:bg-slate-900/40 border-dashed border-slate-300 opacity-60 text-muted-foreground shadow-sm cursor-not-allowed";
                      } else if (bed.isOccupied) {
                        cellClass = "bg-indigo-500/10 dark:bg-indigo-950/30 border-solid border-indigo-500/30 shadow-sm cursor-pointer hover:bg-indigo-500/20 transition-all";
                      } else {
                        cellClass = "bg-card border-solid border-primary/20 shadow-sm cursor-pointer hover:border-primary/55 hover:scale-[1.02] transition-all";
                      }
                    }

                    return (
                      <div
                        key={`${r}-${c}`}
                        className={`relative min-h-[105px] border rounded-xl flex flex-col items-center justify-center p-3 select-none ${cellClass}`}
                        onClick={() => bed && handleCellClick(bed)}
                        title={bed ? (bed.type !== "Chỗ ngủ" ? bed.type : `Giường: ${bed.code}`) : `Trống`}
                      >
                        {bed ? (
                          bed.type !== "Chỗ ngủ" ? (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">
                              {bed.type}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col justify-between">
                              <div className="flex items-start justify-between">
                                <div className={`flex h-7 w-7 items-center justify-center rounded ${bed.isOccupied ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : !bed.active ? "bg-slate-200 text-slate-500" : "bg-primary/10 text-primary"}`}>
                                  <BedDouble className="h-4.5 w-4.5" />
                                </div>
                                {bed.isOccupied && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (reg) {
                                        handleOpenCheckout(reg);
                                      }
                                    }}
                                    className="h-6 w-6 text-emerald-600 hover:bg-emerald-500/10 rounded"
                                    title="Cập nhật ngày về"
                                  >
                                    <CalendarCheck className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>

                              <div className="mt-2">
                                <span className="text-xs font-bold text-foreground block">{bed.code}</span>
                                {bed.isOccupied ? (
                                  <div className="mt-1">
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate" title={bed.currentMemberName}>
                                      {bed.currentMemberName}
                                    </span>
                                    {reg?.memberOtherName && (
                                      <span className="text-[9px] text-primary font-semibold block truncate" title={reg.memberOtherName}>
                                        PD: {reg.memberOtherName}
                                      </span>
                                    )}
                                  </div>
                                ) : bed.description ? (
                                  <span className="text-[9px] leading-tight text-muted-foreground/80 font-semibold block mt-1 whitespace-pre-line" title={formatDescription(bed.description)}>
                                    {formatDescription(bed.description)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          )
                        ) : (
                          <span className="text-[9px] text-muted-foreground/30 font-semibold">
                            Trống
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-muted-foreground border-t pt-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-slate-900 bg-slate-700" /> Vách ngăn
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Registration Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[800px] h-[95vh] max-h-[95vh] flex flex-col p-6">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật phiếu đăng ký" : "Ghi nhận đăng ký khóa tu"}
              </DialogTitle>
              <DialogDescription>
                Điền thông tin và sắp xếp vị trí giường nằm cho Phật tử.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-1 overflow-y-auto px-1">
              {/* Left Column: Personnel / Member Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-1.5">Thông tin nhân sự / Phật tử</h3>

                {!isEditing && (
                  <div className="space-y-1">
                    <Label className="font-semibold text-xs text-foreground block">Hình thức</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant={memberType === "existing" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMemberType("existing")}
                        className="flex items-center gap-1 h-8 font-semibold text-xs flex-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Phật tử có sẵn
                      </Button>
                      <Button
                        type="button"
                        variant={memberType === "new" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMemberType("new")}
                        className="flex items-center gap-1 h-8 font-semibold text-xs flex-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Thêm Phật tử mới
                      </Button>
                    </div>
                  </div>
                )}

                {memberType === "existing" ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="member" className="font-semibold text-xs text-foreground">Chọn Phật tử <span className="text-destructive">*</span></Label>
                      <SearchableSelect
                        options={getSelectableMembers().map(m => ({
                          value: m.id,
                          label: `${m.code || ""} - ${m.name} (${m.gender} - ${m.yearOfBirth})`,
                          sublabel: `Pháp danh: ${m.otherName || "Chưa có"} | SĐT: ${m.phone || "Chưa có"}`
                        }))}
                        value={memberId}
                        onValueChange={(val) => setMemberId(val)}
                        placeholder="Tìm kiếm theo mã, tên hoặc pháp danh..."
                        disabled={isEditing}
                      />
                    </div>

                    {memberId !== "" && (
                      (() => {
                        const selectedMember = members.find(m => m.id === memberId);
                        if (!selectedMember) return null;

                        // Kiểm tra xem thành viên đã từng đăng ký và đã về chưa
                        const prevReg = !isEditing ? registrations.find(
                          r => r.courseId === courseId && r.memberId === (memberId as number) && !!r.todate
                        ) : null;
                        const isReRegistration = !!prevReg;

                        let recentCourse = "Chưa tham gia khóa nào";
                        if (selectedMember.courseHistory && selectedMember.courseHistory.length > 0) {
                          const sortedHistory = [...selectedMember.courseHistory].sort((a, b) => {
                            const dateA = a.fromdate ? new Date(a.fromdate).getTime() : 0;
                            const dateB = b.fromdate ? new Date(b.fromdate).getTime() : 0;
                            return dateB - dateA;
                          });
                          if (sortedHistory[0]) {
                            recentCourse = sortedHistory[0].courseName;
                          }
                        }

                        return (
                          <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs text-muted-foreground font-medium">
                            {isReRegistration && (
                              <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                                <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                                  ⟳ Đăng ký lại khóa tu
                                </span>
                                <span className="text-[10px] text-amber-600/80">
                                  (Thành viên đã từng tham gia và đã về)
                                </span>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="font-bold text-foreground">Pháp danh:</span> {selectedMember.otherName || "Chưa có"}</div>
                              <div><span className="font-bold text-foreground">Giới tính:</span> {selectedMember.gender || "Nam"}</div>
                              <div><span className="font-bold text-foreground">Năm sinh:</span> {selectedMember.yearOfBirth}</div>
                              <div><span className="font-bold text-foreground">Điện thoại:</span> {selectedMember.phone || "N/A"}</div>
                              {selectedMember.relativePhone && (
                                <div className="col-span-2"><span className="font-bold text-foreground">SĐT người thân:</span> {selectedMember.relativePhone}</div>
                              )}
                            </div>

                            <div className="border-t pt-2 mt-2 space-y-1">
                              <div><span className="font-bold text-foreground">Số khóa đã tham gia:</span> {selectedMember.joinedCoursesCount || 0} khóa</div>
                              <div><span className="font-bold text-foreground">Khóa gần nhất:</span> {recentCourse}</div>
                            </div>

                            {selectedMember.courseHistory && selectedMember.courseHistory.length > 0 && (
                              <div className="border-t pt-2 mt-2 space-y-1.5">
                                <div className="font-bold text-foreground mb-1">Chi tiết lịch sử tham gia:</div>
                                <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1">
                                  {selectedMember.courseHistory.map((h, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-[10px] bg-background/50 p-1.5 rounded border border-border/40">
                                      <span className="font-semibold text-foreground truncate max-w-[120px]">{h.courseName}</span>
                                      <span>
                                        Thực tế: <span className="font-bold text-emerald-600">{h.actualDays ? `${h.actualDays} ngày` : "Chưa về"}</span> / Đăng ký: <span className="font-bold text-slate-600">{h.dayAttend || 0} ngày</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-name" className="font-semibold text-xs text-foreground">Họ & Tên <span className="text-destructive">*</span></Label>
                      <Input
                        id="new-name"
                        placeholder="Nguyễn Văn A"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        required={memberType === "new"}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-otherName" className="font-semibold text-xs text-foreground">Pháp danh</Label>
                      <Input
                        id="new-otherName"
                        placeholder="Tâm Đức"
                        value={newMemberOtherName}
                        onChange={(e) => setNewMemberOtherName(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="new-gender" className="font-semibold text-xs text-foreground">Giới tính</Label>
                        <Select value={newMemberGender} onValueChange={setNewMemberGender}>
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Giới tính" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nam">Nam</SelectItem>
                            <SelectItem value="Nữ">Nữ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="new-birthYear" className="font-semibold text-xs text-foreground">Năm sinh <span className="text-destructive">*</span></Label>
                        <Input
                          id="new-birthYear"
                          type="number"
                          min={1920}
                          max={new Date().getFullYear()}
                          value={newMemberBirthYear}
                          onChange={(e) => setNewMemberBirthYear(parseInt(e.target.value) || new Date().getFullYear())}
                          required={memberType === "new"}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-phone" className="font-semibold text-xs text-foreground">Điện thoại</Label>
                      <Input
                        id="new-phone"
                        placeholder="0901234567"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-relativePhone" className="font-semibold text-xs text-foreground">SĐT người thân</Label>
                      <Input
                        id="new-relativePhone"
                        placeholder="Số điện thoại người thân..."
                        value={newMemberRelativePhone}
                        onChange={(e) => setNewMemberRelativePhone(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Registration / Space assignment Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-1.5">Thông tin Khóa tu & Xếp chỗ</h3>

                <div className="space-y-1">
                  <Label htmlFor="course" className="font-semibold text-xs text-foreground">Khóa tu <span className="text-destructive">*</span></Label>
                  <Select value={courseId.toString()} onValueChange={(val) => setCourseId(Number(val))} disabled={isEditing}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Chọn khóa tu" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCourses.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bed" className="font-semibold text-xs text-foreground">Bố trí giường <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    options={selectableBeds.map(b => ({
                      value: b.id,
                      label: `[${b.areaName}] Giường ${b.code} (${b.type})`,
                      sublabel: b.description || undefined
                    }))}
                    value={bedId}
                    onValueChange={(val) => setBedId(val)}
                    placeholder="Tìm vị trí ngủ..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="duration" className="font-semibold text-xs text-foreground">Số ngày ở <span className="text-destructive">*</span></Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={dayAttend}
                      onChange={(e) => setDayAttend(parseInt(e.target.value) || 1)}
                      required
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="start" className="font-semibold text-xs text-foreground">Từ ngày <span className="text-destructive">*</span></Label>
                    <Input
                      id="start"
                      type="date"
                      value={fromdate}
                      onChange={(e) => setFromdate(e.target.value)}
                      required
                      className="h-9"
                    />
                  </div>

                </div>

                <div className="space-y-1">
                  <Label htmlFor="desc" className="font-semibold text-xs text-foreground">Ghi chú</Label>
                  <Input
                    id="desc"
                    placeholder="Ghi chú đăng ký..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1 pt-1.5">
                  <Label className="font-semibold text-xs text-foreground block mb-2">Thu nhận</Label>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <input
                        id="recvPhone"
                        type="checkbox"
                        checked={recievePhone}
                        onChange={(e) => setRecievePhone(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor="recvPhone" className="text-xs cursor-pointer select-none font-semibold">Điện thoại</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="recvIdentity"
                        type="checkbox"
                        checked={recieveIdentity}
                        onChange={(e) => setRecieveIdentity(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor="recvIdentity" className="text-xs cursor-pointer select-none font-semibold">Giấy tờ tùy thân</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4 flex-shrink-0 mt-auto">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : (isEditing ? "Lưu" : "Xác nhận đăng ký")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleCheckoutSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Cập nhật ngày về thực tế</DialogTitle>
              <DialogDescription>
                Nhập ngày về thực tế của Phật tử khi kết thúc đợt tham gia khóa tu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {checkoutReg && (
                <div className="rounded-lg border bg-muted/20 p-3.5 space-y-1.5 text-xs text-muted-foreground font-medium">
                  <div><span className="font-bold text-foreground">Phật tử:</span> {checkoutReg.memberName}</div>
                  <div><span className="font-bold text-foreground">Khóa tu:</span> {checkoutReg.courseName}</div>
                  <div><span className="font-bold text-foreground">Chỗ ngủ:</span> {checkoutReg.bedCode} ({checkoutReg.areaName})</div>
                  <div><span className="font-bold text-foreground">Ngày vào:</span> {checkoutReg.fromdate ? new Date(checkoutReg.fromdate).toLocaleDateString("vi-VN") : ""}</div>
                  <div><span className="font-bold text-foreground">Số ngày đăng ký ở:</span> {checkoutReg.dayAttend} ngày</div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="actual-end" className="font-semibold text-xs text-foreground">Ngày về thực tế <span className="text-destructive">*</span></Label>
                <Input
                  id="actual-end"
                  type="date"
                  value={actualTodate}
                  onChange={(e) => setActualTodate(e.target.value)}
                  required
                  className="h-9"
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setCheckoutOpen(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu ngày về"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Chi tiết lịch sử thao tác
            </DialogTitle>
            <DialogDescription>
              Xem thông tin người thực hiện thao tác đăng ký và thao tác cho về.
            </DialogDescription>
          </DialogHeader>

          {historyReg ? (
            <div className="space-y-4 py-4 text-sm">
              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-1.5 text-xs text-muted-foreground font-medium">
                <div><span className="font-bold text-foreground">Phật tử:</span> {historyReg.memberName} {historyReg.memberOtherName ? `(PD: ${historyReg.memberOtherName})` : ""}</div>
                <div><span className="font-bold text-foreground">Mã thành viên:</span> {historyReg.memberCode || "N/A"}</div>
                <div><span className="font-bold text-foreground">Khóa tu:</span> {historyReg.courseName}</div>
                <div><span className="font-bold text-foreground">Chỗ ngủ:</span> {historyReg.bedCode} ({historyReg.areaName || "N/A"})</div>
              </div>

              <div className="space-y-3">
                <div className="border rounded-lg p-3 bg-card">
                  <div className="font-bold text-xs text-indigo-600 uppercase tracking-wider mb-2">Thao tác đăng ký</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Người đăng ký:</span>
                      <span className="font-semibold text-foreground">
                        {(() => {
                          const u = users.find(user => user.id === historyReg.createdBy);
                          return u ? u.displayName || u.username : historyReg.createdBy || "N/A";
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Thời gian:</span>
                      <span className="font-semibold text-foreground">
                        {historyReg.createdAt ? new Date(historyReg.createdAt).toLocaleString("vi-VN") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-3 bg-card">
                  <div className="font-bold text-xs text-emerald-600 uppercase tracking-wider mb-2">Thao tác cho về / Cập nhật</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Người thực hiện:</span>
                      <span className="font-semibold text-foreground">
                        {historyReg.updatedBy ? (
                          (() => {
                            const u = users.find(user => user.id === historyReg.updatedBy);
                            return u ? u.displayName || u.username : historyReg.updatedBy;
                          })()
                        ) : "Chưa có thao tác cho về"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Thời gian:</span>
                      <span className="font-semibold text-foreground">
                        {historyReg.updatedAt ? new Date(historyReg.updatedAt).toLocaleString("vi-VN") : "Chưa có thao tác cho về"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Không tìm thấy thông tin lịch sử thao tác.
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            <Button type="button" onClick={() => setHistoryOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
