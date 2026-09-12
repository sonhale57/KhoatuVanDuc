import React, { useEffect, useState } from "react";
import { apiService, type Member } from "@/services/api";
import { useToast } from "@/hooks/useToast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Edit, Plus, HeartHandshake, Camera, UploadCloud, Printer } from "lucide-react";
import QRCode from "qrcode";


export default function Members() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  // Dialog Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Fields matching Member schema
  const [uniqueId, setUniqueId] = useState<number | "">("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [otherName, setOtherName] = useState("");
  const [birthYear, setBirthYear] = useState<number>(new Date().getFullYear() - 30);
  const [gender, setGender] = useState("Nam");
  const [phone, setPhone] = useState("");
  const [relativePhone, setRelativePhone] = useState("");
  const [identityImage, setIdentityImage] = useState("");

  // Drag and Drop & Camera States
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await apiService.members.getAll();
      setMembers(data);
    } catch (err: any) {
      setError(err.message || "Không thể tải danh sách thành viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const filteredAndSortedMembers = React.useMemo(() => {
    let result = [...members];

    // Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((member) => {
        const codeMatch = member.code?.toLowerCase().includes(term);
        const nameMatch = member.name?.toLowerCase().includes(term);
        const otherNameMatch = member.otherName?.toLowerCase().includes(term);
        const uniqueIdMatch = member.uniqueId?.toString().includes(term);
        return codeMatch || nameMatch || otherNameMatch || uniqueIdMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return b.id - a.id;
      }
      if (sortBy === "code") {
        return (a.code || "").localeCompare(b.code || "");
      }
      if (sortBy === "alphabet") {
        return (a.name || "").localeCompare(b.name || "", "vi");
      }
      if (sortBy === "retreats") {
        return b.joinedCoursesCount - a.joinedCoursesCount;
      }
      return 0;
    });

    return result;
  }, [members, searchTerm, sortBy]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditId(null);
    setUniqueId("");
    setCode("");
    setName("");
    setOtherName("");
    setBirthYear(new Date().getFullYear() - 30);
    setGender("Nam");
    setPhone("");
    setRelativePhone("");
    setIdentityImage("");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (member: Member) => {
    setIsEditing(true);
    setEditId(member.id);
    setUniqueId(member.uniqueId ?? "");
    setCode(member.code ?? "");
    setName(member.name);
    setOtherName(member.otherName ?? "");
    setBirthYear(member.yearOfBirth ?? new Date().getFullYear() - 30);
    setGender(member.gender ?? "Nam");
    setPhone(member.phone ?? "");
    setRelativePhone(member.relativePhone ?? "");
    setIdentityImage(member.identityImage ?? "");
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      stopCamera();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Họ tên thành viên không được để trống.");
      setSubmitting(false);
      return;
    }

    const payload = {
      uniqueId: uniqueId === "" ? undefined : Number(uniqueId),
      code: code || undefined,
      name,
      otherName: otherName || undefined,
      yearOfBirth: birthYear,
      gender,
      phone: phone || undefined,
      relativePhone: relativePhone || undefined,
      identityImage: identityImage || undefined
    };

    try {
      if (isEditing && editId !== null) {
        await apiService.members.update(editId, payload);
        setSuccess("Cập nhật thông tin thành viên thành công.");
      } else {
        await apiService.members.create(payload);
        setSuccess("Thêm thành viên mới thành công.");
      }
      stopCamera();
      setIsOpen(false);
      loadMembers();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu thông tin thành viên.");
    } finally {
      setSubmitting(false);
    }
  };

  const { confirm, toast } = useToast();

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: "Xác nhận xóa thành viên",
      description: "Bạn có chắc chắn muốn xóa thành viên này? Toàn bộ phiếu đăng ký và chỗ ngủ liên quan sẽ bị xóa vĩnh viễn!",
      confirmText: "Xóa",
      cancelText: "Hủy bộ",
      variant: "destructive"
    });

    if (!isConfirmed) return;
    setError("");
    setSuccess("");

    try {
      await apiService.members.delete(id);
      toast("success", "Thành công", "Đã xóa thành viên.");
      loadMembers();
    } catch (err: any) {
      toast("error", "Lỗi", err.message || "Lỗi khi xóa thành viên.");
    }
  };

  const handlePrintCard = async (member: Member) => {
    try {
      // Generate QR Code URL
      const qrData = `${member.code || ""}.${member.uniqueId || ""}`;
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Helper function to capitalize first letter of each word
      const capitalizeName = (str: string) => {
        if (!str) return "";
        return str
          .toLowerCase()
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
      };

      const formattedName = capitalizeName(member.name);

      // Open new window for print
      const printWindow = window.open("", "_blank", "width=600,height=800");
      if (!printWindow) {
        alert("Vui lòng cho phép trình duyệt mở popup để in thẻ.");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>In Thẻ - ${formattedName}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Bodoni:ital,wght@0,400..700;1,400..700&family=Libre+Franklin:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
            <style>
              @page {
                size: 8cm 11cm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                width: 8cm;
                height: 11cm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
                background: #fff;
                color: #000;
                text-align: center;
              }
              .card-container {
                width: 8cm;
                height: 11cm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0.8cm 0.6cm;
                box-sizing: border-box;
                border: 1px dashed #ccc;
              }
              @media print {
                body {
                  width: 8cm;
                  height: 11cm;
                }
                .card-container {
                  border: none;
                  width: 8cm;
                  height: 11cm;
                }
              }
              .qr-code {
                width: 2cm;
                height: 2cm;
                object-fit: contain;
              }
              .footer-code {
                font-family: 'Libre Franklin', sans-serif;
                font-size: 12px;
                color: #5d2825;
                font-weight: 600;
                background: #f3f4f6;
                border-radius: 9999px;
                display: block;
                width: 4.8cm;
                text-align: center;
                letter-spacing: 0.25em;
                padding: 0;
                box-sizing: border-box;
              }
              .info-group {
                margin-top:3px;
                width: 100%;
              }
              .other-name {
                font-family: 'Libre Bodoni', serif;
                font-size: 16px;
                font-weight: 600;
                color: #5d2825;
                margin: 0 0 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .name {
                font-family: 'Libre Franklin', sans-serif;
                font-size: 14px;
                font-weight: 700;
                color: #5d2825;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
            </style>
          </head>
          <body>
            <div class="card-container">
              <img class="qr-code" src="${qrCodeUrl}" alt="QR Code" />
              <div class="footer-code">${member.code || ''}</div>
              <div class="info-group">
                <div class="other-name">${member.otherName ? member.otherName : ''}</div>
                <div class="name">${formattedName}</div>
              </div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 300);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error("Print card error:", err);
      alert("Đã xảy ra lỗi khi tạo mã in thẻ.");
    }
  };

  // Camera capture handlers
  const startCamera = async () => {
    try {
      setError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
      });
      setCameraStream(mediaStream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch (err: any) {
      setError("Không thể truy cập camera. Vui lòng cấp quyền hoặc chọn ảnh từ thiết bị.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setIdentityImage(dataUrl);
      }
      stopCamera();
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận tệp hình ảnh.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdentityImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Quản lý Thành viên</h1>
          <p className="text-muted-foreground">Lưu trữ thông tin thành viên (Phật tử) đăng ký tham gia khóa tu.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Thêm thành viên
        </Button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1">
          <Input
            placeholder="Tìm kiếm theo mã, tên, pháp danh hoặc CCCD (mã định danh)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Sắp xếp:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mới nhất</SelectItem>
              <SelectItem value="code">Mã thành viên</SelectItem>
              <SelectItem value="alphabet">Alphabet (Tên)</SelectItem>
              <SelectItem value="retreats">Số khóa tu tham gia</SelectItem>
            </SelectContent>
          </Select>
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

      {/* Members Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-muted-foreground">Đang tải danh sách thành viên...</span>
          </div>
        ) : (
          <Table containerClassName="max-h-[60vh] overflow-y-auto relative">
            <TableHeader className="bg-muted/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
              <TableRow>
                <TableHead className="font-bold w-[120px]">Mã TV</TableHead>
                <TableHead className="font-bold w-[200px]">Họ tên</TableHead>
                <TableHead className="font-bold w-[150px]">Pháp danh</TableHead>
                <TableHead className="font-bold w-[100px]">Giới tính</TableHead>
                <TableHead className="font-bold w-[100px]">Năm sinh</TableHead>
                <TableHead className="font-bold w-[130px]">Điện thoại</TableHead>
                <TableHead className="font-bold w-[150px] text-center">Số khóa tu đã đi</TableHead>
                <TableHead className="font-bold text-right w-[120px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Không tìm thấy thành viên nào. Click nút Thêm để tạo mới hoặc thay đổi từ khóa tìm kiếm.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-accent/5">
                    <TableCell className="font-semibold text-muted-foreground">{member.code || `VD-${member.id}`}</TableCell>
                    <TableCell className="font-semibold text-foreground">{member.name}</TableCell>
                    <TableCell className="text-primary font-medium">{member.otherName || "Chưa có"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-semibold ${member.gender === "Nam"
                        ? "bg-sky-500/10 text-sky-600 border border-sky-500/20"
                        : "bg-pink-500/10 text-pink-600 border border-pink-500/20"
                        }`}>
                        {member.gender}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{member.yearOfBirth}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{member.phone || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full font-bold shadow-sm ${member.joinedCoursesCount > 0
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                        }`}>
                        <HeartHandshake className="h-3.5 w-3.5" />
                        {member.joinedCoursesCount} khóa tu
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintCard(member)}
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                          title="In thẻ"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(member)}
                          className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg"
                          title="Sửa thông tin"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(member.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                          title="Xóa thành viên"
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

      {/* Member Form Dialog */}
      <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật thành viên" : "Đăng ký thành viên mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập thông tin cá nhân của Phật tử / thành viên tham gia khóa tu.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Left Column: Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-1.5">Thông tin cá nhân</h3>

                <div className="space-y-1">
                  <Label htmlFor="name" className="font-semibold text-xs text-foreground">Họ và tên <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="otherName" className="font-semibold text-xs text-foreground">Pháp danh</Label>
                  <Input
                    id="otherName"
                    placeholder="e.g. Tâm Đức"
                    value={otherName}
                    onChange={(e) => setOtherName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gender" className="font-semibold text-xs text-foreground">Giới tính</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn giới tính" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Nam">Nam</SelectItem>
                        <SelectItem value="Nữ">Nữ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="birthYear" className="font-semibold text-xs text-foreground">Năm sinh</Label>
                    <Input
                      id="birthYear"
                      type="number"
                      min={1920}
                      max={new Date().getFullYear()}
                      value={birthYear}
                      onChange={(e) => setBirthYear(parseInt(e.target.value) || new Date().getFullYear())}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="font-semibold text-xs text-foreground">Điện thoại</Label>
                  <Input
                    id="phone"
                    placeholder="0901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="relativePhone" className="font-semibold text-xs text-foreground">SĐT người thân</Label>
                  <Input
                    id="relativePhone"
                    placeholder="Số điện thoại người thân..."
                    value={relativePhone}
                    onChange={(e) => setRelativePhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Identity & Document Upload */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-1.5">Định danh & CCCD</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="code" className="font-semibold text-xs text-foreground">Mã thành viên</Label>
                    <Input
                      id="code"
                      value={isEditing ? code : "Tự động phát sinh"}
                      disabled
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="uniqueId" className="font-semibold text-xs text-foreground">Mã định danh</Label>
                    <Input
                      id="uniqueId"
                      value={isEditing ? uniqueId : "Tự động phát sinh"}
                      disabled
                    />
                  </div>
                </div>

                {/* Drag-and-Drop and Live Capture Container */}
                <div className="space-y-2">
                  <Label className="font-semibold text-xs text-foreground">Ảnh CCCD</Label>

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative min-h-[175px] border-2 rounded-xl flex flex-col items-center justify-center p-3 transition-all duration-200 ${isDragging
                      ? "border-primary bg-primary/5"
                      : "border-dashed border-muted-foreground/30 bg-muted/5 hover:bg-muted/10"
                      }`}
                  >
                    {isCameraActive ? (
                      <div className="w-full flex flex-col items-center gap-2">
                        <video
                          ref={videoRef}
                          className="w-full max-h-[120px] rounded-lg bg-black object-cover"
                          playsInline
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={capturePhoto}
                            className="h-7 px-3 text-xs font-semibold"
                          >
                            Chụp hình
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={stopCamera}
                            className="h-7 px-3 text-xs font-semibold"
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : identityImage ? (
                      <div className="w-full flex flex-col items-center gap-2 relative group">
                        <img
                          src={identityImage}
                          alt="CCCD Preview"
                          className="max-h-[120px] rounded-lg object-contain border border-border shadow-sm bg-background"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => setIdentityImage("")}
                            className="h-7 px-3 text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Xóa ảnh
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={startCamera}
                            className="h-7 px-3 text-xs font-semibold flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" /> Chụp lại
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center space-y-2 p-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <UploadCloud className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold">Kéo thả ảnh vào đây hoặc</p>
                          <div className="flex items-center gap-2 justify-center mt-1">
                            <label className="text-xs text-primary font-bold hover:underline cursor-pointer">
                              Chọn tệp
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                              />
                            </label>
                            <span className="text-[10px] text-muted-foreground">hoặc</span>
                            <button
                              type="button"
                              onClick={startCamera}
                              className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                            >
                              <Camera className="h-3.5 w-3.5" /> Chụp hình
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">Hỗ trợ PNG, JPG hoặc JPEG</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => handleCloseDialog(false)} disabled={submitting}>Hủy</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : (isEditing ? "Lưu" : "Thêm mới")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
