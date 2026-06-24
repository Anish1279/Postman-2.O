"use client";

import { useEffect, useRef } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { RequestBuilder } from "@/components/RequestBuilder";
import { RequestTabs } from "@/components/RequestTabs";
import { ResponsePanel } from "@/components/ResponsePanel";
import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { WorkspaceLayout } from "@/lib/types";

interface WorkspaceShellProps {
  defaultLayout: WorkspaceLayout;
}

function persistLayout(layout: WorkspaceLayout) {
  document.cookie = `postman-clone-layout=${encodeURIComponent(JSON.stringify(layout))}; path=/; max-age=31536000; samesite=lax`;
}

export function WorkspaceShell({ defaultLayout }: WorkspaceShellProps) {
  const layoutRef = useRef<WorkspaceLayout>(defaultLayout);
  const bootstrap = useWorkspaceStore((state) => state.bootstrap);
  const isBootstrapped = useWorkspaceStore((state) => state.isBootstrapped);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const updateLayout = (patch: Partial<WorkspaceLayout>) => {
    layoutRef.current = { ...layoutRef.current, ...patch };
    persistLayout(layoutRef.current);
  };

  if (!isBootstrapped) {
    return (
      <main className="workspace-shell">
        <div className="bootstrap-loading">
          <div className="loading-spinner" />
          <p>Loading workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <TopNav />
      <PanelGroup
        direction="horizontal"
        className="workspace-panels"
        onLayout={(horizontal) => updateLayout({ horizontal })}
      >
        <Panel defaultSize={defaultLayout.horizontal[0]} minSize={17} maxSize={32} className="sidebar-panel">
          <Sidebar />
        </Panel>
        <PanelResizeHandle className="resize-handle resize-handle-vertical" />
        <Panel defaultSize={defaultLayout.horizontal[1]} minSize={55}>
          <section className="request-workspace">
            <RequestTabs />
            <PanelGroup
              direction="vertical"
              className="request-panels"
              onLayout={(vertical) => updateLayout({ vertical })}
            >
              <Panel defaultSize={defaultLayout.vertical[0]} minSize={36}>
                <RequestBuilder />
              </Panel>
              <PanelResizeHandle className="resize-handle resize-handle-horizontal" />
              <Panel defaultSize={defaultLayout.vertical[1]} minSize={26}>
                <ResponsePanel />
              </Panel>
            </PanelGroup>
          </section>
        </Panel>
      </PanelGroup>
    </main>
  );
}
