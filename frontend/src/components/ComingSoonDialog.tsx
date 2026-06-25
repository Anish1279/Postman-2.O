"use client";

import { X } from "lucide-react";

interface ComingSoonDialogProps {
  title: string;
  onClose: () => void;
}

export function ComingSoonDialog({ title, onClose }: ComingSoonDialogProps) {
  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="new-item-dialog">
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="icon-button compact" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          <p style={{ margin: "10px 0", color: "var(--text-secondary)", fontSize: "13px", lineHeight: 1.5 }}>
            This feature is currently under development. Please check back later!
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
            <button className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
