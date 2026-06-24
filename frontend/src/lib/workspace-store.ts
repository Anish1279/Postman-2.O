"use client";

import { create } from "zustand";
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
  ResponseSnapshot,
  ResponseView,
  SidebarMode
} from "@/lib/types";
import {
  fetchBootstrap,
  fetchCollections,
  createFolder as apiCreateFolder,
  createRequest as apiCreateRequest,
  renameCollection as apiRenameCollection,
  updateSavedRequest as apiUpdateSavedRequest,
  deleteCollection as apiDeleteCollection
} from "@/lib/api";
import type { CollectionApiNode } from "@/lib/api";

type KeyValueKind = "queryParams" | "headers" | "formData" | "urlEncodedBody";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

interface WorkspaceState {
  // UI state
  activeSidebar: SidebarMode;
  activeTabId: string;
  activeEnvironmentId: string;
  builderTab: BuilderTab;
  responseView: ResponseView;

  // Data
  isBootstrapped: boolean;
  collections: CollectionNode[];
  environments: Environment[];
  history: HistoryEntry[];
  openTabs: RequestDraft[];

  // Actions – UI
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

  // Actions – Network
  bootstrap: () => Promise<void>;
  sendActiveRequest: () => Promise<void>;
  openRequest: (collectionNodeId: number) => void;

