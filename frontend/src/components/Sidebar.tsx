"use client";

import { Clock3, FileText, Folder, History, MoreHorizontal, Plus, Search, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { CollectionNode } from "@/lib/types";

function CollectionTree({ nodes, depth = 0 }: { nodes: CollectionNode[]; depth?: number }) {
  const openRequest = useWorkspaceStore((state) => state.openRequest);

  return (
    <div className="collection-tree">
      {nodes.map((node) => {
        const isFolder = node.type === "folder";
        return (
          <div key={node.id}>
            <button
              className="tree-row"
              style={{ paddingLeft: `${12 + depth * 14}px` }}
              onClick={() => node.requestId && openRequest(node.requestId)}
            >
              {isFolder ? <Folder size={15} /> : <FileText size={15} />}
              <span>{node.name}</span>
              <MoreHorizontal size={14} className="row-more" />
            </button>
            {isFolder && node.children?.length ? <CollectionTree nodes={node.children} depth={depth + 1} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const [search, setSearch] = useState("");
  const activeSidebar = useWorkspaceStore((state) => state.activeSidebar);
  const setActiveSidebar = useWorkspaceStore((state) => state.setActiveSidebar);
  const collections = useWorkspaceStore((state) => state.collections);
  const history = useWorkspaceStore((state) => state.history);

  const filteredHistory = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) {
      return history;
    }
    return history.filter((item) => `${item.name} ${item.method} ${item.url}`.toLowerCase().includes(value));
  }, [history, search]);

  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={activeSidebar === "collections" ? "active" : ""}
          onClick={() => setActiveSidebar("collections")}
        >
          <Folder size={15} />
          Collections
        </button>
        <button className={activeSidebar === "history" ? "active" : ""} onClick={() => setActiveSidebar("history")}>
          <History size={15} />
          History
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={15} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
      </div>

      <div className="sidebar-heading">
        <span>{activeSidebar === "collections" ? "Collections" : "Recent"}</span>
        <button className="icon-button compact" title="New">
          <Plus size={15} />
        </button>
      </div>

      <div className="sidebar-content">
        {activeSidebar === "collections" ? (
          <CollectionTree nodes={collections} />
        ) : (
          <div className="history-list">
            {filteredHistory.map((item) => (
              <button className="history-row" key={item.id}>
                <div className="method-badge compact-method">{item.method}</div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.url}</span>
                </div>
                <small>{item.status}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button>
          <Clock3 size={15} />
          Monitors
        </button>
        <button>
          <Settings size={15} />
          Settings
        </button>
      </div>
    </aside>
  );
}

