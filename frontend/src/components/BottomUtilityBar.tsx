"use client";

import { Columns3, GitBranch, PanelBottom, PanelLeft, PanelRight, Settings2, SquareTerminal } from "lucide-react";

export function BottomUtilityBar() {
  return (
    <footer className="bottom-utility-bar">
      <div className="bottom-utility-left">
        <button>
          <GitBranch size={14} />
          Connect Git
        </button>
        <button>
          <SquareTerminal size={14} />
          Console
        </button>
        <button>
          <SquareTerminal size={14} />
          Terminal
        </button>
      </div>
      <div className="bottom-utility-right">
        <button>Globals</button>
        <button>Vault</button>
        <button>Tools</button>
        <button title="Preferences">
          <Settings2 size={14} />
        </button>
        <button title="Left sidebar">
          <PanelLeft size={14} />
        </button>
        <button title="Bottom panel">
          <PanelBottom size={14} />
        </button>
        <button title="Right sidebar">
          <PanelRight size={14} />
        </button>
        <button title="Layout">
          <Columns3 size={14} />
        </button>
      </div>
    </footer>
  );
}
