"use client";

import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ResponseView } from "@/lib/types";

const responseViews: ResponseView[] = ["pretty", "raw", "headers"];

function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function ResponsePanel() {
  const activeRequest = useWorkspaceStore((state) => state.openTabs.find((tab) => tab.id === state.activeTabId));
  const responseView = useWorkspaceStore((state) => state.responseView);
  const setResponseView = useWorkspaceStore((state) => state.setResponseView);
  const response = activeRequest?.response;
  const hasError = Boolean(response?.error);
  const responseTitle = response
    ? response.status > 0
      ? `${response.status} ${response.statusText}`
      : response.statusText
    : "";
  const visibleBody = response?.error
    ? `${response.error.type}\n${response.error.message}`
    : responseView === "pretty"
      ? prettyBody(response?.body ?? "")
      : response?.body;

  return (
    <section className="response-panel">
      <div className="response-toolbar">
        <div className="response-tabs">
          {responseViews.map((view) => (
            <button key={view} className={responseView === view ? "active" : ""} onClick={() => setResponseView(view)}>
              {view}
            </button>
          ))}
        </div>
        {response ? (
          <div className="response-meta">
            <span className={!hasError && response.status < 400 ? "status-ok" : "status-error"}>{responseTitle}</span>
            <span>{response.timeMs} ms</span>
            <span>{response.sizeBytes.toLocaleString()} B</span>
          </div>
        ) : null}
      </div>

      <div className="response-body">
        {!response ? (
          <div className="empty-response">No response</div>
        ) : responseView === "headers" ? (
          response.headers.length ? (
            <div className="headers-view">
              {response.headers.map((header) => (
                <div key={header.id}>
                  <strong>{header.key}</strong>
                  <span>{header.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-response">No headers</div>
          )
        ) : (
          <pre className={hasError ? "request-error" : ""}>{visibleBody}</pre>
        )}
      </div>
    </section>
  );
}
