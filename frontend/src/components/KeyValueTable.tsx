"use client";

import { Plus, Trash2 } from "lucide-react";
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
        <span />
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>
      {rows.map((row) => (
        <div className="kv-row" key={row.id}>
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(event) => onChange(row.id, { enabled: event.target.checked })}
            aria-label="Enabled"
          />
          <input value={row.key} onChange={(event) => onChange(row.id, { key: event.target.value })} placeholder={keyPlaceholder} />
          <input
            value={row.value}
            onChange={(event) => onChange(row.id, { value: event.target.value })}
            placeholder={valuePlaceholder}
          />
          <button className="icon-button compact" title="Delete row" onClick={() => onRemove(row.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button className="add-row-button" onClick={onAdd}>
        <Plus size={15} />
        Add row
      </button>
    </div>
  );
}

