import type { RequestDraftSnapshot } from "./types";

export function generateCurl(snapshot: RequestDraftSnapshot): string {
  let cmd = `curl -X ${snapshot.method} "${snapshot.url}"`;
  
  for (const header of snapshot.headers) {
    if (header.enabled && header.key) {
      cmd += ` \\\n  -H "${header.key}: ${header.value}"`;
    }
  }

  if (snapshot.auth.type === "bearer" && snapshot.auth.token) {
    cmd += ` \\\n  -H "Authorization: Bearer ${snapshot.auth.token}"`;
  } else if (snapshot.auth.type === "basic" && snapshot.auth.username) {
    const b64 = btoa(`${snapshot.auth.username}:${snapshot.auth.password || ""}`);
    cmd += ` \\\n  -H "Authorization: Basic ${b64}"`;
  }

  if (snapshot.method !== "GET" && snapshot.method !== "HEAD") {
    if (snapshot.bodyMode === "raw" && snapshot.rawBody) {
      cmd += ` \\\n  -d '${snapshot.rawBody.replace(/'/g, "'\\''")}'`;
    } else if (snapshot.bodyMode === "form-data") {
      for (const field of snapshot.formData) {
        if (field.enabled && field.key) {
          cmd += ` \\\n  -F "${field.key}=${field.value}"`;
        }
      }
    } else if (snapshot.bodyMode === "x-www-form-urlencoded") {
      for (const field of snapshot.urlEncodedBody) {
        if (field.enabled && field.key) {
          cmd += ` \\\n  --data-urlencode "${field.key}=${field.value}"`;
        }
      }
    }
  }

  return cmd;
}

export function generateFetch(snapshot: RequestDraftSnapshot): string {
  const headers: Record<string, string> = {};
  for (const h of snapshot.headers) {
    if (h.enabled && h.key) {
      headers[h.key] = h.value;
    }
  }

  if (snapshot.auth.type === "bearer" && snapshot.auth.token) {
    headers["Authorization"] = `Bearer ${snapshot.auth.token}`;
  } else if (snapshot.auth.type === "basic" && snapshot.auth.username) {
    const b64 = btoa(`${snapshot.auth.username}:${snapshot.auth.password || ""}`);
    headers["Authorization"] = `Basic ${b64}`;
  }

  const options: any = {
    method: snapshot.method,
    headers,
  };

  if (snapshot.method !== "GET" && snapshot.method !== "HEAD") {
    if (snapshot.bodyMode === "raw" && snapshot.rawBody) {
      options.body = snapshot.rawBody;
    } else if (snapshot.bodyMode === "form-data") {
      options.body = "new FormData() /* ... */";
    } else if (snapshot.bodyMode === "x-www-form-urlencoded") {
      const params = new URLSearchParams();
      for (const f of snapshot.urlEncodedBody) {
        if (f.enabled && f.key) {
          params.append(f.key, f.value);
        }
      }
      options.body = params.toString();
    }
  }

  return `fetch("${snapshot.url}", ${JSON.stringify(options, null, 2)});`;
}
