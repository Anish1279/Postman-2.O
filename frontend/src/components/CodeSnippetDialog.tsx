"use client";

import { X, Copy, Check } from "lucide-react";
import { useState, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { generateCurl, generateFetch } from "@/lib/snippets";
import type { RequestDraftSnapshot } from "@/lib/types";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { resolveSnapshot, buildVariableMap } from "@/lib/variable-resolver";

interface CodeSnippetDialogProps {
  onClose: () => void;
}

export function CodeSnippetDialog({ onClose }: CodeSnippetDialogProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<"curl" | "fetch">("curl");
  
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);
  const activeRequest = useWorkspaceStore((state) => state.openTabs.find((tab) => tab.id === activeTabId));
  const activeEnvironmentId = useWorkspaceStore((state) => state.activeEnvironmentId);
  const environments = useWorkspaceStore((state) => state.environments);
  
  const snapshot = useMemo(() => {
    if (!activeRequest) return null;
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const vars = buildVariableMap(env?.variables || []);
    return resolveSnapshot(activeRequest, vars);
  }, [activeRequest, environments, activeEnvironmentId]);

  const code = useMemo(() => {
    if (!snapshot) return "";
    return lang === "curl" ? generateCurl(snapshot) : generateFetch(snapshot);
  }, [snapshot, lang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="new-item-dialog" style={{ width: "600px", maxWidth: "90vw" }}>
        <div className="dialog-header">
          <h3>Code Snippets</h3>
          <button className="icon-button compact" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "400px" }}>
          <div className="segmented-control" style={{ width: "fit-content" }}>
            <button className={lang === "curl" ? "active" : ""} onClick={() => setLang("curl")}>cURL</button>
            <button className={lang === "fetch" ? "active" : ""} onClick={() => setLang("fetch")}>Fetch</button>
          </div>
          
          <div style={{ flex: 1, border: "1px solid var(--border-color)", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
            <button 
              className="icon-button" 
              onClick={handleCopy}
              style={{ position: "absolute", top: "8px", right: "16px", zIndex: 10, background: "var(--surface)", border: "1px solid var(--line)" }}
              title="Copy to clipboard"
            >
              {copied ? <Check size={14} className="status-ok" /> : <Copy size={14} />}
            </button>
            
            <Editor
              height="100%"
              defaultLanguage={lang === "curl" ? "shell" : "javascript"}
              language={lang === "curl" ? "shell" : "javascript"}
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              value={code}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 }
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
