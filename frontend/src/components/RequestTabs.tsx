"use client";

import { Plus, X } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function RequestTabs() {
  const openTabs = useWorkspaceStore((state) => state.openTabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const createBlankTab = useWorkspaceStore((state) => state.createBlankTab);

  return (
    <div className="request-tabs">
      <div className="tabs-scroll">
        {openTabs.map((tab) => (
          <button
            key={tab.id}
            className={`request-tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="method-badge">{tab.method}</span>
            <span className="tab-name">{tab.name}</span>
            {tab.isDirty ? <span className="dirty-dot" /> : null}
            <span
              className="tab-close"
              role="button"
              tabIndex={0}
              title="Close"
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  closeTab(tab.id);
                }
              }}
            >
              <X size={13} />
            </span>
          </button>
        ))}
      </div>
      <button className="new-tab-button" title="New request" onClick={createBlankTab}>
        <Plus size={16} />
      </button>
    </div>
  );
}

