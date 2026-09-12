import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { apiService, type Registration, type Course, type Member, type Bed, type Area } from "@/services/api";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Tab = "scan" | "list";
type ScanState = "idle" | "scanning" | "found" | "error";

interface ScanResult {
  member: Member;
  registrations: Registration[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const isCourseActive = (c: Course): boolean => {
  if (!c.todate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(c.todate);
  end.setHours(0, 0, 0, 0);
  return today <= end;
};

const getDefaultCourse = (courses: Course[]): Course | null => {
  if (courses.length === 0) return null;
  const active = courses.filter(isCourseActive);
  if (active.length > 0) return active[0];
  // all ended → pick most recent by fromdate
  const sorted = [...courses].sort(
    (a, b) => new Date(b.fromdate).getTime() - new Date(a.fromdate).getTime()
  );
  return sorted[0];
};

const calcActualDays = (fromdate?: string, todate?: string): number | null => {
  if (!fromdate || !todate) return null;
  const diff = new Date(todate).getTime() - new Date(fromdate).getTime();
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
};

// ─────────────────────────────────────────────
// QR Scanner Page
// ─────────────────────────────────────────────
export default function QRScanner() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Registration modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [regCourseId, setRegCourseId] = useState<number | "">("");
  const [regAreaId, setRegAreaId] = useState<number | "">("");
  const [regBedId, setRegBedId] = useState<number | "">("");
  const [regDays, setRegDays] = useState<number>(7);
  const [regFromdate, setRegFromdate] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regRecievePhone, setRegRecievePhone] = useState(false);
  const [regRecieveIdentity, setRegRecieveIdentity] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");

  // Registrations list tab
  const [listRegs, setListRegs] = useState<Registration[]>([]);
  const [listCourses, setListCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const isScannedRef = useRef<boolean>(false); // ref để tránh stale closure
  const [cameraError, setCameraError] = useState<string>("");

  // ── Camera helpers ───────────────────────────
  const stopCamera = useCallback(() => {
    if (animRef.current) { cancelAnimationFrame(animRef.current); animRef.current = 0; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    isScannedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Không thể truy cập camera. Vui lòng cấp quyền hoặc nhập mã thủ công.");
    }
  }, []);

  // processQRCode được khai báo trước scanFrame để tránh hoisting issue
  const processQRCode = useCallback(async (raw: string) => {
    setScanError("");
    setScanResult(null);
    try {
      const parsed = parseQR(raw);
      if (!parsed) {
        setScanState("error");
        setScanError("Mã QR không đúng định dạng. Yêu cầu: MÃ.SỐ_ĐỊNH_DANH (VD: VD00536.536). Đã đọc: " + raw);
        return;
      }

      const allMembers = await apiService.members.getAll();
      const member = allMembers.find(
        m =>
          m.code?.toLowerCase() === parsed.code.toLowerCase() &&
          m.uniqueId?.toString() === parsed.uniqueId
      );

      if (!member) {
        setScanState("error");
        setScanError(`Không tìm thấy Phật tử với mã "${parsed.code}" và số định danh "${parsed.uniqueId}".`);
        return;
      }

      const allRegs = await apiService.registrations.getAll();
      const memberRegs = allRegs.filter(r => r.memberId === member.id);
      setScanResult({ member, registrations: memberRegs });
      setScanState("found");
    } catch (err: any) {
      setScanState("error");
      setScanError(err.message || "Lỗi khi xử lý mã QR.");
    }
  }, []);

  // scanFrame dùng isScannedRef thay vì scanState để tránh stale closure
  const scanFrame = useCallback(() => {
    if (isScannedRef.current) return;
    if (!videoRef.current || !canvasRef.current) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { animRef.current = requestAnimationFrame(scanFrame); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Dùng jsQR để decode — hoạt động trên mọi browser
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      isScannedRef.current = true; // đánh dấu đã quét, ngăn scan lại
      stopCamera();
      setScanState("scanning");
      processQRCode(code.data);
      return;
    }

    animRef.current = requestAnimationFrame(scanFrame);
  }, [stopCamera, processQRCode]); // eslint-disable-line

  // ── Parse & validate QR format ───────────────
  const parseQR = (raw: string): { code: string; uniqueId: string } | null => {
    const trimmed = raw.trim();
    const dotIndex = trimmed.indexOf(".");
    if (dotIndex <= 0 || dotIndex === trimmed.length - 1) return null;
    const code = trimmed.slice(0, dotIndex);
    const uniqueId = trimmed.slice(dotIndex + 1);
    if (!code || !uniqueId || isNaN(Number(uniqueId))) return null;
    return { code, uniqueId };
  };


  // ── Manual entry ─────────────────────────────
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setScanState("scanning");
    stopCamera();
    await processQRCode(manualCode);
    setManualCode("");
    setShowManualInput(false);
  };

  const resetScan = useCallback(() => {
    setScanState("idle");
    setScanResult(null);
    setScanError("");
    setShowManualInput(false);
    setShowRegModal(false);
    setRegError("");
    setRegSuccess("");
    isScannedRef.current = false; // reset để cho phép quét lại
    startCamera().then(() => { animRef.current = requestAnimationFrame(scanFrame); });
  }, [startCamera, scanFrame]);

  // ── Registration modal data ──────────────────
  const openRegModal = async () => {
    setRegError("");
    setRegSuccess("");
    setRegAreaId("");
    setRegBedId("");
    setRegDays(7);
    setRegDescription("");
    setRegRecievePhone(false);
    setRegRecieveIdentity(false);

    // Set fromdate to today local
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    setRegFromdate(localDate.toISOString().substring(0, 10));

    try {
      const [crs, ars, bds, regs] = await Promise.all([
        apiService.courses.getAll(),
        apiService.areas.getAll(),
        apiService.beds.getAll(),
        apiService.registrations.getAll(),
      ]);
      setCourses(crs);
      setAreas(ars);
      setBeds(bds);
      setAllRegistrations(regs);

      // Default: active course or latest
      const defaultCourse = getDefaultCourse(crs);
      if (defaultCourse) {
        setRegCourseId(defaultCourse.id);
        // Auto days from course duration
        if (defaultCourse.fromdate && defaultCourse.todate) {
          const diff = Math.abs(new Date(defaultCourse.todate).getTime() - new Date(defaultCourse.fromdate).getTime());
          setRegDays(Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
        }
      }
      if (ars.length > 0) setRegAreaId(ars[0].id);
    } catch {
      setRegError("Không thể tải dữ liệu khoá tu / chỗ ngủ.");
    }
    setShowRegModal(true);
  };

  // Beds available: active, type "Chỗ ngủ", in selected area, not occupied for chosen course
  const availableBeds = beds.filter(b => {
    if (!b.active || b.type !== "Chỗ ngủ") return false;
    if (regAreaId && b.areaId !== Number(regAreaId)) return false;
    if (!regCourseId) return true;
    // occupied = registered in this course with no todate (still attending)
    const isOccupied = allRegistrations.some(
      r => r.bedId === b.id && r.courseId === Number(regCourseId) && !r.todate
    );
    return !isOccupied;
  });

  const handleCourseChange = (courseId: number) => {
    setRegCourseId(courseId);
    setRegBedId(""); // reset bed when course changes
    const c = courses.find(x => x.id === courseId);
    if (c) {
      if (c.fromdate) setRegFromdate(c.fromdate.substring(0, 10));
      if (c.fromdate && c.todate) {
        const diff = Math.abs(new Date(c.todate).getTime() - new Date(c.fromdate).getTime());
        setRegDays(Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
      }
    }
  };

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanResult) return;
    if (!regCourseId) { setRegError("Vui lòng chọn khoá tu."); return; }
    if (!regBedId) { setRegError("Vui lòng chọn chỗ ngủ."); return; }
    setRegSubmitting(true);
    setRegError("");
    try {
      await apiService.registrations.create({
        memberId: scanResult.member.id,
        courseId: Number(regCourseId),
        bedId: Number(regBedId),
        dayAttend: regDays,
        fromdate: regFromdate || undefined,
        description: regDescription || undefined,
        recievePhone: regRecievePhone,
        recieveIdentity: regRecieveIdentity,
      });
      // Refresh member registrations
      const allRegs = await apiService.registrations.getAll();
      const memberRegs = allRegs.filter(r => r.memberId === scanResult.member.id);
      setScanResult(prev => prev ? { ...prev, registrations: memberRegs } : prev);
      setRegSuccess("Đăng ký thành công!");
      setTimeout(() => { setShowRegModal(false); setRegSuccess(""); }, 2000);
    } catch (err: any) {
      setRegError(err.message || "Lỗi khi tạo đăng ký.");
    } finally {
      setRegSubmitting(false);
    }
  };

  // ── List tab ─────────────────────────────────
  const loadList = async (courseId?: number) => {
    setListLoading(true);
    try {
      const [regs, crs] = await Promise.all([
        apiService.registrations.getAll(courseId),
        apiService.courses.getAll(),
      ]);
      setListRegs(regs);
      setListCourses(crs);
      if (!selectedCourseId && crs.length > 0) {
        const def = getDefaultCourse(crs);
        if (def) setSelectedCourseId(def.id);
      }
    } catch { /* ignore */ } finally { setListLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "scan") {
      startCamera().then(() => { animRef.current = requestAnimationFrame(scanFrame); });
    } else {
      stopCamera();
      loadList(selectedCourseId ?? undefined);
    }
    return () => stopCamera();
  }, [activeTab]); // eslint-disable-line

