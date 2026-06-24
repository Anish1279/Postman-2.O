"use client";

import { Bell, ChevronDown, Cloud, Settings, Users } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function TopNav() {
  const environments = useWorkspaceStore((state) => state.environments);
  const activeEnvironmentId = useWorkspaceStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useWorkspaceStore((state) => state.setActiveEnvironment);

  return (
    <header className="top-nav">
      <div className="brand-lockup">
        <div className="brand-mark">P</div>
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Personal Workspace</h1>
        </div>
      </div>

      <div className="top-actions">
        <button className="icon-button" title="Sync">
          <Cloud size={17} />
        </button>
        <button className="icon-button" title="Team">
          <Users size={17} />
        </button>
        <label className="environment-select">
          <span>Environment</span>
          <select value={activeEnvironmentId} onChange={(event) => setActiveEnvironment(event.target.value)}>
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <button className="icon-button" title="Notifications">
          <Bell size={17} />
        </button>
        <button className="icon-button" title="Settings">
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}

