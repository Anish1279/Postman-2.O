"use client";

import { Box, Download, Edit2, FilePlus, FileText, Folder, FolderPlus, History, MoreHorizontal, Plus, Search, Server, Trash2, Upload, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { CollectionNode, HistoryEntry, HttpMethod } from "@/lib/types";
import { ComingSoonDialog } from "@/components/ComingSoonDialog";
import { exportWorkspace, importWorkspace } from "@/lib/api";
import { toast } from "@/lib/toast";

// ---------------------------------------------------------------------------
// Inline rename input
// ---------------------------------------------------------------------------

function InlineRenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      className="inline-rename-input"
      value={value}
      autoFocus
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const trimmed = value.trim();
        if (trimmed && trimmed !== initialValue) {
          onCommit(trimmed);
        } else {
          onCancel();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const trimmed = value.trim();
          if (trimmed && trimmed !== initialValue) {
            onCommit(trimmed);
          } else {
            onCancel();
          }
        }
        if (e.key === "Escape") {
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface ContextMenuState {
  nodeId: number;
  nodeType: "folder" | "request";
  x: number;
  y: number;
}

function ContextMenu({
  state,
  onClose,
  onRename,
  onDelete,
  onAddFolder,
  onAddRequest,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAddFolder: () => void;
  onAddRequest: () => void;
}) {
  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} />
      <div className="context-menu" style={{ top: state.y, left: state.x }}>
        {state.nodeType === "folder" ? (
          <>
            <button onClick={onAddRequest}>
              <FilePlus size={14} />
              Add Request
            </button>
            <button onClick={onAddFolder}>
              <FolderPlus size={14} />
              Add Folder
            </button>
            <div className="context-menu-separator" />
          </>
        ) : null}
        <button onClick={onRename}>
          <Edit2 size={14} />
          Rename
        </button>
        <button className="danger" onClick={onDelete}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Collection tree
// ---------------------------------------------------------------------------

function CollectionTree({
  nodes,
  depth = 0,
  contextMenu,
  setContextMenu,
  renamingId,
  setRenamingId,
}: {
  nodes: CollectionNode[];
  depth?: number;
  contextMenu: ContextMenuState | null;
  setContextMenu: (state: ContextMenuState | null) => void;
  renamingId: number | null;
  setRenamingId: (id: number | null) => void;
}) {
  const openRequest = useWorkspaceStore((state) => state.openRequest);
  const renameCollectionNode = useWorkspaceStore((state) => state.renameCollectionNode);

  return (
    <div className="collection-tree">
      {nodes.map((node) => {
        const isFolder = node.type === "folder";
        const isRenaming = renamingId === node.id;

        return (
          <div key={node.id}>
            <button
              className="tree-row"
              style={{ paddingLeft: `${12 + depth * 14}px` }}
              onClick={() => {
                if (node.type === "request") {
                  openRequest(node.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  nodeId: node.id,
                  nodeType: node.type,
                  x: e.clientX,
                  y: e.clientY,
                });
              }}
            >
              {isFolder ? <Folder size={15} /> : <FileText size={15} />}
              {isRenaming ? (
                <InlineRenameInput
                  initialValue={node.name}
                  onCommit={(newName) => {
                    renameCollectionNode(node.id, newName);
                    setRenamingId(null);
                  }}
                  onCancel={() => setRenamingId(null)}
                />
              ) : (
                <span>{node.name}</span>
              )}
              <MoreHorizontal
                size={14}
                className="row-more"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setContextMenu({
                    nodeId: node.id,
                    nodeType: node.type,
                    x: rect.right,
                    y: rect.bottom,
                  });
                }}
              />
            </button>
            {isFolder && node.children?.length ? (
              <CollectionTree
                nodes={node.children}
                depth={depth + 1}
                contextMenu={contextMenu}
                setContextMenu={setContextMenu}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New collection dialog
// ---------------------------------------------------------------------------

function NewItemDialog({
  onClose,
  onCreateFolder,
  onCreateRequest,
}: {
  onClose: () => void;
  onCreateFolder: (name: string) => void;
  onCreateRequest: (name: string) => void;
}) {
  const [mode, setMode] = useState<"folder" | "request">("folder");
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "folder") {
      onCreateFolder(trimmed);
    } else {
      onCreateRequest(trimmed);
    }
    onClose();
  };

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="new-item-dialog">
        <div className="dialog-header">
          <h3>New Collection Item</h3>
          <button className="icon-button compact" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">
          <div className="segmented-control">
            <button className={mode === "folder" ? "active" : ""} onClick={() => setMode("folder")}>
              <Folder size={14} />
              Folder
            </button>
            <button className={mode === "request" ? "active" : ""} onClick={() => setMode("request")}>
              <FileText size={14} />
              Request
            </button>
          </div>
          <input
            className="dialog-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "folder" ? "Folder name" : "Request name"}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
          />
        </div>
        <div className="dialog-footer">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="send-button" onClick={handleSubmit} disabled={!name.trim()}>
            Create
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function methodLabel(method: HttpMethod): string {
  return method === "DELETE" ? "DEL" : method;
}

function historyDateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(date);
}

function groupHistory(history: HistoryEntry[]): Array<{ label: string; entries: HistoryEntry[] }> {
  return history.reduce<Array<{ label: string; entries: HistoryEntry[] }>>((groups, item) => {
    const label = historyDateLabel(item.requestedAt);
    const existing = groups.find((group) => group.label === label);
    if (existing) {
      existing.entries.push(item);
    } else {
      groups.push({ label, entries: [item] });
    }
    return groups;
  }, []);
}

export function Sidebar() {
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const activeSidebar = useWorkspaceStore((state) => state.activeSidebar);
  const setActiveSidebar = useWorkspaceStore((state) => state.setActiveSidebar);
  const collections = useWorkspaceStore((state) => state.collections);
  const history = useWorkspaceStore((state) => state.history);
  const createFolder = useWorkspaceStore((state) => state.createFolder);
  const createRequestInCollection = useWorkspaceStore((state) => state.createRequestInCollection);
  const deleteCollectionNode = useWorkspaceStore((state) => state.deleteCollectionNode);
  const openHistoryEntry = useWorkspaceStore((state) => state.openHistoryEntry);

  const filteredHistory = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) {
      return history;
    }
    return history.filter((item) => `${item.name} ${item.method} ${item.url}`.toLowerCase().includes(value));
  }, [history, search]);
  const groupedHistory = useMemo(() => groupHistory(filteredHistory), [filteredHistory]);

  const handleContextRename = useCallback(() => {
    if (contextMenu) {
      setRenamingId(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu]);

  const handleContextDelete = useCallback(() => {
    if (contextMenu) {
      deleteCollectionNode(contextMenu.nodeId);
      setContextMenu(null);
    }
  }, [contextMenu, deleteCollectionNode]);

  const handleContextAddFolder = useCallback(() => {
    if (contextMenu) {
      const parentId = contextMenu.nodeId;
      const name = prompt("Folder name:");
      if (name?.trim()) {
        createFolder(parentId, name.trim());
      }
      setContextMenu(null);
    }
  }, [contextMenu, createFolder]);

  const handleContextAddRequest = useCallback(() => {
    if (contextMenu) {
      const parentId = contextMenu.nodeId;
      const name = prompt("Request name:") ?? "Untitled Request";
      createRequestInCollection(parentId, name.trim() || "Untitled Request");
      setContextMenu(null);
    }
  }, [contextMenu, createRequestInCollection]);

  return (
    <aside className="sidebar">
      <div className="sidebar-mode-strip">
        <button title="Collections" className={activeSidebar === "collections" ? "active" : ""} onClick={() => setActiveSidebar("collections")}>
          <Box size={20} />
        </button>
        <button title="APIs" onClick={() => setComingSoonTitle("APIs")}>
          <Server size={20} />
        </button>
        <button title="History" className={activeSidebar === "history" ? "active" : ""} onClick={() => setActiveSidebar("history")}>
          <History size={20} />
        </button>
        <button title="Files" onClick={() => setComingSoonTitle("Files")}>
          <Folder size={20} />
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={14} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
      </div>

      <div className="sidebar-heading">
        <span>{activeSidebar === "collections" ? "Collections" : "Request History"}</span>
        {activeSidebar === "collections" ? (
          <div className="sidebar-heading-actions">
            <button className="icon-button compact" title="Import Workspace" onClick={() => {
              const fileInput = document.createElement("input");
              fileInput.type = "file";
              fileInput.accept = "application/json";
              fileInput.onchange = async (e: any) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  await importWorkspace(data);
                  toast.success("Workspace imported successfully (Reload to see changes)");
                  setTimeout(() => window.location.reload(), 1500);
                } catch (err: any) {
                  toast.error("Failed to import workspace: " + err.message);
                }
              };
              fileInput.click();
            }}>
              <Upload size={14} />
            </button>
            <button className="icon-button compact" title="Export Workspace" onClick={async () => {
              try {
                const data = await exportWorkspace();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "postman_clone_workspace.json";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Workspace exported");
              } catch (err: any) {
                toast.error("Failed to export workspace: " + err.message);
              }
            }}>
              <Download size={14} />
            </button>
            <button className="icon-button compact" title="New collection item" onClick={() => setShowNewDialog(true)}>
              <Plus size={15} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="sidebar-content">
        {activeSidebar === "collections" ? (
          collections.length > 0 ? (
            <CollectionTree
              nodes={collections}
              contextMenu={contextMenu}
              setContextMenu={setContextMenu}
              renamingId={renamingId}
              setRenamingId={setRenamingId}
            />
          ) : (
            <div className="empty-sidebar-state">
              <p>No collections yet</p>
              <button className="secondary-button compact" onClick={() => setShowNewDialog(true)}>
                <Plus size={14} />
                Create
              </button>
            </div>
          )
        ) : (
          <div className="history-list">
            {groupedHistory.length > 0 ? (
              groupedHistory.map((group) => (
                <section className="history-group" key={group.label}>
                  <h3>{group.label}</h3>
                  {group.entries.map((item) => (
                    <button className="history-row" key={item.id} onClick={() => openHistoryEntry(item.id)}>
                      <span className={`method-badge compact-method method-${item.method.toLowerCase()}`}>
                        {methodLabel(item.method)}
                      </span>
                      <span className="history-url">{item.url}</span>
                    </button>
                  ))}
                </section>
              ))
            ) : (
              <div className="empty-sidebar-state">
                <p>No request history</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu ? (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onRename={handleContextRename}
          onDelete={handleContextDelete}
          onAddFolder={handleContextAddFolder}
          onAddRequest={handleContextAddRequest}
        />
      ) : null}

      {/* New item dialog */}
      {showNewDialog ? (
        <NewItemDialog
          onClose={() => setShowNewDialog(false)}
          onCreateFolder={(name) => createFolder(null, name)}
          onCreateRequest={(name) => createRequestInCollection(null, name)}
        />
      ) : null}

      {comingSoonTitle ? <ComingSoonDialog title={comingSoonTitle} onClose={() => setComingSoonTitle(null)} /> : null}
    </aside>
  );
}
