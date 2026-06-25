"use client";

import { useWorkspaceStore } from "@/lib/workspace-store";
import type { ResponseView } from "@/lib/types";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

const responseViews: ResponseView[] = ["pretty", "raw", "headers"];

function responseViewLabel(view: ResponseView): string {
  return view === "pretty" ? "Body" : view === "raw" ? "Raw" : "Headers";
}

function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function ResponsePanel() {
  const { theme } = useTheme();
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
              {responseViewLabel(view)}
            </button>
          ))}
          <button className="tab-passive" type="button">
            Test Results
          </button>
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
          <div className="empty-response postman-empty-response">
            <span className="empty-response-icon">-</span>
            <strong>Response not stored</strong>
            <p>
              <a href="#">Save response setting</a> must have been off when this request was sent.
            </p>
          </div>
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
          hasError || responseView === "raw" ? (
            <pre className={hasError ? "request-error" : ""}>{visibleBody}</pre>
          ) : (
            <Editor
              height="100%"
              defaultLanguage="json"
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              value={visibleBody}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 }
              }}
            />
          )
        )}
      </div>
    </section>
  );
}
