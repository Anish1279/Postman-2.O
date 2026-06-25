/**
 * API helper functions for communicating with the FastAPI backend.
 *
 * Every function returns the parsed JSON directly.  Errors are thrown so
 * callers (the Zustand store) can catch and surface them in the UI.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Generic fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export interface BootstrapData {
  workspace: { id: number; name: string };
  collections: CollectionApiNode[];
  environments: EnvironmentApiNode[];
  history: HistoryApiNode[];
}

export interface CollectionApiNode {
  id: number;
  parentId: number | null;
  name: string;
  type: "folder" | "request";
  path: string;
  children: CollectionApiNode[];
  request?: RequestApiData;
}

export interface RequestApiData {
  id: number;
  method: string;
  url: string;
  queryParams: { id?: string; key: string; value: string; enabled: boolean }[];
  headers: { id?: string; key: string; value: string; enabled: boolean }[];
  bodyMode: string;
  body: Record<string, unknown>;
  auth: Record<string, unknown>;
}

export interface EnvironmentApiNode {
  id: number;
  name: string;
  isActive: boolean;
  variables: { id: number; key: string; value: string; enabled: boolean }[];
}

export interface HistoryApiNode {
  id: number;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  executedAt: string;
}

export function fetchBootstrap(): Promise<BootstrapData> {
  return apiFetch<BootstrapData>("/api/bootstrap");
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export function fetchCollections(workspaceId = 1): Promise<CollectionApiNode[]> {
  return apiFetch<CollectionApiNode[]>(`/api/collections?workspace_id=${workspaceId}`);
}

export function createFolder(payload: {
  workspace_id?: number;
  parent_id?: number | null;
  name: string;
}): Promise<CollectionApiNode> {
  return apiFetch<CollectionApiNode>("/api/collections/folder", {
    method: "POST",
    body: JSON.stringify({ workspace_id: 1, ...payload }),
  });
}

export function createRequest(payload: {
  workspace_id?: number;
  parent_id?: number | null;
  name?: string;
  method?: string;
  url?: string;
}): Promise<CollectionApiNode> {
  return apiFetch<CollectionApiNode>("/api/collections/request", {
    method: "POST",
    body: JSON.stringify({ workspace_id: 1, ...payload }),
  });
}

export function renameCollection(collectionId: number, name: string): Promise<{ status: string; name: string }> {
  return apiFetch<{ status: string; name: string }>(`/api/collections/${collectionId}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function updateSavedRequest(
  collectionId: number,
  payload: {
    name?: string;
    method?: string;
    url?: string;
    queryParams?: unknown[];
    headers?: unknown[];
    bodyMode?: string;
    body?: Record<string, unknown>;
    auth?: Record<string, unknown>;
  }
): Promise<{ status: string; request: RequestApiData }> {
  return apiFetch<{ status: string; request: RequestApiData }>(`/api/collections/${collectionId}/request`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteCollection(collectionId: number): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/collections/${collectionId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Environments
// ---------------------------------------------------------------------------

export function fetchEnvironments(workspaceId = 1): Promise<EnvironmentApiNode[]> {
  return apiFetch<EnvironmentApiNode[]>(`/api/environments?workspace_id=${workspaceId}`);
}

export function createEnvironment(payload: {
  workspace_id?: number;
  name: string;
  is_active?: boolean;
}): Promise<EnvironmentApiNode> {
  return apiFetch<EnvironmentApiNode>("/api/environments", {
    method: "POST",
    body: JSON.stringify({ workspace_id: 1, ...payload }),
  });
}

export function renameEnvironment(envId: number, name: string): Promise<{ status: string; name: string }> {
  return apiFetch<{ status: string; name: string }>(`/api/environments/${envId}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function activateEnvironment(envId: number, workspaceId = 1): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/environments/${envId}/activate`, {
    method: "PUT",
    body: JSON.stringify({ workspace_id: workspaceId }),
  });
}

export function deleteEnvironment(envId: number): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/environments/${envId}`, {
    method: "DELETE",
  });
}

export function bulkUpdateVariables(
  envId: number,
  variables: { key: string; value: string; is_enabled: boolean }[]
): Promise<EnvironmentApiNode> {
  return apiFetch<EnvironmentApiNode>(`/api/environments/${envId}/variables`, {
    method: "PUT",
    body: JSON.stringify({ variables }),
  });
}

export function deleteVariable(envId: number, varId: number): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/api/environments/${envId}/variables/${varId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export function createHistoryEntry(payload: {
  workspace_id?: number;
  request_snapshot: Record<string, unknown>;
  response_metadata: Record<string, unknown>;
}): Promise<HistoryApiNode> {
  return apiFetch<HistoryApiNode>("/api/history", {
    method: "POST",
    body: JSON.stringify({ workspace_id: 1, ...payload }),
  });
}

