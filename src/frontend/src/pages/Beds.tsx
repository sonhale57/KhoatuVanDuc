import React, { useEffect, useState } from "react";
import { apiService, type Bed, type Area } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, Trash2, Edit, Move, RefreshCw } from "lucide-react";

const formatDescription = (desc: string | undefined | null) => {
  if (!desc) return "";
  return desc
    .split(/[-\n]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("\n");
};

export default function Beds() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dialog Add/Edit states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [areaId, setAreaId] = useState<number | null>(null);
  const [rowNumber, setRowNumber] = useState<number>(0);
  const [orderNumber, setOrderNumber] = useState<number>(0);
  const [type, setType] = useState("Chỗ ngủ");
  const [customType, setCustomType] = useState("");
  const [active, setActive] = useState(true);
  const [hasFan, setHasFan] = useState(false);
  const [hasLocker, setHasLocker] = useState(false);

  // Dialog Add Area states
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const [isEditingArea, setIsEditingArea] = useState(false);
  const [areaName, setAreaName] = useState("");
  const [areaDescription, setAreaDescription] = useState("");
  const [areaRows, setAreaRows] = useState(6);
  const [areaCols, setAreaCols] = useState(6);

  // Dynamic grid dimensions based on selected area
  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const gridRows = selectedArea?.rows || 6;
  const gridCols = selectedArea?.cols || 6;

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch Areas
      let aData = await apiService.areas.getAll();
      if (aData.length === 0) {
        // Auto-seed a default area if none exists
        const defaultArea = await apiService.areas.create({
          name: "Khu Phòng A",
          description: "Khu phòng ở nam/nữ mặc định",
          rows: 6,
          cols: 6
        });
        aData = [defaultArea];
      }
      setAreas(aData);

      if (selectedAreaId === null && aData.length > 0) {
        setSelectedAreaId(aData[0].id);
      }

      // 2. Fetch Beds
      const bData = await apiService.beds.getAll();
      setBeds(bData);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải dữ liệu sơ đồ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddArea = () => {
    setIsEditingArea(false);
    setAreaName("");
    setAreaDescription("");
    setAreaRows(6);
    setAreaCols(6);
    setError("");
    setSuccess("");
    setIsAreaOpen(true);
  };

  const handleOpenEditArea = () => {
    if (!selectedArea) return;
    setIsEditingArea(true);
    setAreaName(selectedArea.name);
    setAreaDescription(selectedArea.description || "");
    setAreaRows(selectedArea.rows);
    setAreaCols(selectedArea.cols);
    setError("");
    setSuccess("");
    setIsAreaOpen(true);
  };

  const handleAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!areaName.trim()) {
      setError("Tên khu phòng không được để trống.");
      return;
    }
    if (areaRows < 1 || areaCols < 1) {
      setError("Số lượng hàng và dãy phải lớn hơn hoặc bằng 1.");
      return;
    }

    try {
      const payload = {
        name: areaName,
        description: areaDescription,
        rows: areaRows,
        cols: areaCols
      };

      if (isEditingArea) {
        if (!selectedAreaId) return;
        // Validate coordinates to make sure no existing bed is cropped out
        const outOfBoundsBeds = activeAreaBeds.filter(
          (b) => (b.rowNumber ?? 0) >= areaRows || (b.orderNumber ?? 0) >= areaCols
        );
        if (outOfBoundsBeds.length > 0) {
          const bedCodes = outOfBoundsBeds.map((b) => b.code).join(", ");
          setError(
            `Không thể thu nhỏ phòng vì đang có ${outOfBoundsBeds.length} giường nằm ngoài giới hạn mới (giường: ${bedCodes}).`
          );
          return;
        }

        await apiService.areas.update(selectedAreaId, payload);
        setSuccess(`Cập nhật khu phòng "${areaName}" thành công.`);
        setIsAreaOpen(false);

        // Reload areas
        const aData = await apiService.areas.getAll();
        setAreas(aData);
      } else {
        const newArea = await apiService.areas.create(payload);
        setSuccess(`Thêm khu phòng "${newArea.name}" thành công.`);
        setIsAreaOpen(false);

        // Reload areas and select the newly created one
        const aData = await apiService.areas.getAll();
        setAreas(aData);
        setSelectedAreaId(newArea.id);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu thông tin khu phòng.");
    }
  };

  const handleOpenAdd = (targetRow = 0, targetCol = 0) => {
    setIsEditing(false);
    setEditId(null);
    setCode(`G-${targetRow + 1}-${targetCol + 1}`);
    setAreaId(selectedAreaId);
    setRowNumber(targetRow);
    setOrderNumber(targetCol);
    setType("Chỗ ngủ");
    setCustomType("");
    setActive(true);
    setHasFan(false);
    setHasLocker(false);
    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleOpenEdit = (bed: Bed, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditId(bed.id);
    setCode(bed.code);
    setAreaId(bed.areaId ?? null);
    setRowNumber(bed.rowNumber ?? 0);
    setOrderNumber(bed.orderNumber ?? 0);
    
    const bType = bed.type ?? "Chỗ ngủ";
    const predefinedTypes = ["Chỗ ngủ", "Vách ngăn", "Vách Chánh điện", "Vách tolet"];
    if (predefinedTypes.includes(bType)) {
      setType(bType);
      setCustomType("");
    } else {
      setType("Khác");
      setCustomType(bType);
    }
    setActive(bed.active);

    const desc = (bed.description || "").toLowerCase();
    setHasFan(desc.includes("chỗ có quạt lớn"));
    setHasLocker(desc.includes("tủ đồ cao"));

    setError("");
    setSuccess("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!code.trim()) {
      setError("Tên/Mã không được để trống.");
      return;
    }
    if (!areaId) {
      setError("Vui lòng chọn khu vực/phòng.");
      return;
    }
    
    const finalType = type === "Khác" ? customType : type;
    if (type === "Khác" && !customType.trim()) {
      setError("Vui lòng nhập tên loại vị trí khác.");
      return;
    }

    // Check collision in local state before api
    const collision = beds.find(b => b.areaId === areaId && b.rowNumber === rowNumber && b.orderNumber === orderNumber && b.id !== editId);
    if (collision) {
      setError(`Vị trí Hàng ${rowNumber + 1}, Dãy ${orderNumber + 1} của khu vực này đã có giường/vách ngăn ${collision.code}.`);
      return;
    }

    try {
      let descParts = [];
      if (hasFan) descParts.push("Chỗ có quạt lớn");
      if (hasLocker) descParts.push("Tủ đồ cao");
      const finalDescription = descParts.join("\n");

      const payload = {
        areaId,
        code,
        description: finalType === "Chỗ ngủ" ? finalDescription : "",
        active: finalType === "Chỗ ngủ" ? active : false,
        rowNumber,
        orderNumber,
        type: finalType
      };

      if (isEditing && editId !== null) {
        await apiService.beds.update(editId, payload);
        setSuccess("Cập nhật thông tin thành công.");
      } else {
        await apiService.beds.create(payload);
        setSuccess("Thêm vị trí mới thành công.");
      }
      setIsOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu thông tin.");
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa chỗ ngủ này?")) return;
    setError("");
    setSuccess("");

    try {
      await apiService.beds.delete(id);
      setSuccess("Xóa chỗ ngủ thành công.");
      loadData();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xóa chỗ ngủ.");
    }
  };

  // NATIVE HTML5 DRAG & DROP IMPLEMENTATION
  const handleDragStart = (e: React.DragEvent, bedId: number) => {
    e.dataTransfer.setData("text/plain", bedId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDrop = async (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    const bedIdStr = e.dataTransfer.getData("text/plain");
    if (!bedIdStr) return;
    const bedId = Number(bedIdStr);

    const sourceBed = beds.find(b => b.id === bedId);
    if (!sourceBed) return;

    // Check if dropping on the same cell
    if (sourceBed.rowNumber === targetRow && sourceBed.orderNumber === targetCol) return;

    setError("");
    setSuccess("");

    // Check if target cell has an existing bed
    const targetBed = beds.find(b => b.areaId === selectedAreaId && b.rowNumber === targetRow && b.orderNumber === targetCol);

    try {
      if (targetBed) {
        // Swap positions
        const updates = [
          { id: sourceBed.id, rowNumber: targetRow, orderNumber: targetCol },
          { id: targetBed.id, rowNumber: sourceBed.rowNumber!, orderNumber: sourceBed.orderNumber! }
        ];
        await apiService.beds.batchUpdatePositions(updates);
        setSuccess(`Đã hoán đổi vị trí giường ${sourceBed.code} và ${targetBed.code}.`);
      } else {
        // Move to empty cell
        const updates = [{ id: sourceBed.id, rowNumber: targetRow, orderNumber: targetCol }];
        await apiService.beds.batchUpdatePositions(updates);
        setSuccess(`Đã chuyển giường ${sourceBed.code} đến Hàng ${targetRow + 1}, Dãy ${targetCol + 1}.`);
      }
      loadData();
    } catch (err: any) {
      setError(err.message || "Không thể cập nhật vị trí giường.");
    }
  };

  // Filter beds of the active area
  const activeAreaBeds = beds.filter(b => b.areaId === selectedAreaId);

  // Renders Room Grid cells
  const renderGrid = () => {
    const grid = [];
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        // Find if a bed exists at this cell
        const bed = activeAreaBeds.find(b => b.rowNumber === r && b.orderNumber === c);

        let cellClass = "bg-muted/5 border-dashed border-slate-200/20 dark:border-slate-800/60 hover:border-primary/40 cursor-pointer";
        if (bed) {
          if (bed.type !== "Chỗ ngủ") {
            cellClass = "bg-slate-700 dark:bg-slate-800 border-solid border-slate-900 shadow-sm  text-slate-100";
          } else if (!bed.active) {
            cellClass = "bg-slate-100 dark:bg-slate-900/40 border-dashed border-slate-300 opacity-70 text-muted-foreground shadow-sm";
          } else {
            cellClass = "bg-card border-solid border-primary/20 shadow-sm";
          }
        }

        grid.push(
          <div
            key={`${r}-${c}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, r, c)}
            className={`relative min-h-[105px] border rounded-xl flex flex-col items-center justify-center transition-all ${cellClass}`}
            onClick={() => !bed && handleOpenAdd(r, c)}
            title={bed ? (bed.type !== "Chỗ ngủ" ? bed.type : `Giường: ${bed.code}`) : `Click để thêm vị trí ở Hàng ${r + 1}, Dãy ${c + 1}`}
          >
            {bed ? (
              bed.type !== "Chỗ ngủ" ? (
                <div className="w-full h-full p-3 flex flex-col justify-between select-none">
                  <div className="flex items-start justify-end w-full">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleOpenEdit(bed, e)}
                        className="h-6 w-6 text-slate-300 hover:text-white rounded hover:bg-white/10"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(bed.id, e)}
                        className="h-6 w-6 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold text-center uppercase tracking-wider">
                    {bed.type}
                  </div>
                </div>
              ) : (
                <div
                  draggable={bed.active}
                  onDragStart={(e) => bed.active && handleDragStart(e, bed.id)}
                  className="w-full h-full p-3 flex flex-col justify-between cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-7 w-7 items-center justify-center rounded ${!bed.active ? "bg-slate-200 dark:bg-slate-700 text-slate-500" : "bg-primary/10 text-primary"}`}>
                      <BedDouble className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleOpenEdit(bed, e)}
                        className="h-6 w-6 text-muted-foreground hover:text-foreground rounded"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(bed.id, e)}
                        className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-xs font-bold text-foreground block">{bed.code}</span>
                    {!bed.active ? (
                      <span className="inline-flex items-center text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-1 py-0.5 rounded mt-1">
                        Tạm khóa
                      </span>
                    ) : bed.description ? (
                      <span className="text-[9px] leading-tight text-muted-foreground/80 font-semibold block mt-1 whitespace-pre-line" title={formatDescription(bed.description)}>
                        {formatDescription(bed.description)}
                      </span>
                    ) : null}
                  </div>

                  {bed.active && (
                    <div className="absolute bottom-1 right-2 opacity-20 hover:opacity-50">
                      <Move className="h-3 w-3" />
                    </div>
                  )}
                </div>
              )
            ) : (
              <span className="text-[9px] text-muted-foreground/60 font-semibold group hover:text-primary transition-colors flex items-center gap-1">
                <Plus className="h-2 w-2" /> {r + 1}-{c + 1}
              </span>
            )}
          </div>
        );
      }
    }
    return grid;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sơ đồ Chỗ ngủ</h1>
          <p className="text-muted-foreground">Kéo thả chỗ ngủ để sắp xếp nhanh hoặc click vào ô trống để tạo giường mới.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenAdd(0, 0)} className="flex items-center gap-2 font-semibold">
            <Plus className="h-4 w-4" /> Thêm chỗ ngủ
          </Button>
          <Button variant="outline" onClick={handleOpenAddArea} className="flex items-center gap-2 font-semibold" title="Thêm khu phòng mới">
            <Plus className="h-4 w-4" /> Thêm khu phòng
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

      {/* Grid Settings Panel */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Select Area */}
              <div className="w-[180px]">
                <Label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Khu phòng</Label>
                <Select value={selectedAreaId?.toString() || ""} onValueChange={(val) => setSelectedAreaId(Number(val))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn khu phòng" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(area => (
                      <SelectItem key={area.id} value={area.id.toString()}>{area.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button variant="outline" onClick={handleOpenEditArea} className="h-9 flex items-center gap-1.5 font-semibold text-xs text-primary hover:text-primary" title="Sửa thông tin khu phòng hiện tại" disabled={!selectedAreaId}>
                  <Edit className="h-3.5 w-3.5" /> Sửa khu phòng
                </Button>
                <Button variant="outline" size="icon" onClick={loadData} className="h-9 w-9" title="Tải lại sơ đồ">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div>

              {/* Room Matrix Grid */}
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
              >
                {renderGrid()}
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-primary/20 bg-card" /> Chỗ ngủ hoạt động
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-slate-900 bg-slate-700" /> Vách ngăn
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-slate-100 opacity-70" /> Tạm khóa
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground/60">
                  <Move className="h-3.5 w-3.5" /> Kéo thả chỗ ngủ hoạt động để hoán đổi/di chuyển
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bed Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditing ? "Cập nhật chỗ ngủ" : "Tạo chỗ ngủ mới"}
              </DialogTitle>
              <DialogDescription>
                Nhập tên chỗ ngủ và xác nhận tọa độ bố trí.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right font-medium">Tên giường</Label>
                <Input
                  id="name"
                  placeholder="G-1-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="area" className="text-right font-medium">Khu phòng</Label>
                <div className="col-span-3">
                  <Select value={areaId?.toString() || ""} onValueChange={(val) => setAreaId(Number(val))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn khu phòng" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map(a => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="row" className="text-right font-medium">Hàng số</Label>
                <Input
                  id="row"
                  type="number"
                  min={0}
                  max={gridRows - 1}
                  value={rowNumber}
                  onChange={(e) => setRowNumber(parseInt(e.target.value) || 0)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="col" className="text-right font-medium">Dãy số</Label>
                <Input
                  id="col"
                  type="number"
                  min={0}
                  max={gridCols - 1}
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(parseInt(e.target.value) || 0)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right font-medium">Loại vị trí</Label>
                <div className="col-span-3">
                  <Select value={type} onValueChange={(val) => setType(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn loại vị trí" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chỗ ngủ">Chỗ ngủ</SelectItem>
                      <SelectItem value="Vách ngăn">Vách ngăn</SelectItem>
                      <SelectItem value="Vách Chánh điện">Vách Chánh điện</SelectItem>
                      <SelectItem value="Vách tolet">Vách tolet</SelectItem>
                      <SelectItem value="Khác">Khác (Tùy chọn)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {type === "Khác" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customType" className="text-right font-medium">Loại khác</Label>
                  <Input
                    id="customType"
                    placeholder="Nhập tên loại..."
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    required
                    className="col-span-3"
                  />
                </div>
              )}

              {type === "Chỗ ngủ" && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-right font-medium text-sm pt-0.5">Thuộc tính</span>
                  <div className="col-span-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        id="active"
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor="active" className="text-xs cursor-pointer select-none font-medium">
                        Cho phép xếp chỗ (Hoạt động)
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="hasFan"
                        type="checkbox"
                        checked={hasFan}
                        onChange={(e) => setHasFan(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor="hasFan" className="text-xs cursor-pointer select-none font-medium">
                        Chỗ có quạt lớn
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="hasLocker"
                        type="checkbox"
                        checked={hasLocker}
                        onChange={(e) => setHasLocker(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <Label htmlFor="hasLocker" className="text-xs cursor-pointer select-none font-medium">
                        Tủ đồ cao
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button type="submit">{isEditing ? "Lưu" : "Thêm mới"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Area Add/Edit Dialog */}
      <Dialog open={isAreaOpen} onOpenChange={setIsAreaOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleAreaSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isEditingArea ? "Sửa khu phòng" : "Thêm khu phòng mới"}
              </DialogTitle>
              <DialogDescription>
                {isEditingArea
                  ? "Cập nhật tên, mô tả hoặc thay đổi số hàng và số dãy của khu phòng này."
                  : "Nhập tên khu phòng và số lượng hàng, số lượng dãy để thiết lập sơ đồ giường ngủ."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="areaName" className="text-right font-medium">Tên khu phòng</Label>
                <Input
                  id="areaName"
                  placeholder="Khu Phòng B"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="areaDesc" className="text-right font-medium">Mô tả</Label>
                <Input
                  id="areaDesc"
                  placeholder="Khu phòng dành cho Nữ"
                  value={areaDescription}
                  onChange={(e) => setAreaDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="areaRows" className="text-right font-medium">Số hàng</Label>
                <Input
                  id="areaRows"
                  type="number"
                  min={1}
                  max={20}
                  value={areaRows}
                  onChange={(e) => setAreaRows(parseInt(e.target.value) || 1)}
                  required
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="areaCols" className="text-right font-medium">Số dãy</Label>
                <Input
                  id="areaCols"
                  type="number"
                  min={1}
                  max={20}
                  value={areaCols}
                  onChange={(e) => setAreaCols(parseInt(e.target.value) || 1)}
                  required
                  className="col-span-3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAreaOpen(false)}>Hủy</Button>
              <Button type="submit">{isEditingArea ? "Cập nhật" : "Thêm mới"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
