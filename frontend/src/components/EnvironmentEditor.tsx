"use client";

import { Edit2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import type { Environment, KeyValuePair } from "@/lib/types";

// ---------------------------------------------------------------------------
// Variable row editor
// ---------------------------------------------------------------------------

function VariableRow({
  variable,
  onChange,
  onRemove,
}: {
  variable: KeyValuePair;
  onChange: (patch: Partial<KeyValuePair>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="env-var-row">
      <input
        type="checkbox"
        checked={variable.enabled}
        onChange={(e) => onChange({ enabled: e.target.checked })}
      />
      <input
        type="text"
        value={variable.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder="Variable name"
      />
      <input
        type="text"
        value={variable.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="Value"
      />
      <button className="icon-button compact" onClick={onRemove} title="Remove variable">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Environment editor panel
// ---------------------------------------------------------------------------

interface EnvironmentEditorProps {
  onClose: () => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function EnvironmentEditor({ onClose }: EnvironmentEditorProps) {
  const environments = useWorkspaceStore((state) => state.environments);
  const activeEnvironmentId = useWorkspaceStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useWorkspaceStore((state) => state.setActiveEnvironment);
  const createEnvironmentAction = useWorkspaceStore((state) => state.createEnvironment);
  const renameEnvironmentAction = useWorkspaceStore((state) => state.renameEnvironment);
  const deleteEnvironmentAction = useWorkspaceStore((state) => state.deleteEnvironment);
  const updateEnvironmentVariables = useWorkspaceStore((state) => state.updateEnvironmentVariables);

  // Which environment is being edited (defaults to active)
  const [editingId, setEditingId] = useState(activeEnvironmentId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [localVars, setLocalVars] = useState<KeyValuePair[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const editingEnv = environments.find((e) => e.id === editingId);

  // Sync local vars when switching environments
  useEffect(() => {
    if (editingEnv) {
      setLocalVars(editingEnv.variables.map((v) => ({ ...v })));
      setHasChanges(false);
    }
  }, [editingId, editingEnv?.variables.length]);

  const handleVarChange = useCallback((rowId: string, patch: Partial<KeyValuePair>) => {
    setLocalVars((prev) =>
      prev.map((v) => (v.id === rowId ? { ...v, ...patch } : v))
    );
    setHasChanges(true);
  }, []);

  const handleVarRemove = useCallback((rowId: string) => {
    setLocalVars((prev) => prev.filter((v) => v.id !== rowId));
    setHasChanges(true);
  }, []);

  const handleAddVar = useCallback(() => {
    setLocalVars((prev) => [
      ...prev,
      { id: makeId("var"), key: "", value: "", enabled: true },
    ]);
    setHasChanges(true);
  }, []);

  const handleSaveVars = useCallback(async () => {
    if (!editingEnv) return;
    await updateEnvironmentVariables(
      Number(editingEnv.id),
      localVars.filter((v) => v.key.trim())
    );
    setHasChanges(false);
  }, [editingEnv, localVars, updateEnvironmentVariables]);

  const handleCreate = useCallback(async () => {
    const name = prompt("Environment name:");
    if (name?.trim()) {
      await createEnvironmentAction(name.trim());
    }
  }, [createEnvironmentAction]);

  const handleStartRename = useCallback((env: Environment) => {
    setRenamingId(env.id);
    setRenameValue(env.name);
  }, []);

  const handleCommitRename = useCallback(async () => {
    if (renamingId && renameValue.trim()) {
      await renameEnvironmentAction(Number(renamingId), renameValue.trim());
    }
    setRenamingId(null);
  }, [renamingId, renameValue, renameEnvironmentAction]);

  const handleDelete = useCallback(async (envId: string) => {
    if (!confirm("Delete this environment and all its variables?")) return;
    await deleteEnvironmentAction(Number(envId));
    if (editingId === envId && environments.length > 1) {
      const nextEnv = environments.find((e) => e.id !== envId);
      if (nextEnv) setEditingId(nextEnv.id);
    }
  }, [editingId, environments, deleteEnvironmentAction]);

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="env-editor-dialog">
        <div className="dialog-header">
          <h3>Manage Environments</h3>
          <button className="icon-button compact" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="env-editor-body">
          {/* Environment list */}
          <div className="env-list-panel">
            <div className="env-list-header">
              <span>Environments</span>
              <button className="icon-button compact" onClick={handleCreate} title="New environment">
                <Plus size={14} />
              </button>
            </div>
            <div className="env-list">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={`env-list-item ${env.id === editingId ? "active" : ""}`}
                  onClick={() => setEditingId(env.id)}
                >
                  {renamingId === env.id ? (
                    <input
                      className="inline-rename-input"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={handleCommitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCommitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="env-list-name">{env.name}</span>
                      {env.id === activeEnvironmentId ? (
                        <span className="env-active-badge">Active</span>
                      ) : null}
                    </>
                  )}
                  <div className="env-list-actions">
                    <button
                      className="icon-button compact"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartRename(env);
                      }}
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="icon-button compact danger-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(env.id);
                      }}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {environments.length === 0 ? (
                <div className="empty-sidebar-state" style={{ padding: "16px" }}>
                  <p>No environments</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Variables editor */}
          <div className="env-vars-panel">
            {editingEnv ? (
              <>
                <div className="env-vars-header">
                  <h4>{editingEnv.name}</h4>
                  {editingEnv.id !== activeEnvironmentId ? (
                    <button
                      className="secondary-button compact"
                      onClick={() => setActiveEnvironment(editingEnv.id)}
                    >
                      Set Active
                    </button>
                  ) : null}
                </div>
                <div className="env-vars-table">
                  <div className="env-var-header">
                    <span></span>
                    <span>Variable</span>
                    <span>Value</span>
                    <span></span>
                  </div>
                  {localVars.map((v) => (
                    <VariableRow
                      key={v.id}
                      variable={v}
                      onChange={(patch) => handleVarChange(v.id, patch)}
                      onRemove={() => handleVarRemove(v.id)}
                    />
                  ))}
                  <button className="add-row-button" onClick={handleAddVar}>
                    <Plus size={14} />
                    Add Variable
                  </button>
                </div>
                <div className="env-vars-actions">
                  {hasChanges ? (
                    <button className="send-button" onClick={handleSaveVars}>
                      Save Variables
                    </button>
                  ) : (
                    <span className="env-saved-label">All changes saved</span>
                  )}
                </div>
              </>
            ) : (
              <div className="empty-sidebar-state">
                <p>Select an environment to edit its variables</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
