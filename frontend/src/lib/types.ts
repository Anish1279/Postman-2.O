export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type BodyMode = "none" | "raw" | "form-data" | "x-www-form-urlencoded";

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string };

export type SidebarMode = "collections" | "history";

export type BuilderTab = "params" | "authorization" | "headers" | "body" | "pre-request" | "tests";

export type ResponseView = "pretty" | "raw" | "headers";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ResponseError {
  type: string;
  message: string;
}

export interface ResponseSnapshot {
  ok: boolean;
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: KeyValuePair[];
  body: string;
  setCookies?: Cookie[];
  error?: ResponseError;
}

export interface Cookie {
  id: string; // Will be stringified ID from backend or a local UUID if new
  domain: string;
  name: string;
  value: string;
  path: string;
  secure: boolean;
  http_only: boolean;
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
  preRequestScript: string;
  testScript: string;
}

export interface RequestDraft extends RequestDraftSnapshot {
  id: string;
  /** The database collection node id that owns this saved request. */
  collectionNodeId?: number;
  response?: ResponseSnapshot;
  savedSnapshot: RequestDraftSnapshot | null;
  isSending: boolean;
  isDirty: boolean;
}

export interface CollectionNode {
  id: number;
  parentId?: number | null;
  name: string;
  type: "folder" | "request";
  /** Database request id (only for type === "request"). */
  requestId?: number;
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
  requestSnapshot: RequestDraftSnapshot;
  responseSnapshot: ResponseSnapshot;
}

export interface WorkspaceLayout {
  horizontal: number[];
  vertical: number[];
}
