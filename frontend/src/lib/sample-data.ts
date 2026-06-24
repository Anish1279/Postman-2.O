import type { CollectionNode, Environment, HistoryEntry, RequestDraft, RequestDraftSnapshot } from "@/lib/types";

type SeedRequest = Omit<RequestDraft, "savedSnapshot" | "isDirty">;

function cloneRows(rows: RequestDraftSnapshot["headers"]): RequestDraftSnapshot["headers"] {
  return rows.map((row) => ({ ...row }));
}

function makeSavedSnapshot(request: SeedRequest): RequestDraftSnapshot {
  return {
    name: request.name,
    method: request.method,
    url: request.url,
    queryParams: cloneRows(request.queryParams),
    headers: cloneRows(request.headers),
    bodyMode: request.bodyMode,
    rawBody: request.rawBody,
    formData: cloneRows(request.formData),
    urlEncodedBody: cloneRows(request.urlEncodedBody),
    auth: { ...request.auth }
  };
}

function savedRequest(request: SeedRequest): RequestDraft {
  return {
    ...request,
    savedSnapshot: makeSavedSnapshot(request),
    isDirty: false
  };
}

export const sampleCollections: CollectionNode[] = [
  {
    id: "collection-jsonplaceholder",
    name: "JSONPlaceholder",
    type: "folder",
    children: [
      {
        id: "collection-list-posts",
        name: "List posts",
        type: "request",
        requestId: "tab-list-posts"
      },
      {
        id: "collection-create-post",
        name: "Create post",
        type: "request",
        requestId: "tab-create-post"
      }
    ]
  },
  {
    id: "collection-httpbin",
    name: "httpbin",
    type: "folder",
    children: [
      {
        id: "collection-echo-headers",
        name: "Echo headers",
        type: "request",
        requestId: "tab-echo-headers"
      }
    ]
  }
];

export const sampleEnvironments: Environment[] = [
  {
    id: "env-public",
    name: "Public APIs",
    variables: [
      { id: "var-base-url", key: "baseUrl", value: "https://jsonplaceholder.typicode.com", enabled: true },
      { id: "var-token", key: "token", value: "demo-token", enabled: true }
    ]
  },
  {
    id: "env-local",
    name: "Local Dev",
    variables: [{ id: "var-local-base-url", key: "baseUrl", value: "http://127.0.0.1:8000", enabled: true }]
  }
];

export const sampleTabs: RequestDraft[] = [
  savedRequest({
    id: "tab-list-posts",
    collectionId: "collection-list-posts",
    name: "List posts",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts",
    queryParams: [{ id: "param-limit", key: "_limit", value: "5", enabled: true }],
    headers: [{ id: "header-accept", key: "Accept", value: "application/json", enabled: true }],
    bodyMode: "none",
    rawBody: "",
    formData: [],
    urlEncodedBody: [],
    auth: { type: "none" },
    response: {
      status: 200,
      statusText: "OK",
      timeMs: 182,
      sizeBytes: 1427,
      headers: [
        { id: "res-content-type", key: "content-type", value: "application/json; charset=utf-8", enabled: true },
        { id: "res-cache", key: "cache-control", value: "max-age=43200", enabled: true }
      ],
      body: JSON.stringify(
        [
          { userId: 1, id: 1, title: "sunt aut facere repellat provident occaecati excepturi optio reprehenderit" },
          { userId: 1, id: 2, title: "qui est esse" }
        ],
        null,
        2
      )
    }
  }),
  savedRequest({
    id: "tab-create-post",
    collectionId: "collection-create-post",
    name: "Create post",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    queryParams: [],
    headers: [{ id: "header-content-type", key: "Content-Type", value: "application/json", enabled: true }],
    bodyMode: "raw",
    rawBody: '{\n  "title": "Scaler assignment",\n  "body": "Postman clone",\n  "userId": 1\n}',
    formData: [],
    urlEncodedBody: [],
    auth: { type: "none" },
    response: undefined
  }),
  savedRequest({
    id: "tab-echo-headers",
    collectionId: "collection-echo-headers",
    name: "Echo headers",
    method: "GET",
    url: "https://httpbin.org/headers",
    queryParams: [],
    headers: [{ id: "header-demo", key: "X-Demo-Client", value: "postman-clone", enabled: true }],
    bodyMode: "none",
    rawBody: "",
    formData: [],
    urlEncodedBody: [],
    auth: { type: "bearer", token: "{{token}}" },
    response: undefined
  })
];

export const sampleHistory: HistoryEntry[] = [
  {
    id: "history-list-posts",
    name: "List posts",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts?_limit=5",
    status: 200,
    timeMs: 182,
    requestedAt: "Today, 10:12 PM"
  },
  {
    id: "history-echo-headers",
    name: "Echo headers",
    method: "GET",
    url: "https://httpbin.org/headers",
    status: 200,
    timeMs: 244,
    requestedAt: "Today, 9:44 PM"
  }
];
