export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type BodyMode = "none" | "raw" | "form-data" | "x-www-form-urlencoded";

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string };

export type SidebarMode = "collections" | "history";

export type BuilderTab = "params" | "authorization" | "headers" | "body";

export type ResponseView = "pretty" | "raw" | "headers";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ResponseSnapshot {
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: KeyValuePair[];
  body: string;
}

export interface RequestDraftSnapshot {
  name: string;
  method: HttpMethod;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  bodyMode: BodyMode;
  rawBody: string;
  formData: KeyValuePair[];
  urlEncodedBody: KeyValuePair[];
  auth: AuthConfig;
}

export interface RequestDraft extends RequestDraftSnapshot {
  id: string;
  collectionId?: string;
  response?: ResponseSnapshot;
  savedSnapshot: RequestDraftSnapshot | null;
  isDirty: boolean;
}

export interface CollectionNode {
  id: string;
  name: string;
  type: "folder" | "request";
  requestId?: string;
  children?: CollectionNode[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValuePair[];
}

export interface HistoryEntry {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  status: number;
  timeMs: number;
  requestedAt: string;
}

export interface WorkspaceLayout {
  horizontal: number[];
  vertical: number[];
}