  // Actions – Collections CRUD
  saveActiveRequest: () => Promise<void>;
  createFolder: (parentId: number | null, name: string) => Promise<void>;
  createRequestInCollection: (parentId: number | null, name?: string) => Promise<void>;
  renameCollectionNode: (collectionNodeId: number, name: string) => Promise<void>;
  deleteCollectionNode: (collectionNodeId: number) => Promise<void>;
  refreshCollections: () => Promise<void>;
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

function makeRunnerPayload(tab: RequestDraft): RequestDraftSnapshot {
  return makeSnapshot(tab);
}

function makeClientErrorResponse(message: string, timeMs: number): ResponseSnapshot {
  return {
    ok: false,
    status: 0,
    statusText: "Request Error",
    timeMs,
    sizeBytes: 0,
    headers: [],
    body: "",
    error: {
      type: "client_error",
      message
    }
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

// ---------------------------------------------------------------------------
// Convert backend collection tree to our frontend CollectionNode[]
// ---------------------------------------------------------------------------

function toCollectionNodes(apiNodes: CollectionApiNode[]): CollectionNode[] {
  return apiNodes.map((node) => {
    const result: CollectionNode = {
      id: node.id,
      parentId: node.parentId,
      name: node.name,
      type: node.type,
    };
    if (node.type === "request" && node.request) {
      result.requestId = node.request.id;
    }
    if (node.children && node.children.length > 0) {
      result.children = toCollectionNodes(node.children);
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// Convert a backend request node to a RequestDraft for opening in a tab
// ---------------------------------------------------------------------------

function apiNodeToDraft(node: CollectionApiNode): RequestDraft {
  const req = node.request;
  const queryParams: KeyValuePair[] = (req?.queryParams ?? []).map((row, i) => ({
    id: row.id ?? makeId("qp"),
    key: row.key,
    value: row.value,
    enabled: row.enabled
  }));
  const headers: KeyValuePair[] = (req?.headers ?? []).map((row, i) => ({
    id: row.id ?? makeId("hdr"),
    key: row.key,
    value: row.value,
    enabled: row.enabled
  }));

  const body = req?.body ?? {};
  const rawBody = typeof body === "object" && "raw" in body ? String((body as Record<string, unknown>).raw) : "";

  const authData = req?.auth ?? { type: "none" };
  let auth: RequestDraft["auth"] = { type: "none" };
  if (authData.type === "bearer") {
    auth = { type: "bearer", token: String(authData.token ?? "") };
  } else if (authData.type === "basic") {
    auth = { type: "basic", username: String(authData.username ?? ""), password: String(authData.password ?? "") };
  }

  const draft: RequestDraft = {
    id: `tab-${node.id}`,
    collectionNodeId: node.id,
    name: node.name,
    method: (req?.method ?? "GET") as HttpMethod,
    url: req?.url ?? "",
    queryParams,
    headers,
    bodyMode: (req?.bodyMode ?? "none") as BodyMode,
    rawBody,
    formData: [],
    urlEncodedBody: [],
    auth,
    savedSnapshot: null,
    isSending: false,
    isDirty: false,
  };

  // Set savedSnapshot so the tab starts clean
  draft.savedSnapshot = makeSnapshot(draft);

  return draft;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeSidebar: "collections",
  activeTabId: "",
  activeEnvironmentId: "",
  builderTab: "params",
  responseView: "pretty",
  isBootstrapped: false,
  collections: [],
  environments: [],
  history: [],
  openTabs: [],

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
      isSending: false,
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

  // ------------------------------------------------------------------
  // Bootstrap — load everything from the backend on mount
  // ------------------------------------------------------------------

  bootstrap: async () => {
    try {
      const data = await fetchBootstrap();

      const collections = toCollectionNodes(data.collections);

      const environments: Environment[] = data.environments.map((env) => ({
        id: String(env.id),
        name: env.name,
        variables: env.variables.map((v) => ({
          id: String(v.id),
          key: v.key,
          value: v.value,
          enabled: v.enabled
        }))
      }));

      const history: HistoryEntry[] = data.history.map((h) => {
        const req = h.request as Record<string, unknown>;
        const res = h.response as Record<string, unknown>;
        return {
          id: String(h.id),
          name: String(req.name ?? "Untitled"),
          method: (req.method ?? "GET") as HttpMethod,
          url: String(req.url ?? ""),
          status: Number(res.status ?? 0),
          timeMs: Number(res.timeMs ?? 0),
          requestedAt: h.executedAt
        };
      });

      // Open first request in a tab if any exist
      const firstRequestNode = findFirstRequestNode(data.collections);
      const openTabs: RequestDraft[] = [];
      if (firstRequestNode) {
        openTabs.push(apiNodeToDraft(firstRequestNode));
      } else {
        const blankTab: RequestDraft = {
          id: makeId("tab"),
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
          isSending: false,
          isDirty: true
        };
        openTabs.push(blankTab);
      }

      set({
        isBootstrapped: true,
        collections,
        environments,
        history,
        openTabs,
        activeTabId: openTabs[0].id,
        activeEnvironmentId: environments.length > 0 ? environments[0].id : ""
      });
    } catch (error) {
      console.error("Bootstrap failed:", error);
      // Fallback to a blank tab so the UI is usable
      const blankTab: RequestDraft = {
        id: makeId("tab"),
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
        isSending: false,
        isDirty: true
      };
      set({
        isBootstrapped: true,
        openTabs: [blankTab],
        activeTabId: blankTab.id
      });
    }
  },

  // ------------------------------------------------------------------
  // Send the active request via the runner proxy
  // ------------------------------------------------------------------

  sendActiveRequest: async () => {
    const { activeTabId, openTabs } = get();
    const tab = openTabs.find((item) => item.id === activeTabId);
    if (!tab || tab.isSending) {
      return;
    }

    const startedAt = performance.now();

    set((state) => ({
      openTabs: updateActiveTab(state.openTabs, activeTabId, (item) => ({
        ...item,
        isSending: true
      }))
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/runner/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(makeRunnerPayload(tab))
      });

      let snapshot: ResponseSnapshot;
      if (response.ok) {
        snapshot = (await response.json()) as ResponseSnapshot;
      } else {
        snapshot = makeClientErrorResponse(
          `The backend runner returned HTTP ${response.status} ${response.statusText}.`,
          Math.round(performance.now() - startedAt)
        );
      }

      set((state) => ({
        openTabs: updateActiveTab(state.openTabs, activeTabId, (item) => ({
          ...item,
          response: snapshot,
          isSending: false
        })),
        responseView: "pretty"
      }));
    } catch {
      const snapshot = makeClientErrorResponse(
        `Could not reach the FastAPI runner at ${API_BASE_URL}. Start the backend and try again.`,
        Math.round(performance.now() - startedAt)
      );

      set((state) => ({
        openTabs: updateActiveTab(state.openTabs, activeTabId, (item) => ({
          ...item,
          response: snapshot,
          isSending: false
        })),
        responseView: "pretty"
      }));
    }
  },

  // ------------------------------------------------------------------
  // Open a saved request from the sidebar into a tab
  // ------------------------------------------------------------------

  openRequest: (collectionNodeId: number) => {
    // If already open, just focus it
    const existingTab = get().openTabs.find((tab) => tab.collectionNodeId === collectionNodeId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }

    // Find the node in our collection tree data by re-fetching from API
    // We search the in-memory tree first for a lightweight path
    const node = findNodeById(get().collections, collectionNodeId);
    if (!node || node.type !== "request") {
      return;
    }

    // We need the full request data — fetch the collections tree from memory
    // and use the collection API endpoint for a single node
    // For now, fetch the full tree and find the node
    fetchCollections().then((apiNodes) => {
      const apiNode = findApiNodeById(apiNodes, collectionNodeId);
      if (!apiNode || !apiNode.request) {
        return;
      }

      const draft = apiNodeToDraft(apiNode);
      set((state) => ({
        openTabs: [...state.openTabs, draft],
        activeTabId: draft.id
      }));
    }).catch(console.error);
  },

  // ------------------------------------------------------------------
  // Save active request to backend
  // ------------------------------------------------------------------

  saveActiveRequest: async () => {
    const { activeTabId, openTabs } = get();
    const tab = openTabs.find((t) => t.id === activeTabId);
    if (!tab) return;

    // If the tab doesn't have a collectionNodeId yet, create a new request at root
    if (!tab.collectionNodeId) {
      try {
        const bodyPayload: Record<string, unknown> = {};
        if (tab.bodyMode === "raw") {
          bodyPayload.raw = tab.rawBody;
        }

        const result = await apiCreateRequest({
          parent_id: null,
          name: tab.name,
          method: tab.method,
          url: tab.url,
        });

        // Now update the request details
        if (result.id) {
          const authPayload: Record<string, unknown> = { type: tab.auth.type };
          if (tab.auth.type === "bearer") authPayload.token = tab.auth.token;
          if (tab.auth.type === "basic") {
            authPayload.username = tab.auth.username;
            authPayload.password = tab.auth.password;
          }

          await apiUpdateSavedRequest(result.id, {
            name: tab.name,
            method: tab.method,
            url: tab.url,
            queryParams: tab.queryParams.map((r) => ({ id: r.id, key: r.key, value: r.value, enabled: r.enabled })),
            headers: tab.headers.map((r) => ({ id: r.id, key: r.key, value: r.value, enabled: r.enabled })),
            bodyMode: tab.bodyMode,
            body: tab.bodyMode === "raw" ? { raw: tab.rawBody } : {},
            auth: authPayload,
          });
        }

        // Update the tab with the new collectionNodeId and refresh collections
        set((state) => ({
          openTabs: updateActiveTab(state.openTabs, activeTabId, (t) => ({
            ...t,
            collectionNodeId: result.id,
            savedSnapshot: makeSnapshot(t),
            isDirty: false,
          }))
        }));
        await get().refreshCollections();
      } catch (error) {
        console.error("Failed to save new request:", error);
      }
      return;
    }

    // Update an existing saved request
    try {
      const authPayload: Record<string, unknown> = { type: tab.auth.type };
      if (tab.auth.type === "bearer") authPayload.token = tab.auth.token;
      if (tab.auth.type === "basic") {
        authPayload.username = tab.auth.username;
        authPayload.password = tab.auth.password;
      }

      await apiUpdateSavedRequest(tab.collectionNodeId, {
        name: tab.name,
        method: tab.method,
        url: tab.url,
        queryParams: tab.queryParams.map((r) => ({ id: r.id, key: r.key, value: r.value, enabled: r.enabled })),
        headers: tab.headers.map((r) => ({ id: r.id, key: r.key, value: r.value, enabled: r.enabled })),
        bodyMode: tab.bodyMode,
        body: tab.bodyMode === "raw" ? { raw: tab.rawBody } : {},
        auth: authPayload,
      });

      set((state) => ({
        openTabs: updateActiveTab(state.openTabs, activeTabId, (t) => ({
          ...t,
          savedSnapshot: makeSnapshot(t),
          isDirty: false,
        }))
      }));
      await get().refreshCollections();
    } catch (error) {
      console.error("Failed to update request:", error);
    }
  },

  // ------------------------------------------------------------------
  // Collection tree CRUD
  // ------------------------------------------------------------------

  createFolder: async (parentId, name) => {
    try {
      await apiCreateFolder({ parent_id: parentId, name });
      await get().refreshCollections();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  },

  createRequestInCollection: async (parentId, name) => {
    try {
      const result = await apiCreateRequest({ parent_id: parentId, name: name ?? "Untitled Request" });
      await get().refreshCollections();

      // Open the newly created request in a tab
      const draft = apiNodeToDraft(result);
      set((state) => ({
        openTabs: [...state.openTabs, draft],
        activeTabId: draft.id
      }));
    } catch (error) {
      console.error("Failed to create request:", error);
    }
  },

  renameCollectionNode: async (collectionNodeId, name) => {
    try {
      await apiRenameCollection(collectionNodeId, name);
      await get().refreshCollections();

      // Also update any open tab that references this node
      set((state) => ({
        openTabs: state.openTabs.map((tab) =>
          tab.collectionNodeId === collectionNodeId
            ? { ...tab, name, savedSnapshot: tab.savedSnapshot ? { ...tab.savedSnapshot, name } : null }
            : tab
        )
      }));
    } catch (error) {
      console.error("Failed to rename:", error);
    }
  },

  deleteCollectionNode: async (collectionNodeId) => {
    try {
      await apiDeleteCollection(collectionNodeId);
      await get().refreshCollections();

      // Close any tabs that reference deleted nodes
      const deletedIds = collectDescendantIds(get().collections, collectionNodeId);
      // The node is already deleted from the tree, so deletedIds may not include it
      // We always include the root node
      deletedIds.add(collectionNodeId);

      set((state) => {
        const nextTabs = state.openTabs.filter(
          (tab) => !tab.collectionNodeId || !deletedIds.has(tab.collectionNodeId)
        );
        if (nextTabs.length === 0) {
          const blankTab: RequestDraft = {
            id: makeId("tab"),
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
            isSending: false,
            isDirty: true
          };
          return {
            openTabs: [blankTab],
            activeTabId: blankTab.id
          };
        }
        const activeStillOpen = nextTabs.some((t) => t.id === state.activeTabId);
        return {
          openTabs: nextTabs,
          activeTabId: activeStillOpen ? state.activeTabId : nextTabs[0].id
        };
      });
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  },

  refreshCollections: async () => {
    try {
      const apiNodes = await fetchCollections();
      set({ collections: toCollectionNodes(apiNodes) });
    } catch (error) {
      console.error("Failed to refresh collections:", error);
    }
  },
}));

// ---------------------------------------------------------------------------
// Tree search helpers
// ---------------------------------------------------------------------------

function findFirstRequestNode(nodes: CollectionApiNode[]): CollectionApiNode | null {
  for (const node of nodes) {
    if (node.type === "request" && node.request) {
      return node;
    }
    if (node.children) {
      const found = findFirstRequestNode(node.children);
      if (found) return found;
    }
  }
  return null;
}

function findNodeById(nodes: CollectionNode[], id: number): CollectionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findApiNodeById(nodes: CollectionApiNode[], id: number): CollectionApiNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findApiNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function collectDescendantIds(nodes: CollectionNode[], rootId: number): Set<number> {
  const ids = new Set<number>();
  const collect = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      ids.add(node.id);
      if (node.children) collect(node.children);
    }
  };

  const root = findNodeById(nodes, rootId);
  if (root) {
    ids.add(root.id);
    if (root.children) collect(root.children);
  }
  return ids;
}

export const httpMethods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const bodyModes: BodyMode[] = ["none", "raw", "form-data", "x-www-form-urlencoded"];
