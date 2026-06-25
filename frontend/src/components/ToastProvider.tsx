"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToastStore } from "@/lib/toast";

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div className="toast-icon">
            {t.type === "success" && <CheckCircle2 size={16} />}
            {t.type === "error" && <AlertCircle size={16} />}
            {t.type === "info" && <Info size={16} />}
          </div>
          <div className="toast-message">{t.message}</div>
          <button className="toast-close" onClick={() => removeToast(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
