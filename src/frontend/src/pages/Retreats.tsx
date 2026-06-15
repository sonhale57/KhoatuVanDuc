import React, { useEffect, useState } from "react";
import { apiService, type Course } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Edit, Plus, Compass } from "lucide-react";

const getDaysCount = (fromdate: string | undefined | null, todate: string | undefined | null) => {
  if (!fromdate || !todate) return 0;
  const start = new Date(fromdate);
  const end = new Date(todate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

export default function Retreats() {
  const [retreats, setRetreats] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dialog Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadRetreats = async () => {
    setLoading(true);
    try {
      const data = await apiService.courses.getAll();
      setRetreats(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách khóa tu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRetreats();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setStartDate("");
    setEndDate("");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (retreat: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditId(retreat.id);
    setName(retreat.name);
    // Format to yyyy-MM-dd for HTML input
    setStartDate(retreat.fromdate ? retreat.fromdate.substring(0, 10) : "");
    setEndDate(retreat.todate ? retreat.todate.substring(0, 10) : "");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (new Date(startDate) > new Date(endDate)) {
      setError("Ngày bắt đầu không thể sau ngày kết thúc.");
      return;
    }

    try {
      if (isEditing && editId !== null) {
        await apiService.courses.update(editId, { name, fromdate: startDate, todate: endDate });
        setSuccess("Cập nhật thông tin khóa tu thành công.");
      } else {
        await apiService.courses.create({ name, fromdate: startDate, todate: endDate });
        setSuccess("Tạo khóa tu mới thành công.");
      }
      setIsOpen(false);
      loadRetreats();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu thông tin khóa tu.");
    }
  };

  const handleDelete = async (retreat: Course, e: React.MouseEvent) => {
    e.stopPropagation();

    let confirmMsg = `Bạn có chắc chắn muốn xóa khóa tu "${retreat.name}"?`;
    if ((retreat.participantCount ?? 0) > 0) {
      confirmMsg = `CẢNH BÁO: Khóa tu "${retreat.name}" đang có ${retreat.participantCount} thành viên đăng ký tham gia!\n\nXóa khóa tu này sẽ xóa toàn bộ danh sách đăng ký và sơ đồ chỗ ngủ liên quan.\n\nBạn vẫn muốn tiếp tục xóa?`;
    } else {
      confirmMsg = `Bạn có chắc chắn muốn xóa khóa tu "${retreat.name}"? Toàn bộ đăng ký và chỗ ngủ liên quan sẽ bị xóa!`;
    }

    if (!confirm(confirmMsg)) return;
    setError("");
    setSuccess("");

    try {
      await apiService.courses.delete(retreat.id);
      setSuccess("Xóa khóa tu thành công.");
      loadRetreats();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xóa khóa tu.");
    }
  };

  const getRetreatStatus = (fromdate: string, todate: string) => {
    if (!fromdate || !todate) return "Chuẩn bị";
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(fromdate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(todate);
    end.setHours(0, 0, 0, 0);

    if (today < start) {
      return "Chưa bắt đầu";
    } else if (today > end) {
      return "Đã kết thúc";
    } else {
      return "Đang diễn ra";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Đang diễn ra":
        return "bg-blue-500/10 text-green-600 border-green-800/20";
      case "Đã kết thúc":
        return "bg-red-500/10 text-red-500 border-red-800/20";
      case "Chưa bắt đầu":
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-400/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Quản lý Khóa tu</h1>
          <p className="text-muted-foreground">Xem danh sách, cài đặt và theo dõi thông tin các khóa tu.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Thêm khóa tu
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

      {/* Retreats List Card */}
      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto relative">
              <Table>
                <TableHeader className="bg-muted/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                  <TableRow>
                  <TableHead className="font-bold">Tên khóa tu</TableHead>
                  <TableHead className="font-bold">Thời gian</TableHead>
                  <TableHead className="font-bold text-center">Số ngày</TableHead>
                  <TableHead className="font-bold text-center">Tham gia</TableHead>
                  <TableHead className="font-bold text-center">Trạng thái</TableHead>
                  <TableHead className="font-bold text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retreats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Chưa có khóa tu nào được ghi nhận. Click Thêm để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  retreats.map((r) => {
                    const status = getRetreatStatus(r.fromdate, r.todate);
                    return (
                      <TableRow key={r.id} className="hover:bg-accent/10 transition-colors">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Compass className="h-4.5 w-4.5 text-muted-foreground" />
                            <span className="text-foreground font-semibold">{r.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-muted-foreground">
                          {r.fromdate ? new Date(r.fromdate).toLocaleDateString("vi-VN") : ""} - {r.todate ? new Date(r.todate).toLocaleDateString("vi-VN") : ""}
                        </TableCell>
                        <TableCell className="text-center font-bold">{getDaysCount(r.fromdate, r.todate)} ngày</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            {r.participantCount ?? 0} người
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(status)}`}>
                            {status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleOpenEdit(r, e)}
                              className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(r, e)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
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

      {/* Retreat Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật khóa tu" : "Lập lịch khóa tu mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập tên khóa tu, ngày bắt đầu và kết thúc.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right font-medium">Tên khóa tu</Label>
                <Input
                  id="name"
                  placeholder="Khóa tu Phật thất lần..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="start" className="text-right font-medium">Bắt đầu</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="end" className="text-right font-medium">Kết thúc</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="col-span-3"
                />
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
