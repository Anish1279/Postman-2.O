"use client";

import { AlertTriangle, ChevronDown, Code2, FileText, Link2, Save, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { KeyValueTable } from "@/components/KeyValueTable";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { bodyModes, httpMethods, useWorkspaceStore } from "@/lib/workspace-store";
import { collectMissingVariables } from "@/lib/variable-resolver";
import type { AuthConfig, BodyMode, BuilderTab, HttpMethod, RequestDraftSnapshot } from "@/lib/types";
import { CodeSnippetDialog } from "@/components/CodeSnippetDialog";
import { CookieManagerDialog } from "@/components/workspace/CookieManagerDialog";

const builderTabs: BuilderTab[] = ["params", "authorization", "headers", "body", "pre-request", "tests"];
const bodyModeLabels: Record<BodyMode, string> = {
  none: "none",
  raw: "raw",
  "form-data": "form-data",
  "x-www-form-urlencoded": "x-www-form-urlencoded"
};

function formatTabLabel(tab: BuilderTab): string {
  return tab === "params" ? "Params" : tab === "authorization" ? "Authorization" : tab === "headers" ? "Headers" : tab === "body" ? "Body" : tab === "pre-request" ? "Scripts" : "Tests";
}

export function RequestBuilder() {
  const { theme } = useTheme();
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const activeRequest = useWorkspaceStore((state) => state.openTabs.find((tab) => tab.id === state.activeTabId));
  const builderTab = useWorkspaceStore((state) => state.builderTab);
  const setBuilderTab = useWorkspaceStore((state) => state.setBuilderTab);
  const [showCode, setShowCode] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const updateActiveRequest = useWorkspaceStore((state) => state.updateActiveRequest);
  const updateActiveAuth = useWorkspaceStore((state) => state.updateActiveAuth);
  const updateKeyValue = useWorkspaceStore((state) => state.updateKeyValue);
  const addKeyValue = useWorkspaceStore((state) => state.addKeyValue);
  const removeKeyValue = useWorkspaceStore((state) => state.removeKeyValue);
  const saveActiveRequest = useWorkspaceStore((state) => state.saveActiveRequest);
  const sendActiveRequest = useWorkspaceStore((state) => state.sendActiveRequest);
  const getActiveVariableMap = useWorkspaceStore((state) => state.getActiveVariableMap);

  const missingVars = useMemo(() => {
    if (!activeRequest) return [];
    const vars = getActiveVariableMap();
    return collectMissingVariables(activeRequest, vars);
  }, [activeRequest, getActiveVariableMap]);

  if (!activeRequest) {
    return null;
  }

  const authType = activeRequest.auth.type;
  const basicAuth = activeRequest.auth.type === "basic" ? activeRequest.auth : { username: "", password: "" };

  return (
    <section className="request-builder" key={activeTabId}>
      <div className="request-titlebar">
        <div className="request-title">
          <span className="request-protocol">HTTP</span>
          <strong>{activeRequest.name || activeRequest.url || "Untitled Request"}</strong>
        </div>
        <div className="request-title-actions">
          <button className="text-icon-button" title="Save request to collection" onClick={saveActiveRequest}>
            <Save size={16} />
            Save
          </button>
          <button className="icon-button compact" title="Save menu">
            <ChevronDown size={14} />
          </button>
          <button className="share-button">Share</button>
          <button className="icon-button compact" title="Copy link">
            <Link2 size={16} />
          </button>
        </div>
      </div>

      <div className="request-bar">
        <div className="method-url-control">
          <select
            className={`method-select method-${activeRequest.method.toLowerCase()}`}
            value={activeRequest.method}
            onChange={(event) => updateActiveRequest({ method: event.target.value as HttpMethod })}
          >
            {httpMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <input
            className="url-input"
            value={activeRequest.url}
            onChange={(event) => updateActiveRequest({ url: event.target.value })}
            placeholder="Enter request URL"
          />
        </div>
        <button className="send-button primary-send" title="Send request" onClick={sendActiveRequest} disabled={activeRequest.isSending}>
          <Send size={16} />
          {activeRequest.isSending ? "Sending" : "Send"}
        </button>
        <button className="send-menu-button" title="Send options" disabled={activeRequest.isSending}>
          <ChevronDown size={15} />
        </button>
      </div>

      {missingVars.length > 0 ? (
        <div className="missing-vars-banner">
          <AlertTriangle size={14} />
          <span>
            Unresolved variables: {missingVars.map((v) => <code key={v}>{`{{${v}}}`}</code>)}
          </span>
        </div>
      ) : null}

      <div className="builder-tabs">
        <button className="tab-passive" type="button">
          <FileText size={16} />
          Docs
        </button>
        {builderTabs.map((tab) => (
          <button key={tab} className={builderTab === tab ? "active" : ""} onClick={() => setBuilderTab(tab)}>
            {formatTabLabel(tab)}
            {tab === "headers" ? <span className="tab-count">{activeRequest.headers.length}</span> : null}
            {tab === "body" && activeRequest.bodyMode !== "none" ? <span className="green-dot" /> : null}
          </button>
        ))}
        <button className="tab-passive" type="button">
          Settings
        </button>
        <button className="builder-cookies" type="button" onClick={() => setShowCookies(true)}>
          Cookies
        </button>
        <button className="icon-button compact code-snippet-button" title="Code Snippets" onClick={() => setShowCode(true)}>
          <Code2 size={15} />
        </button>
      </div>

      <div className="builder-panel">
        {builderTab === "params" ? (
          <>
            <h3 className="panel-subheading">Query Params</h3>
            <KeyValueTable
              rows={activeRequest.queryParams}
              onChange={(rowId, patch) => updateKeyValue("queryParams", rowId, patch)}
              onAdd={() => addKeyValue("queryParams")}
              onRemove={(rowId) => removeKeyValue("queryParams", rowId)}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </>
        ) : null}

        {builderTab === "headers" ? (
          <>
            <h3 className="panel-subheading">Headers</h3>
            <KeyValueTable
              rows={activeRequest.headers}
              onChange={(rowId, patch) => updateKeyValue("headers", rowId, patch)}
              onAdd={() => addKeyValue("headers")}
              onRemove={(rowId) => removeKeyValue("headers", rowId)}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </>
        ) : null}

        {builderTab === "authorization" ? (
          <div className="auth-editor">
            <label>
              <span>Type</span>
              <select
                value={authType}
                onChange={(event) => {
                  const nextType = event.target.value as AuthConfig["type"];
                  if (nextType === "bearer") {
                    updateActiveAuth({ type: "bearer", token: "" });
                  } else if (nextType === "basic") {
                    updateActiveAuth({ type: "basic", username: "", password: "" });
                  } else {
                    updateActiveAuth({ type: "none" });
                  }
                }}
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
              </select>
            </label>

            {activeRequest.auth.type === "bearer" ? (
              <label>
                <span>Token</span>
                <input
                  value={activeRequest.auth.token}
                  onChange={(event) => updateActiveAuth({ type: "bearer", token: event.target.value })}
                  placeholder="{{token}}"
                />
              </label>
            ) : null}

            {activeRequest.auth.type === "basic" ? (
              <div className="auth-grid">
                <label>
                  <span>Username</span>
                  <input
                    value={basicAuth.username}
                    onChange={(event) =>
                      updateActiveAuth({ type: "basic", username: event.target.value, password: basicAuth.password })
                    }
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={basicAuth.password}
                    onChange={(event) =>
                      updateActiveAuth({ type: "basic", username: basicAuth.username, password: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {builderTab === "body" ? (
          <div className="body-editor">
            <div className="segmented-control">
              {bodyModes.map((mode) => (
                <button
                  key={mode}
                  className={activeRequest.bodyMode === mode ? "active" : ""}
                  onClick={() => updateActiveRequest({ bodyMode: mode as BodyMode })}
                >
                  {bodyModeLabels[mode]}
                </button>
              ))}
            </div>

            {activeRequest.bodyMode === "none" ? <div className="empty-body-state">No body</div> : null}

            {activeRequest.bodyMode === "raw" ? (
              <div className="editor-frame">
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  theme={theme === "dark" ? "vs-dark" : "vs-light"}
                  value={activeRequest.rawBody}
                  onChange={(value) => updateActiveRequest({ rawBody: value ?? "" })}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 8, bottom: 8 }
                  }}
                />
              </div>
            ) : null}

            {activeRequest.bodyMode === "form-data" ? (
              <KeyValueTable
                rows={activeRequest.formData}
                onChange={(rowId, patch) => updateKeyValue("formData", rowId, patch)}
                onAdd={() => addKeyValue("formData")}
                onRemove={(rowId) => removeKeyValue("formData", rowId)}
                keyPlaceholder="Field"
                valuePlaceholder="Value"
              />
            ) : null}

            {activeRequest.bodyMode === "x-www-form-urlencoded" ? (
              <KeyValueTable
                rows={activeRequest.urlEncodedBody}
                onChange={(rowId, patch) => updateKeyValue("urlEncodedBody", rowId, patch)}
                onAdd={() => addKeyValue("urlEncodedBody")}
                onRemove={(rowId) => removeKeyValue("urlEncodedBody", rowId)}
                keyPlaceholder="Key"
                valuePlaceholder="Value"
              />
            ) : null}
          </div>
        ) : null}
        {builderTab === "pre-request" ? (
          <div className="editor-frame">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              value={activeRequest.preRequestScript}
              onChange={(value) => updateActiveRequest({ preRequestScript: value ?? "" })}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>
        ) : null}

        {builderTab === "tests" ? (
          <div className="editor-frame">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              value={activeRequest.testScript}
              onChange={(value) => updateActiveRequest({ testScript: value ?? "" })}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 }
              }}
            />
          </div>
        ) : null}
      </div>

      {showCode ? <CodeSnippetDialog onClose={() => setShowCode(false)} /> : null}
      <CookieManagerDialog open={showCookies} onOpenChange={setShowCookies} />
    </section>
  );
}
