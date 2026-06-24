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
  RequestDraftSnapshot,
  ResponseView,
  SidebarMode
} from "@/lib/types";

type KeyValueKind = "queryParams" | "headers" | "formData" | "urlEncodedBody";

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
  markActiveRequestSaved: () => void;
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

function cloneRows(rows: KeyValuePair[]): KeyValuePair[] {
  return rows.map((row) => ({ ...row }));
}

function cloneSnapshot(snapshot: RequestDraftSnapshot): RequestDraftSnapshot {
  return {
    ...snapshot,
    queryParams: cloneRows(snapshot.queryParams),
    headers: cloneRows(snapshot.headers),
    formData: cloneRows(snapshot.formData),
    urlEncodedBody: cloneRows(snapshot.urlEncodedBody),
    auth: { ...snapshot.auth }
  };
}

function makeSnapshot(tab: RequestDraft): RequestDraftSnapshot {
  return {
    name: tab.name,
    method: tab.method,
    url: tab.url,
    queryParams: cloneRows(tab.queryParams),
    headers: cloneRows(tab.headers),
    bodyMode: tab.bodyMode,
    rawBody: tab.rawBody,
    formData: cloneRows(tab.formData),
    urlEncodedBody: cloneRows(tab.urlEncodedBody),
    auth: { ...tab.auth }
  };
}

function comparableSnapshot(snapshot: RequestDraftSnapshot) {
  const comparableRows = (rows: KeyValuePair[]) =>
    rows.map((row) => ({
      key: row.key,
      value: row.value,
      enabled: row.enabled
    }));

  return {
    ...snapshot,
    queryParams: comparableRows(snapshot.queryParams),
    headers: comparableRows(snapshot.headers),
    formData: comparableRows(snapshot.formData),
    urlEncodedBody: comparableRows(snapshot.urlEncodedBody)
  };
}

function getDirtyState(tab: RequestDraft): boolean {
  if (!tab.savedSnapshot) {
    return true;
  }

  return JSON.stringify(comparableSnapshot(makeSnapshot(tab))) !== JSON.stringify(comparableSnapshot(tab.savedSnapshot));
}

function withDirtyState(tab: RequestDraft): RequestDraft {
  return {
    ...tab,
    isDirty: getDirtyState(tab)
  };
}

function cloneDraft(tab: RequestDraft): RequestDraft {
  return {
    ...tab,
    queryParams: cloneRows(tab.queryParams),
    headers: cloneRows(tab.headers),
    formData: cloneRows(tab.formData),
    urlEncodedBody: cloneRows(tab.urlEncodedBody),
    auth: { ...tab.auth },
    response: tab.response
      ? {
          ...tab.response,
          headers: cloneRows(tab.response.headers)
        }
      : undefined,
    savedSnapshot: tab.savedSnapshot ? cloneSnapshot(tab.savedSnapshot) : null
  };
}

function splitUrl(url: string): { baseUrl: string; search: string; hash: string } {
  const hashStart = url.indexOf("#");
  const beforeHash = hashStart >= 0 ? url.slice(0, hashStart) : url;
  const hash = hashStart >= 0 ? url.slice(hashStart) : "";
  const queryStart = beforeHash.indexOf("?");

  if (queryStart < 0) {
    return { baseUrl: beforeHash, search: "", hash };
  }

  return {
    baseUrl: beforeHash.slice(0, queryStart),
    search: beforeHash.slice(queryStart + 1),
    hash
  };
}

function parseQueryParamsFromUrl(url: string, previousRows: KeyValuePair[] = []): KeyValuePair[] {
  const { search } = splitUrl(url);

  if (!search) {
    return [];
  }

  return Array.from(new URLSearchParams(search).entries()).map(([key, value], index) => ({
    id: previousRows[index]?.id ?? makeId("query"),
    key,
    value,
    enabled: true
  }));
}

function buildUrlWithQueryParams(url: string, rows: KeyValuePair[]): string {
  const { baseUrl, hash } = splitUrl(url);
  const params = new URLSearchParams();

  rows.forEach((row) => {
    if (row.enabled && row.key) {
      params.append(row.key, row.value);
    }
  });

  const query = params.toString();
  return `${baseUrl}${query ? `?${query}` : ""}${hash}`;
}

function applyRequestPatch(tab: RequestDraft, patch: Partial<RequestDraft>): RequestDraft {
  const nextTab: RequestDraft = {
    ...tab,
    ...patch
  };

  if (patch.url !== undefined) {
    nextTab.queryParams = parseQueryParamsFromUrl(patch.url, tab.queryParams);
  }

  if (patch.queryParams !== undefined && patch.url === undefined) {
    nextTab.url = buildUrlWithQueryParams(tab.url, patch.queryParams);
  }

  return withDirtyState(nextTab);
}

function applyRowsPatch(tab: RequestDraft, kind: KeyValueKind, rows: KeyValuePair[]): RequestDraft {
  const nextTab = {
    ...tab,
    [kind]: rows
  };

  if (kind === "queryParams") {
    nextTab.url = buildUrlWithQueryParams(tab.url, rows);
  }

  return withDirtyState(nextTab);
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
  openTabs: sampleTabs.map(cloneDraft),

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
      formData: [],
      urlEncodedBody: [],
      auth: { type: "none" },
      savedSnapshot: null,
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
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => applyRequestPatch(tab, patch))
    }));
  },

  updateActiveAuth: (auth) => {
    get().updateActiveRequest({ auth });
  },

  updateKeyValue: (kind, rowId, patch) => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) =>
        applyRowsPatch(
          tab,
          kind,
          tab[kind].map((row) => (row.id === rowId ? { ...row, ...patch } : row))
        )
      )
    }));
  },

  addKeyValue: (kind) => {
    const { activeTabId } = get();
    const row: KeyValuePair = { id: makeId(kind), key: "", value: "", enabled: true };
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => applyRowsPatch(tab, kind, [...tab[kind], row]))
    }));
  },

  removeKeyValue: (kind, rowId) => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) =>
        applyRowsPatch(
          tab,
          kind,
          tab[kind].filter((row) => row.id !== rowId)
        )
      )
    }));
  },

  markActiveRequestSaved: () => {
    const { activeTabId } = get();
    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (tab) => ({
        ...tab,
        savedSnapshot: makeSnapshot(tab),
        isDirty: false
      }))
    }));
  },

  openRequest: (requestId) => {
    const existingTab = get().openTabs.find((tab) => tab.id === requestId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    const sampleRequest = sampleTabs.find((tab) => tab.id === requestId);
    if (!sampleRequest) {
      return;
    }

    set((state) => ({
      openTabs: [...state.openTabs, cloneDraft(sampleRequest)],
      activeTabId: requestId
    }));
  }
}));

export const httpMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const bodyModes: BodyMode[] = ["none", "raw", "form-data", "x-www-form-urlencoded"];
