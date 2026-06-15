import React, { useEffect, useState } from "react";
import { apiService, type User } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, ShieldCheck, Key } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [active, setActive] = useState(true);
  const [password, setPassword] = useState("");

  const currentSession = JSON.parse(localStorage.getItem("user") || "{}");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiService.users.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách người dùng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (currentSession.role !== "Admin") {
    return (
      <div className="flex flex-col h-[50vh] items-center justify-center text-center p-6 bg-red-500/5 border border-red-500/10 rounded-2xl max-w-lg mx-auto">
        <ShieldCheck className="h-14 w-14 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-foreground">Không có quyền truy cập</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Chức năng này chỉ dành riêng cho tài khoản Quản trị viên (Admin).
        </p>
      </div>
    );
  }

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setUsername("");
    setDisplayName("");
    setActive(true);
    setPassword("");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setIsEditing(true);
    setEditId(user.id);
    setUsername(user.username);
    setDisplayName(user.displayName);
    setActive(user.active);
    setPassword(""); // Leave blank if not updating password
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isEditing && !password) {
      setError("Mật khẩu là bắt buộc khi tạo người dùng mới.");
      return;
    }

    try {
      if (isEditing && editId !== null) {
        await apiService.users.update(editId, { displayName, active, password: password || undefined });
        setSuccess("Cập nhật người dùng thành công.");
      } else {
        await apiService.users.create({ username, displayName, active, password, role: "Admin" });
        setSuccess("Tạo người dùng mới thành công.");
      }
      setIsOpen(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xử lý thao tác.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
    setError("");
    setSuccess("");

    try {
      await apiService.users.delete(id);
      setSuccess("Xóa người dùng thành công.");
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xóa người dùng.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Quản trị Users</h1>
          <p className="text-muted-foreground">Quản lý tài khoản quản trị và nhân sự vận hành khóa tu.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Thêm người dùng
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

      {/* Users Dialog Form */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật người dùng" : "Tạo người dùng mới"}
              </DialogTitle>
              <DialogDescription>
                Điền thông tin tài khoản người dùng dưới đây. Click lưu khi hoàn tất.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right font-medium">Tên đăng nhập</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isEditing}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right font-medium">Họ tên</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="active" className="text-right font-medium">Trạng thái</Label>
                <div className="col-span-3">
                  <Select value={active ? "true" : "false"} onValueChange={(val) => setActive(val === "true")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Trạng thái tài khoản" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Hoạt động</SelectItem>
                      <SelectItem value="false">Tạm khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pass" className="text-right font-medium">
                  Mật khẩu
                </Label>
                <div className="col-span-3 relative">
                  <Input
                    id="pass"
                    type="password"
                    placeholder={isEditing ? "Bỏ trống nếu giữ nguyên" : "Mật khẩu bảo mật"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isEditing}
                  />
                  {isEditing && (
                    <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button type="submit">{isEditing ? "Cập nhật" : "Tạo mới"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-muted-foreground">Đang tải danh sách người dùng...</span>
          </div>
        ) : (
          <Table containerClassName="max-h-[60vh] overflow-y-auto relative">
            <TableHeader className="bg-muted/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow>
                <TableHead className="font-bold w-[300px]">Họ tên</TableHead>
                <TableHead className="font-bold w-[250px]">Tên đăng nhập</TableHead>
                <TableHead className="font-bold w-[200px]">Trạng thái</TableHead>
                <TableHead className="font-bold text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Không tìm thấy người dùng nào trong hệ thống.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-accent/5">
                    <TableCell className="font-semibold">{user.displayName}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold shadow-sm uppercase tracking-wide ${user.active
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                        }`}>
                        {user.active ? "Hoạt động" : "Tạm khóa"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary rounded-lg"
                          title="Sửa thông tin"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          title="Xóa người dùng"
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
        )}
      </div>
    </div>
  );
}