  useEffect(() => {
    if (activeTab === "list") loadList(selectedCourseId ?? undefined);
  }, [selectedCourseId]); // eslint-disable-line

  const filteredRegs = listRegs.filter(r => {
    if (selectedCourseId && r.courseId !== selectedCourseId) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.memberName.toLowerCase().includes(q) ||
      r.memberCode?.toLowerCase().includes(q) ||
      r.memberOtherName?.toLowerCase().includes(q) ||
      r.bedCode?.toLowerCase().includes(q)
    );
  });

  // ── Render ───────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <span style={styles.headerTitle}>Ghi nhận đăng ký khóa tu</span>
        </div>
      </header>

      {/* Main */}
      <main style={styles.main}>
        {activeTab === "scan" ? (
          <ScanView
            videoRef={videoRef}
            canvasRef={canvasRef}
            scanState={scanState}
            scanResult={scanResult}
            scanError={scanError}
            cameraError={cameraError}
            isFlashOn={isFlashOn}
            showManualInput={showManualInput}
            manualCode={manualCode}
            onFlashToggle={() => setIsFlashOn(v => !v)}
            onShowManual={() => setShowManualInput(v => !v)}
            onManualCodeChange={setManualCode}
            onManualSubmit={handleManualSubmit}
            onReset={resetScan}
            onRegister={openRegModal}
          />
        ) : (
          <ListView
            registrations={filteredRegs}
            courses={listCourses}
            selectedCourseId={selectedCourseId}
            onCourseChange={setSelectedCourseId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={listLoading}
          />
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={styles.bottomNav}>
        <button id="qrs-tab-scan"
          style={{ ...styles.navBtn, ...(activeTab === "scan" ? styles.navBtnActive : {}) }}
          onClick={() => setActiveTab("scan")}>
          <span style={styles.navIcon} className="material-symbols-outlined">qr_code_scanner</span>
          <span style={styles.navLabel}>Quét mã</span>
          {activeTab === "scan" && <span style={styles.navActiveBar} />}
        </button>
        <button id="qrs-tab-list"
          style={{ ...styles.navBtn, ...(activeTab === "list" ? styles.navBtnActive : {}) }}
          onClick={() => setActiveTab("list")}>
          <span style={styles.navIcon} className="material-symbols-outlined">format_list_bulleted</span>
          <span style={styles.navLabel}>Danh sách</span>
          {activeTab === "list" && <span style={styles.navActiveBar} />}
        </button>
      </nav>

      {/* Registration Modal */}
      {showRegModal && scanResult && (
        <div style={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && setShowRegModal(false)}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Sắp xếp chỗ ngủ</h3>
              <button style={styles.modalClose} onClick={() => setShowRegModal(false)}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <p style={styles.modalSubtitle}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 4 }}>person</span>
              {scanResult.member.name}
              {scanResult.member.otherName && <em style={{ color: C.textMuted }}> ({scanResult.member.otherName})</em>}
            </p>

            {regSuccess ? (
              <div style={styles.regSuccessBox}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: C.success }}>check_circle</span>
                <p style={{ margin: 0, fontWeight: 700, color: C.success, fontSize: 16 }}>{regSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRegSubmit} style={styles.modalForm}>
                {/* Course */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Khoá tu <span style={{ color: C.error }}>*</span></label>
                  <div style={styles.selectWrap}>
                    <span className="material-symbols-outlined" style={styles.selectIcon}>school</span>
                    <select style={styles.formSelect} value={regCourseId}
                      onChange={e => handleCourseChange(Number(e.target.value))}>
                      <option value="">-- Chọn khoá tu --</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{isCourseActive(c) ? " ✓" : " (đã kết thúc)"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Area */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Khu phòng <span style={{ color: C.error }}>*</span></label>
                  <div style={styles.selectWrap}>
                    <span className="material-symbols-outlined" style={styles.selectIcon}>meeting_room</span>
                    <select style={styles.formSelect} value={regAreaId}
                      onChange={e => { setRegAreaId(Number(e.target.value)); setRegBedId(""); }}>
                      <option value="">-- Chọn khu phòng --</option>
                      {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Bed */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Chỗ ngủ <span style={{ color: C.error }}>*</span></label>
                  <div style={styles.selectWrap}>
                    <span className="material-symbols-outlined" style={styles.selectIcon}>bed</span>
                    <select style={styles.formSelect} value={regBedId}
                      onChange={e => setRegBedId(Number(e.target.value))}>
                      <option value="">-- Chọn chỗ ngủ còn trống --</option>
                      {availableBeds.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.code}{b.description ? ` · ${b.description}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {availableBeds.length === 0 && regAreaId && regCourseId && (
                    <p style={styles.noBedsNote}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle" }}>warning</span>
                      {" "}Không còn chỗ ngủ trống trong khu phòng này cho khóa tu đã chọn.
                    </p>
                  )}
                  {availableBeds.length > 0 && regCourseId && (
                    <p style={styles.bedsAvailableNote}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle" }}>check_circle</span>
                      {" "}{availableBeds.length} chỗ ngủ còn trống
                    </p>
                  )}
                </div>

                {/* Fromdate */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Ngày tham dự</label>
                  <div style={styles.selectWrap}>
                    <span className="material-symbols-outlined" style={styles.selectIcon}>event</span>
                    <input type="date" value={regFromdate}
                      onChange={e => setRegFromdate(e.target.value)}
                      style={{ ...styles.formSelect, paddingLeft: 40 }} />
                  </div>
                </div>

                {/* Days */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Số ngày đăng ký</label>
                  <div style={styles.selectWrap}>
                    <span className="material-symbols-outlined" style={styles.selectIcon}>calendar_today</span>
                    <input type="number" min={1} max={60} value={regDays}
                      onChange={e => setRegDays(parseInt(e.target.value) || 1)}
                      style={{ ...styles.formSelect, paddingLeft: 40 }} />
                  </div>
                </div>

                {/* Checkboxes: thu điện thoại & giấy tờ */}
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel} onClick={() => setRegRecievePhone(v => !v)}>
                    <div style={{ ...styles.checkbox, ...(regRecievePhone ? styles.checkboxChecked : {}) }}>
                      {regRecievePhone && <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff" }}>check</span>}
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.textSecondary }}>phone_iphone</span>
                    <span style={styles.checkboxText}>Thu điện thoại</span>
                  </label>
                  <label style={styles.checkboxLabel} onClick={() => setRegRecieveIdentity(v => !v)}>
                    <div style={{ ...styles.checkbox, ...(regRecieveIdentity ? styles.checkboxChecked : {}) }}>
                      {regRecieveIdentity && <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#fff" }}>check</span>}
                    </div>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.textSecondary }}>badge</span>
                    <span style={styles.checkboxText}>Thu giấy tờ tùy thân</span>
                  </label>
                </div>

                {/* Description / Note */}
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Ghi chú đăng ký</label>
                  <textarea
                    rows={2}
                    placeholder="Ghi chú thêm (nếu có)..."
                    value={regDescription}
                    onChange={e => setRegDescription(e.target.value)}
                    style={styles.textArea}
                  />
                </div>

                {regError && (
                  <div style={styles.regErrorBox}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {regError}
                  </div>
                )}

                <div style={styles.modalButtons}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowRegModal(false)}>Hủy</button>
                  <button type="submit" style={styles.submitBtn} disabled={regSubmitting || !regCourseId || !regBedId}>
                    {regSubmitting ? "Đang lưu..." : "Xác nhận đăng ký"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ScanView Component
// ─────────────────────────────────────────────
interface ScanViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  scanState: ScanState;
  scanResult: ScanResult | null;
  scanError: string;
  cameraError: string;
  isFlashOn: boolean;
  showManualInput: boolean;
  manualCode: string;
  onFlashToggle: () => void;
  onShowManual: () => void;
  onManualCodeChange: (v: string) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  onRegister: () => void;
}

function ScanView({
  videoRef, canvasRef, scanState, scanResult, scanError,
  cameraError, isFlashOn, showManualInput, manualCode,
  onFlashToggle, onShowManual, onManualCodeChange, onManualSubmit, onReset, onRegister,
}: ScanViewProps) {
  const isProcessing = scanState === "scanning";

  // ── FOUND: member info + register button ──
  if (scanState === "found" && scanResult) {
    const m = scanResult.member;
    const regs = scanResult.registrations;
    // Sort regs by most recent first
    const sortedRegs = [...regs].sort((a, b) => {
      const da = a.fromdate ? new Date(a.fromdate).getTime() : 0;
      const db = b.fromdate ? new Date(b.fromdate).getTime() : 0;
      return db - da;
    });

    return (
      <div style={styles.resultContainer}>
        {/* Member Info Card */}
        <div style={styles.memberCard}>
          <div style={styles.memberAvatarWrap}>
            <div style={styles.memberAvatar}>
              <span className="material-symbols-outlined" style={styles.memberAvatarIcon}>person</span>
            </div>
            <div style={styles.memberBadge}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: C.success }}>verified</span>
            </div>
          </div>

          <div style={styles.memberInfo}>
            <h2 style={styles.memberName}>{m.name}</h2>
            {m.otherName && <p style={styles.memberOtherName}>{m.otherName}</p>}
            <div style={styles.memberChips}>
              {m.code && <span style={styles.chip}>{m.code}</span>}
              {m.gender && <span style={{ ...styles.chip, ...styles.chipGender }}>{m.gender}</span>}
              {m.yearOfBirth && <span style={{ ...styles.chip, ...styles.chipYear }}>{m.yearOfBirth}</span>}
              {m.joinedCoursesCount > 0 && (
                <span style={{ ...styles.chip, ...styles.chipCourse }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>favorite</span>
                  {m.joinedCoursesCount} khoá tu
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Registration history */}
        {sortedRegs.length > 0 ? (
          <div style={styles.regHistoryCard}>
            <div style={styles.regInfoCardHeader}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: C.primary }}>history</span>
              <span style={styles.regInfoCardTitle}>Lịch sử đăng ký ({sortedRegs.length} khóa)</span>
            </div>
            <div style={styles.regHistoryList}>
              {sortedRegs.map((reg, idx) => {
                const actualDays = calcActualDays(reg.fromdate, reg.todate);
                const isActive = !reg.todate;
                const ratio = actualDays != null && reg.dayAttend ? `${actualDays}/${reg.dayAttend}` : null;
                return (
                  <div key={idx} style={{ ...styles.regHistoryItem, ...(isActive ? styles.regHistoryItemActive : {}) }}>
                    <div style={styles.regHistoryTop}>
                      <span style={styles.regHistoryCourseName}>{reg.courseName}</span>
                      <span style={{
                        ...styles.statusBadge,
                        ...(isActive ? styles.statusBadgeActive : styles.statusBadgeDone)
                      }}>
                        {isActive ? "Đang tham gia" : "Đã về"}
                      </span>
                    </div>
                    <div style={styles.regHistoryMeta}>
                      {reg.bedCode && (
                        <span style={styles.regHistoryMetaItem}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>bed</span>
                          {reg.bedCode}{reg.areaName ? ` · ${reg.areaName}` : ""}
                        </span>
                      )}
                      {reg.fromdate && (
                        <span style={styles.regHistoryMetaItem}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>event</span>
                          {new Date(reg.fromdate).toLocaleDateString("vi-VN")}
                          {reg.todate ? ` – ${new Date(reg.todate).toLocaleDateString("vi-VN")}` : " → Chưa về"}
                        </span>
                      )}
                    </div>
                    {/* Ngày tham gia thực tế / đăng ký */}
                    <div style={styles.regHistoryDays}>
                      {isActive ? (
                        <span style={styles.daysChipActive}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                          Đăng ký: <strong>{reg.dayAttend ?? "—"} ngày</strong>
                        </span>
                      ) : (
                        <>
                          <span style={styles.daysChipActual}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                            Thực tế: <strong>{actualDays ?? "—"} ngày</strong>
                          </span>
                          <span style={styles.daysChipReg}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span>
                            Đăng ký: <strong>{reg.dayAttend ?? "—"} ngày</strong>
                          </span>
                          {ratio && (
                            <span style={styles.daysRatio}>
                              Tỷ lệ: <strong>{ratio}</strong>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {/* Extra info */}
                    {(reg.recievePhone || reg.recieveIdentity || reg.description) && (
                      <div style={styles.regHistoryExtra}>
                        {reg.recievePhone && (
                          <span style={styles.extraBadge}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>phone_iphone</span> Thu đt
                          </span>
                        )}
                        {reg.recieveIdentity && (
                          <span style={styles.extraBadge}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>badge</span> Thu gt
                          </span>
                        )}
                        {reg.description && (
                          <span style={styles.extraNote}>{reg.description}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={styles.noRegCard}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: C.warn, marginBottom: 4 }}>info</span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.warn }}>Phật tử chưa có đăng ký khoá tu nào</p>
          </div>
        )}

        {/* Actions */}
        <button style={styles.registerBtn} onClick={onRegister} id="qrs-register-btn">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
          Sắp xếp chỗ ngủ &amp; Đăng ký
        </button>
        <button style={styles.scanAgainBtn} onClick={onReset} id="qrs-scan-again">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code_scanner</span>
          Quét mã khác
        </button>
      </div>
    );
  }

  // ── ERROR ──
  if (scanState === "error") {
    return (
      <div style={styles.resultContainer}>
        <div style={styles.errorCard}>
          <div style={styles.errorIconWrap}>
            <span className="material-symbols-outlined" style={styles.errorIcon}>person_off</span>
          </div>
          <h2 style={styles.errorTitle}>Không tìm thấy</h2>
          <p style={styles.errorMsg}>{scanError}</p>
          <button style={styles.registerBtn} onClick={onReset} id="qrs-scan-retry">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            Quét lại
          </button>
          <button style={styles.scanAgainBtn} onClick={onShowManual} id="qrs-manual-fallback">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>keyboard</span>
            Nhập mã thủ công
          </button>
        </div>
      </div>
    );
  }

  // ── CAMERA VIEW ──
  return (
    <div style={styles.cameraContainer}>
      <video ref={videoRef} style={styles.video} playsInline muted autoPlay />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div style={styles.gradientOverlay} />

      {cameraError && (
        <div style={styles.cameraErrorBanner}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>videocam_off</span>
          <span>{cameraError}</span>
        </div>
      )}

      {!isProcessing && (
        <div style={styles.scannerOverlay}>
          <div style={styles.viewfinder}>
            <span style={{ ...styles.corner, ...styles.cornerTL }} />
            <span style={{ ...styles.corner, ...styles.cornerTR }} />
            <span style={{ ...styles.corner, ...styles.cornerBL }} />
            <span style={{ ...styles.corner, ...styles.cornerBR }} />
            <div style={styles.scanLine} />
          </div>
          <p style={styles.scanInstruction}>Đưa mã QR vào khung để quét</p>
          <p style={styles.scanSubInstruction}>Hệ thống sẽ tự động nhận diện thông tin Phật tử</p>
          <div style={styles.scanControls}>
            <button id="qrs-flash-btn"
              style={{ ...styles.controlBtn, ...(isFlashOn ? styles.controlBtnActive : {}) }}
              onClick={onFlashToggle} title="Đèn flash">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                {isFlashOn ? "flashlight_on" : "flashlight_off"}
              </span>
            </button>
            <button id="qrs-manual-btn" style={styles.controlBtn} onClick={onShowManual} title="Nhập mã thủ công">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>keyboard</span>
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div style={styles.processingOverlay}>
          <div style={styles.spinner} />
          <p style={styles.processingText}>Đang tra cứu thông tin...</p>
        </div>
      )}

      {showManualInput && (
        <div style={styles.modalBackdrop} onClick={e => e.target === e.currentTarget && onShowManual()}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Nhập mã Phật tử</h3>
              <button style={styles.modalClose} onClick={onShowManual}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>
            <p style={styles.modalSubtitle}>Nhập theo định dạng: <strong>VD00536.536</strong> (mã chấm số định danh)</p>
            <form onSubmit={onManualSubmit} style={styles.modalForm}>
              <input id="qrs-manual-input" type="text" placeholder="VD: VD00536.536"
                value={manualCode} onChange={e => onManualCodeChange(e.target.value)}
                style={styles.manualInput} autoFocus />
              <div style={styles.modalButtons}>
                <button type="button" style={styles.cancelBtn} onClick={onShowManual}>Hủy</button>
                <button type="submit" style={styles.submitBtn} disabled={!manualCode.trim()}>Tra cứu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ListView Component
// ─────────────────────────────────────────────
interface ListViewProps {
  registrations: Registration[];
  courses: Course[];
  selectedCourseId: number | null;
  onCourseChange: (id: number | null) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
}

function ListView({ registrations, courses, selectedCourseId, onCourseChange, searchQuery, onSearchChange, loading }: ListViewProps) {
  return (
    <div style={styles.listContainer}>
      <div style={styles.listFilters}>
        <div style={styles.selectWrap}>
          <span className="material-symbols-outlined" style={styles.selectIcon}>school</span>
          <select id="qrs-course-select" style={styles.formSelect}
            value={selectedCourseId ?? ""} onChange={e => onCourseChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Tất cả khoá tu</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{isCourseActive(c) ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.searchWrap}>
          <span className="material-symbols-outlined" style={styles.searchIcon}>search</span>
          <input id="qrs-search-input" type="text" placeholder="Tìm tên, mã, chỗ ngủ..."
            value={searchQuery} onChange={e => onSearchChange(e.target.value)} style={styles.searchInput} />
          {searchQuery && (
            <button style={styles.searchClear} onClick={() => onSearchChange("")}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          )}
        </div>
      </div>

      <div style={styles.listCountRow}>
        <span style={styles.listCount}>{registrations.length} người đã đăng ký</span>
      </div>

      {loading ? (
        <div style={styles.listLoading}><div style={styles.spinner} /></div>
      ) : registrations.length === 0 ? (
        <div style={styles.emptyState}>
          <span className="material-symbols-outlined" style={styles.emptyIcon}>person_search</span>
          <p style={styles.emptyText}>Không có dữ liệu</p>
        </div>
      ) : (
        <div style={styles.regList}>
          {registrations.map((r, i) => {
            const actualDays = calcActualDays(r.fromdate, r.todate);
            const isActive = !r.todate;
            return (
              <div key={`${r.memberId}-${r.courseId}-${i}`} style={styles.regCard}>
                <div style={{ ...styles.regAvatar, ...(isActive ? styles.regAvatarActive : {}) }}>
                  <span className="material-symbols-outlined" style={{ ...styles.regAvatarIcon, ...(isActive ? { color: C.success } : {}) }}>person</span>
                </div>
                <div style={styles.regCardBody}>
                  <p style={styles.regCardName}>{r.memberName}</p>
                  {r.memberOtherName && <p style={styles.regCardOtherName}>{r.memberOtherName}</p>}
                  <div style={styles.regCardMeta}>
                    {r.memberCode && (
                      <span style={styles.regMeta}>
                        <span className="material-symbols-outlined" style={styles.regMetaIcon}>badge</span>{r.memberCode}
                      </span>
                    )}
                    {r.bedCode && (
                      <span style={styles.regMeta}>
                        <span className="material-symbols-outlined" style={styles.regMetaIcon}>bed</span>{r.bedCode}
                      </span>
                    )}
                    {r.areaName && (
                      <span style={styles.regMeta}>
                        <span className="material-symbols-outlined" style={styles.regMetaIcon}>location_on</span>{r.areaName}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  {isActive ? (
                    <span style={styles.statusBadgeActive}>Đang tham gia</span>
                  ) : (
                    <span style={styles.statusBadgeDone}>Đã về</span>
                  )}
                  {r.dayAttend != null && (
                    <span style={styles.dayBadge}>
                      {isActive ? `${r.dayAttend}N` : `${actualDays ?? "?"}/${r.dayAttend}N`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────
const C = {
  primary: "#1a1a1a",
  primaryLight: "rgba(26,26,26,0.08)",
  surface: "#f4f4f5",
  surfaceCard: "#ffffff",
  border: "#e4e4e7",
  textPrimary: "#18181b",
  textSecondary: "#52525b",
  textMuted: "#a1a1aa",
  success: "#16a34a",
  successLight: "#dcfce7",
  error: "#dc2626",
  errorLight: "#fee2e2",
  warn: "#d97706",
  warnLight: "#fef3c7",
  navActive: "#18181b",
  navInactive: "#a1a1aa",
  indigo: "#4f46e5",
  indigoLight: "#eef2ff",
  amber: "#b45309",
  amberLight: "#fef3c7",
};

const styles: Record<string, React.CSSProperties> = {
  // Layout
  root: { display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 768, margin: "0 auto", backgroundColor: C.surface, fontFamily: "'Hanken Grotesk', sans-serif", position: "relative", overflow: "hidden" },
  header: { position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 768, zIndex: 50, backgroundColor: C.surfaceCard, borderBottom: `1px solid ${C.border}`, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "center", height: 56, paddingInline: 24 },
  headerTitle: { fontSize: 17, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.01em" },
  main: { flex: 1, marginTop: 56, marginBottom: 64, overflow: "hidden", display: "flex", flexDirection: "column" },

  // Camera
  cameraContainer: { flex: 1, position: "relative", backgroundColor: "#000", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  video: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 },
  gradientOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 35%,transparent 65%,rgba(0,0,0,0.7) 100%)", pointerEvents: "none", zIndex: 1 },
  cameraErrorBanner: { position: "absolute", top: 16, left: 16, right: 16, zIndex: 10, backgroundColor: "rgba(220,38,38,0.88)", backdropFilter: "blur(8px)", color: "#fff", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500 },
  scannerOverlay: { position: "relative", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", paddingBlock: 24 },
  viewfinder: { position: "relative", width: 260, height: 260, marginBottom: 24 },
  corner: { position: "absolute", width: 36, height: 36, borderColor: "#fff", borderStyle: "solid" },
  cornerTL: { top: 0, left: 0, borderWidth: "4px 0 0 4px", borderRadius: "10px 0 0 0" },
  cornerTR: { top: 0, right: 0, borderWidth: "4px 4px 0 0", borderRadius: "0 10px 0 0" },
  cornerBL: { bottom: 0, left: 0, borderWidth: "0 0 4px 4px", borderRadius: "0 0 0 10px" },
  cornerBR: { bottom: 0, right: 0, borderWidth: "0 4px 4px 0", borderRadius: "0 0 10px 0" },
  scanLine: { position: "absolute", left: 4, right: 4, height: 2, background: "linear-gradient(90deg,transparent 0%,#fff 30%,#fff 70%,transparent 100%)", boxShadow: "0 0 12px 2px rgba(255,255,255,0.6)", animation: "qrsScanLine 2.5s ease-in-out infinite", top: "0%" },
  scanInstruction: { color: "#fff", fontSize: 15, fontWeight: 600, textAlign: "center", marginBottom: 6, textShadow: "0 1px 6px rgba(0,0,0,0.5)" },
  scanSubInstruction: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 400, textAlign: "center", marginBottom: 24 },
  scanControls: { display: "flex", gap: 16, marginTop: 8 },
  controlBtn: { width: 56, height: 56, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
  controlBtnActive: { backgroundColor: "rgba(255,255,255,0.3)", border: "1.5px solid rgba(255,255,255,0.6)" },
  processingOverlay: { position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, backgroundColor: "rgba(0,0,0,0.75)" },
  spinner: { width: 44, height: 44, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "qrsSpin 0.8s linear infinite" },
  processingText: { color: "#fff", fontSize: 14, fontWeight: 500 },

  // Result / Member card
  resultContainer: { flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 12 },
  memberCard: { backgroundColor: C.surfaceCard, borderRadius: 20, padding: 20, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.07)", border: `1px solid ${C.border}` },
  memberAvatarWrap: { position: "relative", flexShrink: 0 },
  memberAvatar: { width: 64, height: 64, borderRadius: "50%", backgroundColor: C.successLight, display: "flex", alignItems: "center", justifyContent: "center" },
  memberAvatarIcon: { fontSize: 32, color: C.success },
  memberBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: "0 0 2px", lineHeight: 1.3 },
  memberOtherName: { fontSize: 13, color: C.textSecondary, margin: "0 0 8px", fontStyle: "italic" },
  memberChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: { backgroundColor: C.primary, color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" },
  chipGender: { backgroundColor: "#eff6ff", color: "#2563eb" },
  chipYear: { backgroundColor: "#f5f5f5", color: C.textSecondary },
  chipCourse: { backgroundColor: C.successLight, color: C.success, display: "flex", alignItems: "center", gap: 3 },

  // Reg history card
  regHistoryCard: { backgroundColor: C.surfaceCard, borderRadius: 16, padding: "14px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: `1px solid ${C.border}` },
  regInfoCardHeader: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10 },
  regInfoCardTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: C.textMuted },
  regHistoryList: { display: "flex", flexDirection: "column", gap: 10 },
  regHistoryItem: { borderRadius: 12, padding: "10px 12px", backgroundColor: C.surface, border: `1px solid ${C.border}` },
  regHistoryItemActive: { backgroundColor: "#f0fdf4", border: `1px solid #bbf7d0` },
  regHistoryTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  regHistoryCourseName: { fontSize: 13, fontWeight: 700, color: C.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  regHistoryMeta: { display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 6 },
  regHistoryMetaItem: { display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: C.textSecondary, fontWeight: 500 },
  regHistoryDays: { display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 4 },
  regHistoryExtra: { display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 4 },
  extraBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.indigo, backgroundColor: C.indigoLight, borderRadius: 8, padding: "2px 8px", border: `1px solid rgba(79,70,229,0.2)` },
  extraNote: { fontSize: 11, color: C.textSecondary, fontStyle: "italic" as const, padding: "2px 0" },

  // Days chips
  daysChipActual: { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.success, backgroundColor: C.successLight, borderRadius: 8, padding: "2px 8px", border: `1px solid rgba(22,163,74,0.25)` },
  daysChipActive: { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.amber, backgroundColor: C.amberLight, borderRadius: 8, padding: "2px 8px", border: `1px solid rgba(217,119,6,0.25)` },
  daysChipReg: { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.textSecondary, backgroundColor: "#f4f4f5", borderRadius: 8, padding: "2px 8px", border: `1px solid ${C.border}` },
  daysRatio: { display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: C.indigo, backgroundColor: C.indigoLight, borderRadius: 8, padding: "2px 8px", border: `1px solid rgba(79,70,229,0.2)` },

  // Status badge
  statusBadge: { borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", flexShrink: 0 },
  statusBadgeActive: { backgroundColor: C.successLight, color: C.success, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700, border: `1px solid rgba(22,163,74,0.25)` },
  statusBadgeDone: { backgroundColor: "#f4f4f5", color: C.textMuted, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 700, border: `1px solid ${C.border}` },

  // No reg card
  noRegCard: { backgroundColor: C.warnLight, borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, border: `1px solid rgba(217,119,6,0.2)` },

  // Reg info card (legacy compat)
  regInfoCard: { backgroundColor: C.surfaceCard, borderRadius: 16, padding: "14px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: `1px solid ${C.border}` },
  regCourseName: { fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" },
  regDetailRow: { display: "flex", gap: 16, flexWrap: "wrap" as const },
  regDetail: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.textSecondary, fontWeight: 500 },
  regDetailIcon: { fontSize: 15, color: C.textMuted },

  // Action buttons
  registerBtn: { width: "100%", height: 52, borderRadius: 14, backgroundColor: C.primary, color: "#fff", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 0 },
  scanAgainBtn: { width: "100%", height: 48, borderRadius: 14, backgroundColor: "transparent", color: C.textSecondary, border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 0 },

  // Error card
  errorCard: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "0 24px" },
  errorIconWrap: { width: 88, height: 88, borderRadius: "50%", backgroundColor: C.errorLight, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  errorIcon: { fontSize: 44, color: C.error },
  errorTitle: { fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0, textAlign: "center" as const },
  errorMsg: { fontSize: 14, color: C.textSecondary, textAlign: "center" as const, margin: 0, lineHeight: 1.6 },

  // Nav
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 768, zIndex: 50, display: "flex", backgroundColor: C.surfaceCard, borderTop: `1px solid ${C.border}`, height: 64 },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", backgroundColor: "transparent", color: C.navInactive, cursor: "pointer", position: "relative", transition: "color 0.2s", paddingBottom: 4 },
  navBtnActive: { color: C.navActive, fontWeight: 700 },
  navIcon: { fontSize: 24 },
  navLabel: { fontSize: 11, fontWeight: 600, letterSpacing: "0.02em" },
  navActiveBar: { position: "absolute", top: 0, left: "25%", right: "25%", height: 3, borderRadius: "0 0 4px 4px", backgroundColor: C.navActive },

  // Modal
  modalBackdrop: { position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" },
  modal: { backgroundColor: C.surfaceCard, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", width: "100%", maxWidth: 768, boxShadow: "0 -8px 40px rgba(0,0,0,0.2)", maxHeight: "92dvh", overflowY: "auto" },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 },
  modalClose: { background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center", padding: 4, borderRadius: 8 },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, margin: "0 0 16px", display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 2 },
  modalForm: { display: "flex", flexDirection: "column", gap: 14 },
  modalButtons: { display: "flex", gap: 10, marginTop: 4 },

  // Form
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  formLabel: { fontSize: 13, fontWeight: 700, color: C.textPrimary },
  selectWrap: { position: "relative", display: "flex", alignItems: "center" },
  selectIcon: { position: "absolute", left: 12, fontSize: 18, color: C.textMuted, pointerEvents: "none" as const },
  formSelect: { width: "100%", height: 48, paddingLeft: 40, paddingRight: 16, borderRadius: 12, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.textPrimary, backgroundColor: "#fafafa", appearance: "none" as const, fontFamily: "inherit", cursor: "pointer", outline: "none", boxSizing: "border-box" as const },
  noBedsNote: { fontSize: 12, color: C.warn, margin: "4px 0 0", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 },
  bedsAvailableNote: { fontSize: 12, color: C.success, margin: "4px 0 0", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 },
  regErrorBox: { backgroundColor: C.errorLight, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.error, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  regSuccessBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "40px 0", textAlign: "center" as const },
  cancelBtn: { flex: 1, height: 52, borderRadius: 12, backgroundColor: "#f4f4f5", color: C.textSecondary, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600 },
  submitBtn: { flex: 2, height: 52, borderRadius: 12, backgroundColor: C.primary, color: "#fff", border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700 },
  manualInput: { width: "100%", height: 52, borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "0 16px", fontSize: 16, color: C.textPrimary, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, backgroundColor: "#fafafa" },

  // Checkboxes
  checkboxGroup: { display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${C.border}`, backgroundColor: "#fafafa", userSelect: "none" as const },
  checkbox: { width: 22, height: 22, borderRadius: 6, border: `2px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backgroundColor: "#fff", transition: "all 0.15s" },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxText: { fontSize: 14, fontWeight: 600, color: C.textPrimary, flex: 1 },
  textArea: { width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "12px 14px", fontSize: 14, color: C.textPrimary, backgroundColor: "#fafafa", fontFamily: "inherit", outline: "none", resize: "none" as const, boxSizing: "border-box" as const, lineHeight: 1.5 },

  // List tab
  listContainer: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: C.surface },
  listFilters: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10, backgroundColor: C.surfaceCard, borderBottom: `1px solid ${C.border}` },
  searchWrap: { position: "relative", display: "flex", alignItems: "center" },
  searchIcon: { position: "absolute", left: 12, fontSize: 18, color: C.textMuted, pointerEvents: "none" as const },
  searchInput: { width: "100%", height: 44, paddingLeft: 40, paddingRight: 40, borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, color: C.textPrimary, backgroundColor: "#fafafa", fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const },
  searchClear: { position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center", padding: 4 },
  listCountRow: { padding: "10px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  listCount: { fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: "0.07em" },
  listLoading: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: C.textMuted },
  emptyIcon: { fontSize: 64, opacity: 0.3 },
  emptyText: { fontSize: 15, fontWeight: 500 },
  regList: { flex: 1, overflowY: "auto", padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 8 },
  regCard: { backgroundColor: C.surfaceCard, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: `1px solid ${C.border}` },
  regAvatar: { width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  regAvatarActive: { backgroundColor: C.successLight },
  regAvatarIcon: { fontSize: 24, color: C.textMuted },
  regCardBody: { flex: 1, minWidth: 0 },
  regCardName: { fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  regCardOtherName: { fontSize: 12, color: C.textSecondary, margin: "1px 0 4px", fontStyle: "italic" as const },
  regCardMeta: { display: "flex", flexWrap: "wrap" as const, gap: 8 },
  regMeta: { display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: C.textMuted, fontWeight: 500 },
  regMetaIcon: { fontSize: 14 },
  dayBadge: { backgroundColor: C.primaryLight, color: C.primary, borderRadius: 8, padding: "4px 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em" },
};
