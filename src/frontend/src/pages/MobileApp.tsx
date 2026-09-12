import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { apiService, type Registration, type Course, type Member, type Bed, type Area } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { QrCode, ClipboardList, UserPlus, Flashlight, RefreshCw, CheckCircle2, BedDouble, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

type MobileTab = "checkout_qr" | "list" | "register";

const getTodayLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isCourseActive = (c: Course): boolean => {
  if (!c.todate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(c.todate);
  end.setHours(0, 0, 0, 0);
  return today <= end;
};

export default function MobileApp() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MobileTab>("checkout_qr");

  // Common Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [, setAreas] = useState<Area[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // TAB 1: QUÉT QR CHO VỀ STATES & HANDLERS
  // -------------------------------------------------------------
  const [scanState, setScanState] = useState<"idle" | "scanning" | "found" | "error">("idle");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [scannedReg, setScannedReg] = useState<Registration | null>(null);
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [actualTodate, setActualTodate] = useState(getTodayLocalDateString());
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const isScannedRef = useRef<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [crs, mbs, bds, ars, regs] = await Promise.all([
        apiService.courses.getAll(),
        apiService.members.getAll(),
        apiService.beds.getAll(),
        apiService.areas.getAll(),
        apiService.registrations.getAll(),
      ]);
      setCourses(crs);
      setMembers(mbs);
      setBeds(bds);
      setAreas(ars);
      setRegistrations(regs);
    } catch (err) {
      console.error("Failed to load mobile app data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Camera logic for QR checkout
  const stopCamera = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleMemberScanned = useCallback((memberCode: string) => {
    isScannedRef.current = true;
    stopCamera();

    const cleanCode = memberCode.trim().toUpperCase();
    const foundMember = members.find(
      (m) => m.code?.toUpperCase() === cleanCode || m.id.toString() === cleanCode
    );

    if (!foundMember) {
      setScanState("error");
      setCheckoutError(`Không tìm thấy Phật tử có mã "${memberCode}".`);
      return;
    }

    setScannedMember(foundMember);

    // Find active registration without todate
    const activeReg = registrations.find(
      (r) => r.memberId === foundMember.id && !r.todate
    );

    if (!activeReg) {
      // Look for any registration
      const anyReg = registrations.find((r) => r.memberId === foundMember.id);
      if (anyReg) {
        setScannedReg(anyReg);
        setScanState("found");
        setCheckoutError("Phật tử này đã làm thủ tục cho về rồi.");
      } else {
        setScanState("error");
        setCheckoutError(`Phật tử ${foundMember.name} chưa đăng ký khóa tu nào.`);
      }
      return;
    }

    setScannedReg(activeReg);
    setActualTodate(getTodayLocalDateString());
    setCheckoutError("");
    setCheckoutSuccess("");
    setScanState("found");
  }, [members, registrations, stopCamera]);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data && !isScannedRef.current) {
          handleMemberScanned(code.data);
          return;
        }
      }
    }
    if (!isScannedRef.current) {
      animRef.current = requestAnimationFrame(tick);
    }
  }, [handleMemberScanned]);

  const startCamera = useCallback(async () => {
    setCheckoutError("");
    setCheckoutSuccess("");
    isScannedRef.current = false;
    setScanState("scanning");
    setScannedReg(null);
    setScannedMember(null);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        animRef.current = requestAnimationFrame(tick);
      }
    } catch {
      setScanState("error");
      setCheckoutError("Không thể truy cập camera. Vui lòng cho phép quyền hoặc nhập mã bên dưới.");
    }
  }, [stopCamera, tick]);

  useEffect(() => {
    if (activeTab === "checkout_qr" && scanState === "idle") {
      startCamera();
    }
    if (activeTab !== "checkout_qr") {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, scanState, startCamera, stopCamera]);

  const toggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities() as any;
      if (caps && caps.torch) {
        const next = !isFlashOn;
        await (track as any).applyConstraints({ advanced: [{ torch: next }] });
        setIsFlashOn(next);
      } else {
        toast("info", "Không hỗ trợ", "Thiết bị không hỗ trợ đèn flash.");
      }
    } catch {
      toast("info", "Lỗi flash", "Không bật được đèn flash.");
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleMemberScanned(manualCode.trim());
  };

  const handleSaveCheckout = async () => {
    if (!scannedReg || !scannedMember) return;
    if (!actualTodate) {
      setCheckoutError("Vui lòng chọn ngày về thực tế.");
      return;
    }
    setCheckoutSubmitting(true);
    setCheckoutError("");
    try {
      await apiService.registrations.update(scannedReg.memberId, scannedReg.courseId, {
        courseId: scannedReg.courseId,
        memberId: scannedReg.memberId,
        bedId: scannedReg.bedId,
        dayAttend: scannedReg.dayAttend || 3,
        fromdate: scannedReg.fromdate || getTodayLocalDateString(),
        todate: actualTodate,
        description: scannedReg.description || "",
        recievePhone: scannedReg.recievePhone ?? false,
        recieveIdentity: scannedReg.recieveIdentity ?? false,
      });
      toast("success", "Cập nhật thành công", `Đã lưu ngày về cho Phật tử ${scannedMember.name}.`);
      setCheckoutSuccess(`Đã lưu ngày về cho ${scannedMember.name} thành công.`);
      await loadData();
    } catch (err: any) {
      setCheckoutError(err.message || "Cập nhật ngày về thất bại.");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: DANH SÁCH ĐĂNG KÝ STATES & HANDLERS
  // -------------------------------------------------------------
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editCheckoutModalReg, setEditCheckoutModalReg] = useState<Registration | null>(null);
  const [editActualTodate, setEditActualTodate] = useState(getTodayLocalDateString());

  const activeCourses = courses.filter(isCourseActive);
  const displayCourseId = selectedCourseFilter !== ""
    ? Number(selectedCourseFilter)
    : (activeCourses.length > 0 ? activeCourses[0].id : (courses.length > 0 ? courses[0].id : ""));

  const filteredRegistrations = registrations.filter((r) => {
    const matchCourse = displayCourseId === "" || r.courseId === Number(displayCourseId);
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.memberName.toLowerCase().includes(q) ||
      (r.memberCode && r.memberCode.toLowerCase().includes(q)) ||
      (r.memberOtherName && r.memberOtherName.toLowerCase().includes(q)) ||
      r.bedCode.toLowerCase().includes(q);
    return matchCourse && matchSearch;
  });

  const handleOpenEditCheckout = (reg: Registration) => {
    setEditCheckoutModalReg(reg);
    setEditActualTodate(getTodayLocalDateString());
  };

  const handleSaveEditCheckout = async () => {
    if (!editCheckoutModalReg) return;
    try {
      await apiService.registrations.update(
        editCheckoutModalReg.memberId,
        editCheckoutModalReg.courseId,
        {
          courseId: editCheckoutModalReg.courseId,
          memberId: editCheckoutModalReg.memberId,
          bedId: editCheckoutModalReg.bedId,
          dayAttend: editCheckoutModalReg.dayAttend || 3,
          fromdate: editCheckoutModalReg.fromdate || getTodayLocalDateString(),
          todate: editActualTodate,
          description: editCheckoutModalReg.description || "",
          recievePhone: editCheckoutModalReg.recievePhone ?? false,
          recieveIdentity: editCheckoutModalReg.recieveIdentity ?? false,
        }
      );
      toast("success", "Thành công", "Đã cập nhật ngày về.");
      setEditCheckoutModalReg(null);
      await loadData();
    } catch {
      toast("error", "Lỗi", "Không thể cập nhật ngày về.");
    }
  };

  // -------------------------------------------------------------
  // TAB 3: ĐĂNG KÝ THAM GIA THÀNH VIÊN MOBILE STATES & HANDLERS
  // -------------------------------------------------------------
  const [regCourseId, setRegCourseId] = useState<number | "">("");
  const [regMemberId, setRegMemberId] = useState<number | "">("");
  const [regBedId, setRegBedId] = useState<number | "">("");
  const [regFromdate, setRegFromdate] = useState(getTodayLocalDateString());
  const [regDayAttend, setRegDayAttend] = useState<number>(3);
  const [regDesc, setRegDesc] = useState("");
  const [regRecievePhone, setRegRecievePhone] = useState(false);
  const [regRecieveIdentity, setRegRecieveIdentity] = useState(false);
  const [regMemberType, setRegMemberType] = useState<"existing" | "new">("existing");

  // New member inputs
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberOtherName, setNewMemberOtherName] = useState("");
  const [newMemberGender, setNewMemberGender] = useState("Nam");
  const [newMemberBirthYear, setNewMemberBirthYear] = useState<number>(new Date().getFullYear() - 30);
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberRelativePhone, setNewMemberRelativePhone] = useState("");

  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regErrorMsg, setRegErrorMsg] = useState("");
  const [regSuccessMsg, setRegSuccessMsg] = useState("");

  // Auto pick course & available bed when tab 3 opens or course changes
  useEffect(() => {
    if (activeTab === "register") {
      const activeList = courses.filter(isCourseActive);
      const defaultCId = activeList.length > 0 ? activeList[0].id : (courses.length > 0 ? courses[0].id : "");
      if (regCourseId === "") {
        setRegCourseId(defaultCId);
      }
      setRegFromdate(getTodayLocalDateString());
    }
  }, [activeTab, courses]);

  // Selectable beds for chosen course
  const selectableBeds = beds.filter((b) => {
    if (!b.active || b.type !== "Chỗ ngủ") return false;
    if (regCourseId === "") return true;
    const isOcc = registrations.some(
      (r) => r.bedId === b.id && r.courseId === Number(regCourseId) && !r.todate
    );
    return !isOcc;
  });

  useEffect(() => {
    if (regCourseId !== "" && selectableBeds.length > 0) {
      if (!regBedId || !selectableBeds.some((b) => b.id === regBedId)) {
        setRegBedId(selectableBeds[0].id);
      }
    }
  }, [regCourseId, beds, registrations]);

  const handleSubmitMobileRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSubmitting) return;
    setRegErrorMsg("");
    setRegSuccessMsg("");

    if (regCourseId === "" || regBedId === "" || !regFromdate) {
      setRegErrorMsg("Vui lòng chọn khóa tu, giường ngủ và ngày bắt đầu.");
      return;
    }

    if (regMemberType === "existing" && regMemberId === "") {
      setRegErrorMsg("Vui lòng chọn Phật tử.");
      return;
    }

    if (regMemberType === "new" && !newMemberName.trim()) {
      setRegErrorMsg("Vui lòng nhập họ tên cho Phật tử mới.");
      return;
    }

    setRegSubmitting(true);
    try {
      let finalMemberId = regMemberId;
      if (regMemberType === "new") {
        const created = await apiService.members.create({
          name: newMemberName.trim(),
          otherName: newMemberOtherName.trim() || undefined,
          gender: newMemberGender,
          yearOfBirth: newMemberBirthYear,
          phone: newMemberPhone.trim() || undefined,
          relativePhone: newMemberRelativePhone.trim() || undefined,
        });
        finalMemberId = created.id;
      }

      await apiService.registrations.create({
        courseId: Number(regCourseId),
        memberId: Number(finalMemberId),
        bedId: Number(regBedId),
        dayAttend: regDayAttend,
        fromdate: regFromdate,
        description: regDesc,
        recievePhone: regRecievePhone,
        recieveIdentity: regRecieveIdentity,
      });

      toast("success", "Đăng ký thành công", "Đã lưu phiếu đăng ký khóa tu.");
      setRegSuccessMsg("Đăng ký khóa tu thành công!");
      await loadData();

      // Reset form
      setRegMemberId("");
      setNewMemberName("");
      setNewMemberOtherName("");
      setNewMemberPhone("");
      setNewMemberRelativePhone("");
      setRegDesc("");
    } catch (err: any) {
      setRegErrorMsg(err.message || "Đăng ký khóa tu thất bại.");
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col pb-20 font-['Nunito_Sans',sans-serif]">
      {/* Top Mobile Header (Light Theme) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center shrink-0">
            <img src="/images/logo_cvd.png" alt="Logo" className="h-10 w-10 animate-pulse" />
          </div>
          <img src="/images/logo_KTPT.png" alt="Logo" className="w-25 group-data-[state=collapsed]:hidden" />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="h-8 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold gap-1 rounded-full shadow-2xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          <span>Tải lại</span>
        </Button>
      </header>

      {/* Main Tab Contents */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* ========================================================
            TAB 1: QUÉT QR CHO VỀ (MOBILE CHECKOUT SCANNER LIGHT THEME)
           ======================================================== */}
        {activeTab === "checkout_qr" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="bg-white border border-slate-200/90 text-slate-800 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-indigo-600" />
                    <CardTitle className="text-base font-extrabold text-indigo-950">Cập nhật Ngày về (QR)</CardTitle>
                  </div>
                  {scanState === "scanning" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFlash}
                      className={`h-8 w-8 rounded-full ${isFlashOn ? "bg-amber-100 text-amber-700 border border-amber-300" : "text-slate-500 hover:bg-slate-100"}`}
                      title="Bật/Tắt Flash"
                    >
                      <Flashlight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-slate-500 text-xs mt-1 font-medium">
                  Đưa mã QR của Phật tử vào khung ống kính camera để ghi nhận ngày về thực tế.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Camera Viewfinder */}
                {scanState === "scanning" && (
                  <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-black shadow-inner">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scanning overlay frame */}
                    <div className="absolute inset-0 border-2 border-indigo-400/30 rounded-2xl pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-indigo-400 rounded-xl relative animate-pulse">
                        <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Code Input fallback toggle */}
                <div className="flex justify-between items-center text-xs text-slate-500 pt-1 font-medium">
                  <button
                    type="button"
                    onClick={() => setShowManual(!showManual)}
                    className="text-indigo-600 font-bold underline underline-offset-4 hover:text-indigo-700"
                  >
                    {showManual ? "Ẩn nhập tay" : "Nhập mã Phật tử thủ công"}
                  </button>
                  {scanState !== "scanning" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startCamera}
                      className="h-7 border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-lg shadow-2xs"
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1 text-indigo-600" /> Quét lại
                    </Button>
                  )}
                </div>

                {showManual && (
                  <form onSubmit={handleManualSearch} className="flex gap-2">
                    <Input
                      placeholder="Mã Phật tử hoặc số ĐT..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 text-xs font-medium focus:bg-white"
                    />
                    <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 rounded-lg">
                      Tìm
                    </Button>
                  </form>
                )}

                {/* Error Banner */}
                {checkoutError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>{checkoutError}</div>
                  </div>
                )}

                {/* Success Banner */}
                {checkoutSuccess && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{checkoutSuccess}</span>
                    </div>
                    <Button size="sm" onClick={startCamera} className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg">
                      Quét tiếp
                    </Button>
                  </div>
                )}

                {/* Scanned Participation Info Card (Light Theme) */}
                {scannedMember && (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3 text-xs text-slate-700 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="font-extrabold text-slate-900 text-base">{scannedMember.name}</span>
                      <span className="px-2 py-0.5 rounded-md font-mono bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                        {scannedMember.code || `ID: ${scannedMember.id}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div><span className="text-slate-500 font-medium">Pháp danh:</span> <span className="font-bold text-indigo-700">{scannedMember.otherName || "Chưa có"}</span></div>
                      <div><span className="text-slate-500 font-medium">Giới tính:</span> <span className="font-bold text-slate-900">{scannedMember.gender || "Nam"}</span></div>
                      <div><span className="text-slate-500 font-medium">Năm sinh:</span> <span className="font-bold text-slate-900">{scannedMember.yearOfBirth}</span></div>
                      <div><span className="text-slate-500 font-medium">Điện thoại:</span> <span className="font-bold text-slate-900">{scannedMember.phone || "N/A"}</span></div>
                    </div>

                    {scannedReg ? (
                      <div className="border-t border-indigo-100/80 pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Khóa tu:</span>
                          <span className="font-extrabold text-amber-700">{scannedReg.courseName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Chỗ ngủ:</span>
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-200">
                            <BedDouble className="h-3.5 w-3.5 text-emerald-600" /> {scannedReg.bedCode} ({scannedReg.areaName})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Ngày bắt đầu tham gia:</span>
                          <span className="font-bold text-slate-800">
                            {scannedReg.fromdate ? new Date(scannedReg.fromdate).toLocaleDateString("vi-VN") : "N/A"}
                          </span>
                        </div>

                        {/* Input Ngày Về Thực Tế */}
                        <div className="pt-2 space-y-1.5 border-t border-indigo-100 mt-2">
                          <Label htmlFor="actual-todate-mobile" className="font-bold text-xs text-indigo-900 block">
                            Cập nhật Ngày về thực tế <span className="text-rose-500">*</span>
                          </Label>
                          <Input
                            id="actual-todate-mobile"
                            type="date"
                            value={actualTodate}
                            onChange={(e) => setActualTodate(e.target.value)}
                            className="bg-white border-slate-300 text-slate-900 font-bold h-10 text-sm focus:border-indigo-500 shadow-2xs"
                          />
                        </div>

                        <Button
                          onClick={handleSaveCheckout}
                          disabled={checkoutSubmitting || !!scannedReg.todate}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 mt-3 text-xs shadow-md shadow-emerald-600/20 rounded-xl"
                        >
                          {checkoutSubmitting ? "Đang lưu..." : (scannedReg.todate ? "Đã lưu ngày về" : "Lưu ngày về")}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-center py-2 font-medium">
                        Phật tử không có thông tin đăng ký khóa tu đang tham gia.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================
            TAB 2: DANH SÁCH ĐĂNG KÝ (MOBILE CARD LIST LIGHT THEME)
           ======================================================== */}
        {activeTab === "list" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="bg-white border border-slate-200/90 text-slate-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-indigo-600" />
                    <CardTitle className="text-base font-extrabold text-indigo-950">Danh sách đăng ký khóa tu</CardTitle>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-200">
                    {filteredRegistrations.length} lượt
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {/* Select Course Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-bold">Chọn Khóa tu</Label>
                  <Select
                    value={displayCourseId.toString()}
                    onValueChange={(val) => setSelectedCourseFilter(Number(val))}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-9 text-xs font-semibold focus:bg-white">
                      <SelectValue placeholder="Chọn khóa tu" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-900 font-medium">
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Tìm theo Tên, Pháp danh, Mã..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 text-xs font-medium focus:bg-white"
                  />
                </div>

                {/* Registration Cards List */}
                <div className="space-y-3 pt-2">
                  {filteredRegistrations.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      Không tìm thấy danh sách đăng ký phù hợp.
                    </div>
                  ) : (
                    filteredRegistrations.map((r) => {
                      const isReturned = !!r.todate;
                      return (
                        <div
                          key={`${r.memberId}-${r.courseId}`}
                          className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2 hover:border-indigo-300 hover:shadow-xs transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                {r.memberCode && (
                                  <span className="text-[10px] bg-amber-50 text-amber-700 font-mono px-1.5 py-0.5 rounded font-bold border border-amber-200">
                                    {r.memberCode}
                                  </span>
                                )}
                                <span className="font-extrabold text-sm text-slate-900">{r.memberName}</span>

                              </div>
                              {r.memberOtherName && (
                                <span className="text-xs text-indigo-600 font-bold block mt-0.5">
                                  PD: {r.memberOtherName}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isReturned
                                ? "bg-slate-100 text-slate-500 border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                }`}
                            >
                              {isReturned ? "Đã về" : "Chưa về"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-100 text-slate-700">
                            <div>
                              <span className="text-slate-400 block text-[10px] font-semibold">Vị trí chỗ ngủ:</span>
                              <span className="font-bold text-indigo-700">{r.bedCode} ({r.areaName})</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px] font-semibold">Ngày vào:</span>
                              <span className="font-bold text-slate-800">
                                {r.fromdate ? new Date(r.fromdate).toLocaleDateString("vi-VN") : "N/A"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                            <span className="text-slate-500 text-[11px] font-medium">
                              Số ngày đăng ký: <span className="font-extrabold text-slate-800">{r.dayAttend} ngày</span>
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditCheckout(r)}
                              className="h-7 text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg"
                            >
                              {isReturned ? "Đổi ngày về" : "Cập nhật ngày về"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modal Quick Edit Checkout Date */}
            {editCheckoutModalReg && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-extrabold text-indigo-900">Cập nhật Ngày về</h3>
                    <button
                      onClick={() => setEditCheckoutModalReg(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs space-y-1 text-slate-700">
                    <div>Phật tử: <span className="font-extrabold text-slate-900">{editCheckoutModalReg.memberName}</span></div>
                    <div>Khóa tu: <span className="font-bold text-amber-700">{editCheckoutModalReg.courseName}</span></div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-actual-todate" className="text-xs font-bold text-slate-700 block">
                      Chọn ngày về thực tế:
                    </Label>
                    <Input
                      id="edit-actual-todate"
                      type="date"
                      value={editActualTodate}
                      onChange={(e) => setEditActualTodate(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-9 font-bold focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditCheckoutModalReg(null)}
                      className="h-8 border-slate-200 text-slate-600 text-xs font-semibold"
                    >
                      Hủy
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEditCheckout}
                      className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs rounded-lg"
                    >
                      Lưu ngày về
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: ĐĂNG KÝ THAM GIA (MOBILE REGISTRATION FORM LIGHT THEME)
           ======================================================== */}
        {activeTab === "register" && (
          <div className="space-y-4 animate-fade-in">
            <Card className="bg-white border border-slate-200/90 text-slate-800 shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                  <CardTitle className="text-base font-extrabold text-indigo-950">Đăng ký tham gia Khóa tu</CardTitle>
                </div>
                <CardDescription className="text-slate-500 text-xs mt-1 font-medium">
                  Ghi nhận đăng ký khóa tu và xếp chỗ ngủ cho Phật tử (Tối ưu cho di động).
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <form onSubmit={handleSubmitMobileRegistration} className="space-y-4 text-xs">
                  {/* Member Type Switcher */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setRegMemberType("existing")}
                      className={`py-1.5 rounded-lg font-bold transition-all text-xs ${regMemberType === "existing"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Thành viên cũ
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegMemberType("new")}
                      className={`py-1.5 rounded-lg font-bold transition-all text-xs ${regMemberType === "new"
                        ? "bg-white text-indigo-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Thành viên mới
                    </button>
                  </div>

                  {/* Select Existing Member */}
                  {regMemberType === "existing" ? (
                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs text-slate-700">Chọn Phật tử <span className="text-rose-500">*</span></Label>
                      <SearchableSelect
                        options={members.map((m) => ({
                          value: m.id,
                          label: `${m.code ? `[${m.code}] ` : ""}${m.name}${m.otherName ? ` (${m.otherName})` : ""}`,
                          sublabel: `SĐT: ${m.phone || "N/A"} - Giới tính: ${m.gender || "Nam"}`,
                        }))}
                        value={regMemberId}
                        onValueChange={(val) => setRegMemberId(val)}
                        placeholder="Tìm Phật tử theo tên hoặc mã..."
                      />
                    </div>
                  ) : (
                    /* New Member Form Fields */
                    <div className="space-y-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                      <div className="space-y-1">
                        <Label htmlFor="mobile-new-name" className="font-bold text-xs text-slate-700">Họ & Tên <span className="text-rose-500">*</span></Label>
                        <Input
                          id="mobile-new-name"
                          placeholder="Nguyễn Văn A"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          required={regMemberType === "new"}
                          className="bg-white border-slate-200 text-slate-900 h-9 text-xs font-semibold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="mobile-new-otherName" className="font-bold text-xs text-slate-700">Pháp danh</Label>
                        <Input
                          id="mobile-new-otherName"
                          placeholder="Tâm Đức"
                          value={newMemberOtherName}
                          onChange={(e) => setNewMemberOtherName(e.target.value)}
                          className="bg-white border-slate-200 text-slate-900 h-9 text-xs font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="font-bold text-xs text-slate-700">Giới tính</Label>
                          <Select value={newMemberGender} onValueChange={setNewMemberGender}>
                            <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-9 text-xs font-semibold">
                              <SelectValue placeholder="Giới tính" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900 font-medium">
                              <SelectItem value="Nam">Nam</SelectItem>
                              <SelectItem value="Nữ">Nữ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="mobile-new-year" className="font-bold text-xs text-slate-700">Năm sinh</Label>
                          <Input
                            id="mobile-new-year"
                            type="number"
                            value={newMemberBirthYear}
                            onChange={(e) => setNewMemberBirthYear(parseInt(e.target.value) || 1990)}
                            className="bg-white border-slate-200 text-slate-900 h-9 text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="mobile-new-phone" className="font-bold text-xs text-slate-700">Điện thoại</Label>
                        <Input
                          id="mobile-new-phone"
                          placeholder="0901234567"
                          value={newMemberPhone}
                          onChange={(e) => setNewMemberPhone(e.target.value)}
                          className="bg-white border-slate-200 text-slate-900 h-9 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Course Selection */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs text-slate-700">Khóa tu <span className="text-rose-500">*</span></Label>
                    <Select
                      value={regCourseId.toString()}
                      onValueChange={(val) => setRegCourseId(Number(val))}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-9 text-xs font-semibold focus:bg-white">
                        <SelectValue placeholder="Chọn khóa tu" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 font-medium">
                        {courses.filter(isCourseActive).map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bed Selection */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs text-slate-700">Bố trí giường <span className="text-rose-500">*</span></Label>
                    <SearchableSelect
                      options={selectableBeds.map((b) => ({
                        value: b.id,
                        label: `[${b.areaName}] Giường ${b.code}`,
                        sublabel: b.description || undefined,
                      }))}
                      value={regBedId}
                      onValueChange={(val) => setRegBedId(val)}
                      placeholder="Chọn chỗ ngủ..."
                    />
                  </div>

                  {/* Duration & Today FromDate */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="mobile-reg-days" className="font-bold text-xs text-slate-700">Số ngày ở</Label>
                      <Input
                        id="mobile-reg-days"
                        type="number"
                        min={1}
                        value={regDayAttend}
                        onChange={(e) => setRegDayAttend(parseInt(e.target.value) || 1)}
                        className="bg-slate-50 border-slate-200 text-slate-900 h-9 text-xs font-semibold focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="mobile-reg-fromdate" className="font-bold text-xs text-slate-700">
                        Từ ngày <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="mobile-reg-fromdate"
                        type="date"
                        value={regFromdate}
                        onChange={(e) => setRegFromdate(e.target.value)}
                        required
                        className="bg-slate-50 border-slate-200 text-slate-900 h-9 text-xs font-semibold focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-1.5">
                    <Label htmlFor="mobile-reg-desc" className="font-bold text-xs text-slate-700">Ghi chú</Label>
                    <Input
                      id="mobile-reg-desc"
                      placeholder="Ghi chú đăng ký..."
                      value={regDesc}
                      onChange={(e) => setRegDesc(e.target.value)}
                      className="bg-slate-50 border-slate-200 text-slate-900 h-9 text-xs font-medium focus:bg-white"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={regRecievePhone}
                        onChange={(e) => setRegRecievePhone(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Thu Điện thoại</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={regRecieveIdentity}
                        onChange={(e) => setRegRecieveIdentity(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Thu Giấy tờ</span>
                    </label>
                  </div>

                  {/* Error & Success Messages */}
                  {regErrorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                      {regErrorMsg}
                    </div>
                  )}

                  {regSuccessMsg && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-semibold">
                      {regSuccessMsg}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 text-xs shadow-md shadow-indigo-600/20 rounded-xl mt-2"
                  >
                    {regSubmitting ? "Đang lưu..." : "Xác nhận đăng ký"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Light Theme) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 flex items-center justify-around h-16 shadow-lg px-2">
        <button
          onClick={() => setActiveTab("checkout_qr")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl py-1 px-2 ${activeTab === "checkout_qr"
            ? "text-indigo-600 font-bold bg-indigo-50/80"
            : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
        >
          <QrCode className="h-5 w-5" />
          <span className="text-[10px]">Cập nhật về</span>
        </button>

        <button
          onClick={() => setActiveTab("list")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl py-1 px-2 ${activeTab === "list"
            ? "text-indigo-600 font-bold bg-indigo-50/80"
            : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-[10px]">Danh sách</span>
        </button>

        <button
          onClick={() => setActiveTab("register")}
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl py-1 px-2 ${activeTab === "register"
            ? "text-indigo-600 font-bold bg-indigo-50/80"
            : "text-slate-500 hover:text-slate-800 font-semibold"
            }`}
        >
          <UserPlus className="h-5 w-5" />
          <span className="text-[10px]">Đăng ký mới</span>
        </button>
      </nav>
    </div>
  );
}
