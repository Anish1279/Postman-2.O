"use client";

import { useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { createCookie, deleteCookie, updateCookie } from "@/lib/api";
import { Trash2, X } from "lucide-react";

interface CookieManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CookieManagerDialog({ open, onOpenChange }: CookieManagerDialogProps) {
  const cookies = useWorkspaceStore((state) => state.cookies);
  const refreshCookies = useWorkspaceStore((state) => state.refreshCookies);

  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPath, setNewPath] = useState("/");
  const [newSecure, setNewSecure] = useState(false);
  const [newHttpOnly, setNewHttpOnly] = useState(false);

  const [isAdding, setIsAdding] = useState(false);

  if (!open) return null;

  async function handleAddCookie() {
    if (!newDomain || !newName || !newValue) return;
    setIsAdding(true);
    try {
      await createCookie({
        domain: newDomain,
        name: newName,
        value: newValue,
        path: newPath,
        secure: newSecure,
        http_only: newHttpOnly,
      });
      await refreshCookies();
      setNewDomain("");
      setNewName("");
      setNewValue("");
      setNewPath("/");
      setNewSecure(false);
      setNewHttpOnly(false);
    } catch (error) {
      console.error("Failed to add cookie:", error);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCookie(id);
      await refreshCookies();
    } catch (error) {
      console.error("Failed to delete cookie:", error);
    }
  }

  return (
    <>
      <div className="dialog-backdrop" onClick={() => onOpenChange(false)} />
      <div className="new-item-dialog" style={{ width: "800px", maxWidth: "90vw", display: "flex", flexDirection: "column", maxHeight: "85vh" }}>
        <div className="dialog-header">
          <h3>Manage Cookies</h3>
          <button className="icon-button compact" onClick={() => onOpenChange(false)}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, opacity: 0.7, fontSize: "12px", textTransform: "uppercase", letterSpacing: 0 }}>Add Cookie</h4>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 2 }}>
                <label style={{ fontSize: "12px" }}>Domain</label>
                <input
                  type="text"
                  placeholder="e.g. httpbin.org"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="env-input"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 2 }}>
                <label style={{ fontSize: "12px" }}>Name</label>
                <input
                  type="text"
                  placeholder="session_id"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="env-input"
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 3 }}>
                <label style={{ fontSize: "12px" }}>Value</label>
                <input
                  type="text"
                  placeholder="value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="env-input"
                />
              </div>
              <button
                className="action-button primary"
                onClick={handleAddCookie}
                disabled={isAdding || !newDomain || !newName || !newValue}
                style={{ height: "32px", padding: "0 16px" }}
              >
                Add
              </button>
            </div>
            
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "150px" }}>
                <label style={{ fontSize: "12px" }}>Path</label>
                <input
                  type="text"
                  placeholder="/"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  className="env-input"
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", marginTop: "16px" }}>
                <input
                  type="checkbox"
                  checked={newSecure}
                  onChange={(e) => setNewSecure(e.target.checked)}
                />
                Secure
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", marginTop: "16px" }}>
                <input
                  type="checkbox"
                  checked={newHttpOnly}
                  onChange={(e) => setNewHttpOnly(e.target.checked)}
                />
                HttpOnly
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, opacity: 0.7, fontSize: "12px", textTransform: "uppercase", letterSpacing: 0 }}>Saved Cookies</h4>
            {cookies.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", opacity: 0.5, fontSize: "14px", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                No cookies saved. Try sending a request that sets a cookie, or add one manually above.
              </div>
            ) : (
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "6px", overflow: "hidden" }}>
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead style={{ background: "var(--bg-elevated)", fontSize: "12px", opacity: 0.7, textTransform: "uppercase" }}>
                    <tr>
                      <th style={{ padding: "8px 16px", fontWeight: "normal" }}>Domain</th>
                      <th style={{ padding: "8px 16px", fontWeight: "normal" }}>Name</th>
                      <th style={{ padding: "8px 16px", fontWeight: "normal" }}>Value</th>
                      <th style={{ padding: "8px 16px", fontWeight: "normal" }}>Path</th>
                      <th style={{ padding: "8px 16px", width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookies.map((c) => (
                      <tr key={c.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "8px 16px", color: "var(--color-method-get)" }}>{c.domain}</td>
                        <td style={{ padding: "8px 16px" }}>{c.name}</td>
                        <td style={{ padding: "8px 16px", fontFamily: "monospace", fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.value}>
                          {c.value}
                        </td>
                        <td style={{ padding: "8px 16px", opacity: 0.6 }}>{c.path}</td>
                        <td style={{ padding: "8px 16px", textAlign: "right" }}>
                          <button
                            className="icon-button compact"
                            style={{ color: "var(--color-method-delete)" }}
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
