"use client";

import { Bell, ChevronDown, Cloud, Settings, Sliders, Users } from "lucide-react";
import { useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { EnvironmentEditor } from "@/components/EnvironmentEditor";
import { ComingSoonDialog } from "@/components/ComingSoonDialog";

export function TopNav() {
  const environments = useWorkspaceStore((state) => state.environments);
  const activeEnvironmentId = useWorkspaceStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useWorkspaceStore((state) => state.setActiveEnvironment);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);

  return (
    <>
      <header className="top-nav">
        <div className="brand-lockup">
          <div className="brand-mark">P</div>
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>Personal Workspace</h1>
          </div>
        </div>

        <div className="top-actions">
          <button className="icon-button" title="Sync" onClick={() => setComingSoonTitle("Cloud Sync")}>
            <Cloud size={17} />
          </button>
          <button className="icon-button" title="Team" onClick={() => setComingSoonTitle("Team Collaboration")}>
            <Users size={17} />
          </button>
          <label className="environment-select">
            <span>Environment</span>
            <select value={activeEnvironmentId} onChange={(event) => setActiveEnvironment(event.target.value)}>
              {environments.length === 0 ? (
                <option value="">No environments</option>
              ) : null}
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} />
          </label>
          <button
            className="icon-button"
            title="Manage environments"
            onClick={() => setShowEnvEditor(true)}
          >
            <Sliders size={17} />
          </button>
          <button className="icon-button" title="Notifications" onClick={() => setComingSoonTitle("Notifications")}>
            <Bell size={17} />
          </button>
          <button className="icon-button" title="Settings" onClick={() => setComingSoonTitle("Global Settings")}>
            <Settings size={17} />
          </button>
        </div>
      </header>
      {showEnvEditor ? <EnvironmentEditor onClose={() => setShowEnvEditor(false)} /> : null}
      {comingSoonTitle ? <ComingSoonDialog title={comingSoonTitle} onClose={() => setComingSoonTitle(null)} /> : null}
    </>
  );
}
