"use client";

import { AlertTriangle, Save, Send } from "lucide-react";
import { useMemo } from "react";
import { KeyValueTable } from "@/components/KeyValueTable";
import { bodyModes, httpMethods, useWorkspaceStore } from "@/lib/workspace-store";
import { collectMissingVariables } from "@/lib/variable-resolver";
import type { AuthConfig, BodyMode, BuilderTab, HttpMethod, RequestDraftSnapshot } from "@/lib/types";

const builderTabs: BuilderTab[] = ["params", "authorization", "headers", "body"];
const bodyModeLabels: Record<BodyMode, string> = {
  none: "none",
  raw: "raw",
  "form-data": "form-data",
  "x-www-form-urlencoded": "x-www-form-urlencoded"
};

function formatTabLabel(tab: BuilderTab): string {
  return tab === "params" ? "Params" : tab === "authorization" ? "Authorization" : tab === "headers" ? "Headers" : "Body";
}

export function RequestBuilder() {
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const activeRequest = useWorkspaceStore((state) => state.openTabs.find((tab) => tab.id === state.activeTabId));
  const builderTab = useWorkspaceStore((state) => state.builderTab);
  const setBuilderTab = useWorkspaceStore((state) => state.setBuilderTab);
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
      <div className="request-bar">
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
        <button className="secondary-button" title="Save request to collection" onClick={saveActiveRequest}>
          <Save size={16} />
          Save
        </button>
        <button className="send-button" title="Send request" onClick={sendActiveRequest} disabled={activeRequest.isSending}>
          <Send size={16} />
          {activeRequest.isSending ? "Sending" : "Send"}
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
        {builderTabs.map((tab) => (
          <button key={tab} className={builderTab === tab ? "active" : ""} onClick={() => setBuilderTab(tab)}>
            {formatTabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="builder-panel">
        {builderTab === "params" ? (
          <KeyValueTable
            rows={activeRequest.queryParams}
            onChange={(rowId, patch) => updateKeyValue("queryParams", rowId, patch)}
            onAdd={() => addKeyValue("queryParams")}
            onRemove={(rowId) => removeKeyValue("queryParams", rowId)}
            keyPlaceholder="Query key"
            valuePlaceholder="Query value"
          />
        ) : null}

        {builderTab === "headers" ? (
          <KeyValueTable
            rows={activeRequest.headers}
            onChange={(rowId, patch) => updateKeyValue("headers", rowId, patch)}
            onAdd={() => addKeyValue("headers")}
            onRemove={(rowId) => removeKeyValue("headers", rowId)}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
          />
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
              <textarea
                value={activeRequest.rawBody}
                onChange={(event) => updateActiveRequest({ rawBody: event.target.value })}
                placeholder="{ }"
              />
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
      </div>
    </section>
  );
}
