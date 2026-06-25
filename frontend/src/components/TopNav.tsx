"use client";

import { ArrowLeft, ArrowRight, Bell, ChevronDown, Home, Moon, Search, Settings, Sun, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { ComingSoonDialog } from "@/components/ComingSoonDialog";
import { useTheme } from "next-themes";

export function TopNav() {
  const [comingSoonTitle, setComingSoonTitle] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="top-nav">
        <div className="top-nav-left">
          <button className="icon-button compact" title="Back" onClick={() => setComingSoonTitle("Back")}>
            <ArrowLeft size={16} />
          </button>
          <button className="icon-button compact" title="Forward" onClick={() => setComingSoonTitle("Forward")}>
            <ArrowRight size={16} />
          </button>
          <button className="icon-button compact" title="Home" onClick={() => setComingSoonTitle("Home")}>
            <Home size={17} />
          </button>
          <button className="icon-button compact" title="Workspace menu" onClick={() => setComingSoonTitle("Workspaces")}>
            <ChevronDown size={14} />
          </button>
          <button className="workspace-switcher" onClick={() => setComingSoonTitle("Workspace Switcher")}>
            <Users size={17} />
            <span>Anish Singh&apos;s Workspace</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <label className="global-search">
          <Search size={17} />
          <input placeholder="Search" />
        </label>

        <div className="top-actions">
          <button className="sync-avatar" title="Sync status" onClick={() => setComingSoonTitle("Sync")}>
            <span />
          </button>
          <button className="outline-action" onClick={() => setComingSoonTitle("Invite")}>
            Invite
          </button>
          <button className="upgrade-action" onClick={() => setComingSoonTitle("Upgrade")}>
            Upgrade
          </button>
          <button className="icon-button compact" title="Notifications" onClick={() => setComingSoonTitle("Notifications")}>
            <Bell size={17} />
          </button>
          <button className="icon-button compact" title="Settings" onClick={() => setComingSoonTitle("Global Settings")}>
            <Settings size={17} />
          </button>
          {mounted && (
            <button
              className="icon-button compact"
              title="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}
          <button className="profile-avatar" title="Profile" onClick={() => setComingSoonTitle("Profile")}>
            AS
          </button>
        </div>
      </header>
      {comingSoonTitle ? <ComingSoonDialog title={comingSoonTitle} onClose={() => setComingSoonTitle(null)} /> : null}
    </>
  );
}
