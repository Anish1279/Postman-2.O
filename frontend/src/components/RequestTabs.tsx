"use client";

import { ChevronDown, ListFilter, Plus, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { EnvironmentEditor } from "@/components/EnvironmentEditor";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function RequestTabs() {
  const openTabs = useWorkspaceStore((state) => state.openTabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const setActiveTab = useWorkspaceStore((state) => state.setActiveTab);
  const closeTab = useWorkspaceStore((state) => state.closeTab);
  const createBlankTab = useWorkspaceStore((state) => state.createBlankTab);
  const environments = useWorkspaceStore((state) => state.environments);
  const activeEnvironmentId = useWorkspaceStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useWorkspaceStore((state) => state.setActiveEnvironment);
  const [showEnvEditor, setShowEnvEditor] = useState(false);

  return (
    <>
      <div className="request-tabs">
        <div className="tabs-scroll">
          {openTabs.map((tab) => (
            <button
              key={tab.id}
              className={`request-tab ${tab.id === activeTabId ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className={`method-badge method-${tab.method.toLowerCase()}`}>{tab.method}</span>
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
          <Plus size={17} />
        </button>
        <button className="new-tab-menu-button" title="New tab menu">
          <ChevronDown size={14} />
        </button>
        <div className="tabs-actions">
          <label className="environment-select">
            <select value={activeEnvironmentId} onChange={(event) => setActiveEnvironment(event.target.value)}>
              {environments.length === 0 ? <option value="">No environment</option> : null}
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <button className="icon-button compact" title="Manage environments" onClick={() => setShowEnvEditor(true)}>
            <SlidersHorizontal size={15} />
          </button>
          <button className="icon-button compact" title="Workspace filters">
            <ListFilter size={15} />
          </button>
        </div>
      </div>
      {showEnvEditor ? <EnvironmentEditor onClose={() => setShowEnvEditor(false)} /> : null}
    </>
  );
}
