import { createContext, useContext, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ToastContextType {
  toast: (type: "success" | "error" | "info", title: string, description?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);
  const [confirmResolver, setConfirmResolver] = useState<((value: boolean) => void) | null>(null);

  const toast = (type: "success" | "error" | "info", title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    setConfirmOpts(options);
    setConfirmOpen(true);
    return new Promise<boolean>((resolve) => {
      setConfirmResolver(() => resolve);
    });
  };

  const handleConfirmClose = (value: boolean) => {
    setConfirmOpen(false);
    if (confirmResolver) {
      confirmResolver(value);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 p-4 rounded-xl border bg-card shadow-lg animate-slide-in pointer-events-auto transition-all"
            style={{
              borderColor:
                t.type === "success"
                  ? "rgba(16, 185, 129, 0.3)"
                  : t.type === "error"
                  ? "rgba(239, 68, 68, 0.3)"
                  : "rgba(59, 130, 246, 0.3)",
            }}
          >
            {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}

            <div className="flex-1">
              <h4 className="text-sm font-bold text-foreground leading-tight">{t.title}</h4>
              {t.description && <p className="text-xs text-muted-foreground mt-1 font-medium">{t.description}</p>}
            </div>

            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-muted-foreground hover:text-foreground shrink-0 rounded p-0.5 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modern Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open) handleConfirmClose(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {confirmOpts?.title || "Xác nhận hành động"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground pt-1">
              {confirmOpts?.description || "Bạn có chắc chắn muốn thực hiện hành động này?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" size="sm" onClick={() => handleConfirmClose(false)} className="h-8 font-semibold text-xs">
              {confirmOpts?.cancelText || "Hủy bỏ"}
            </Button>
            <Button
              variant={confirmOpts?.variant || "default"}
              size="sm"
              onClick={() => handleConfirmClose(true)}
              className="h-8 font-semibold text-xs"
            >
              {confirmOpts?.confirmText || "Xác nhận"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToastContext.Provider>
  );
}
