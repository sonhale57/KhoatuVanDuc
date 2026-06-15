import React, { useEffect, useState } from "react";
import { apiService, type Event } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit, Plus, CalendarDays } from "lucide-react";

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dialog Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiService.events.getAll();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách sự kiện.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setFromDate("");
    setToDate("");
    setIsActive(true);
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (ev: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditId(ev.id);
    setName(ev.name);
    setFromDate(ev.fromDate);
    setToDate(ev.toDate);
    setIsActive(ev.isActive);
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Simple validation for dd/MM lunar format
    const lunarPattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
    if (!lunarPattern.test(fromDate) || !lunarPattern.test(toDate)) {
      setError("Định dạng ngày âm lịch phải là ngày/tháng (ví dụ: 15/01, 01/01).");
      return;
    }

    try {
      const payload = { name, fromDate, toDate, isActive };
      if (isEditing && editId !== null) {
        await apiService.events.update(editId, payload);
        setSuccess("Cập nhật thông tin sự kiện thành công.");
      } else {
        await apiService.events.create(payload);
        setSuccess("Tạo sự kiện mới thành công.");
      }
      setIsOpen(false);
      loadEvents();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu thông tin sự kiện.");
    }
  };

  const handleDelete = async (ev: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa sự kiện "${ev.name}"?`)) return;
    setError("");
    setSuccess("");

    try {
      await apiService.events.delete(ev.id);
      setSuccess("Xóa sự kiện thành công.");
      loadEvents();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xóa sự kiện.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Quản lý Sự kiện Âm lịch</h1>
          <p className="text-muted-foreground">Xem danh sách, cài đặt các ngày đại lễ và sự kiện âm lịch trong năm.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Thêm sự kiện
        </Button>
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

      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto relative">
              <Table>
                <TableHeader className="bg-muted/90 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <TableRow>
                    <TableHead className="font-bold">Tên Sự kiện</TableHead>
                    <TableHead className="font-bold">Từ ngày (Âm lịch)</TableHead>
                    <TableHead className="font-bold">Đến ngày (Âm lịch)</TableHead>
                    <TableHead className="font-bold text-center">Hiển thị Dashboard</TableHead>
                    <TableHead className="font-bold text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Chưa có sự kiện nào được ghi nhận. Click Thêm để bắt đầu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...events]
                    .sort((a, b) => {
                      const parseLunar = (d: string) => {
                        const [day, month] = d.split("/").map(Number);
                        return (month || 0) * 100 + (day || 0);
                      };
                      return parseLunar(a.fromDate) - parseLunar(b.fromDate);
                    })
                    .map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-accent/10 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4.5 w-4.5 text-primary" />
                            <span className="text-foreground font-semibold">{ev.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">Ngày {ev.fromDate}</TableCell>
                        <TableCell className="font-bold text-slate-700">Ngày {ev.toDate}</TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${ev.isActive
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-gray-500/10 text-gray-500 border-gray-400/20"
                            }`}>
                            {ev.isActive ? "Hiển thị" : "Ẩn"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleOpenEdit(ev, e)}
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(ev, e)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật sự kiện" : "Thêm sự kiện âm lịch mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập tên sự kiện và khoảng thời gian (lịch âm, không bao gồm năm, ví dụ: 15/01).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right font-medium">Tên sự kiện</Label>
                <Input
                  id="name"
                  placeholder="Lễ Vu Lan, Lễ Phật Đản..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="from" className="text-right font-medium">Từ ngày (âm)</Label>
                <Input
                  id="from"
                  placeholder="15/07"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="to" className="text-right font-medium">Đến ngày (âm)</Label>
                <Input
                  id="to"
                  placeholder="15/07"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right font-medium">Hiện Dashboard</Label>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    id="active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-medium select-none cursor-pointer" onClick={() => setIsActive(!isActive)}>
                    Xuất hiện ở trang chủ Dashboard
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button type="submit">{isEditing ? "Lưu" : "Khởi tạo"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
