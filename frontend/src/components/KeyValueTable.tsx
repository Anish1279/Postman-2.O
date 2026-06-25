"use client";

import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import type { KeyValuePair } from "@/lib/types";

interface KeyValueTableProps {
  rows: KeyValuePair[];
  onChange: (rowId: string, patch: Partial<KeyValuePair>) => void;
  onAdd: () => void;
  onRemove: (rowId: string) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueTable({
  rows,
  onChange,
  onAdd,
  onRemove,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value"
}: KeyValueTableProps) {
  return (
    <div className="kv-table">
      <div className="kv-header">
        <span>Key</span>
        <span>Value</span>
        <span>Description</span>
        <span className="kv-bulk-edit">
          Bulk Edit
          <MoreHorizontal size={15} />
        </span>
      </div>
      {rows.map((row) => (
        <div className="kv-row" key={row.id}>
          <div className="kv-cell kv-key-cell">
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(event) => onChange(row.id, { enabled: event.target.checked })}
              aria-label="Enabled"
            />
            <input value={row.key} onChange={(event) => onChange(row.id, { key: event.target.value })} placeholder={keyPlaceholder} />
          </div>
          <div className="kv-cell">
            <input
              value={row.value}
              onChange={(event) => onChange(row.id, { value: event.target.value })}
              placeholder={valuePlaceholder}
            />
          </div>
          <div className="kv-cell">
            <input value="" placeholder="Description" readOnly />
          </div>
          <div className="kv-actions-cell">
            <button className="icon-button compact" title="Delete row" onClick={() => onRemove(row.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button className="add-row-button" onClick={onAdd}>
        <Plus size={15} />
        Add row
      </button>
    </div>
  );
}
