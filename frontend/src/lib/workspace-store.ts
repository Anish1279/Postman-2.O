"use client";

import { create } from "zustand";
import { sampleCollections, sampleEnvironments, sampleHistory, sampleTabs } from "@/lib/sample-data";
import type {
  AuthConfig,
  BodyMode,
  BuilderTab,
  CollectionNode,
  Environment,
  HistoryEntry,
  HttpMethod,
  KeyValuePair,
  RequestDraft,
  ResponseView,
  SidebarMode
} from "@/lib/types";

type KeyValueKind = "queryParams" | "headers";

interface WorkspaceState {
  activeSidebar: SidebarMode;
  activeTabId: string;
  activeEnvironmentId: string;
  builderTab: BuilderTab;
  responseView: ResponseView;
  collections: CollectionNode[];
  environments: Environment[];
  history: HistoryEntry[];
  openTabs: RequestDraft[];
  setActiveSidebar: (mode: SidebarMode) => void;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  createBlankTab: () => void;
  setActiveEnvironment: (environmentId: string) => void;
  setBuilderTab: (tab: BuilderTab) => void;
  setResponseView: (view: ResponseView) => void;
  updateActiveRequest: (patch: Partial<RequestDraft>) => void;
  updateActiveAuth: (auth: AuthConfig) => void;
  updateKeyValue: (kind: KeyValueKind, rowId: string, patch: Partial<KeyValuePair>) => void;
  addKeyValue: (kind: KeyValueKind) => void;
  removeKeyValue: (kind: KeyValueKind, rowId: string) => void;
  openRequest: (requestId: string) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function updateActiveTab(
  tabs: RequestDraft[],
  activeTabId: string,
  updater: (tab: RequestDraft) => RequestDraft
): RequestDraft[] {
  return tabs.map((tab) => (tab.id === activeTabId ? updater(tab) : tab));
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeSidebar: "collections",
  activeTabId: sampleTabs[0].id,
  activeEnvironmentId: sampleEnvironments[0].id,
  builderTab: "params",
  responseView: "pretty",
  collections: sampleCollections,
  environments: sampleEnvironments,
  history: sampleHistory,
  openTabs: sampleTabs,

  setActiveSidebar: (mode) => set({ activeSidebar: mode }),
  setActiveTab: (tabId) => set({ activeTabId: tabId }),
  setActiveEnvironment: (environmentId) => set({ activeEnvironmentId: environmentId }),
  setBuilderTab: (tab) => set({ builderTab: tab }),
  setResponseView: (view) => set({ responseView: view }),

  closeTab: (tabId) => {
    const { openTabs, activeTabId } = get();
    if (openTabs.length === 1) {
      return;
    }

    const nextTabs = openTabs.filter((tab) => tab.id !== tabId);
    const nextActiveTabId = activeTabId === tabId ? nextTabs[0].id : activeTabId;
    set({ openTabs: nextTabs, activeTabId: nextActiveTabId });
  },

  createBlankTab: () => {
    const id = makeId("tab");
    const nextTab: RequestDraft = {
      id,
      name: "Untitled Request",
      method: "GET",
      url: "",
      queryParams: [],
      headers: [],
      bodyMode: "none",
      rawBody: "",
      auth: { type: "none" },
      isDirty: true
    };

    set((state) => ({
      openTabs: [...state.openTabs, nextTab],
      activeTabId: id
    }));
  },

  updateActiveRequest: (patch) => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => ({
        ...tab,
        ...patch,
        isDirty: true
      }))
    }));
  },

  updateActiveAuth: (auth) => {
    get().updateActiveRequest({ auth });
  },

  updateKeyValue: (kind, rowId, patch) => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => ({
        ...tab,
        [kind]: tab[kind].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
        isDirty: true
      }))
    }));
  },

  addKeyValue: (kind) => {
    const { activeTabId } = get();
    const row: KeyValuePair = { id: makeId(kind), key: "", value: "", enabled: true };
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => ({
        ...tab,
        [kind]: [...tab[kind], row],
        isDirty: true
      }))
    }));
  },

  removeKeyValue: (kind, rowId) => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => ({
        ...tab,
        [kind]: tab[kind].filter((row) => row.id !== rowId),
        isDirty: true
      }))
    }));
  },

  openRequest: (requestId) => {
    const existingTab = get().openTabs.find((tab) => tab.id === requestId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
    }
  }
}));

export const httpMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const bodyModes: BodyMode[] = ["none", "raw", "form-data", "x-www-form-urlencoded"];

