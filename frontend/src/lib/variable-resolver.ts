/**
 * Variable resolution engine for Postman-style {{variable}} placeholders.
 *
 * Resolves `{{key}}` tokens using the active environment's variables.
 * Also provides detection of unresolved (missing) variables so the UI
 * can warn the user before sending.
 */

import type { AuthConfig, KeyValuePair, RequestDraftSnapshot } from "@/lib/types";

// Matches  {{variableName}}  — supports alphanumeric, underscore, hyphen, dot
const VARIABLE_PATTERN = /\{\{([a-zA-Z0-9_.:-]+)\}\}/g;

export interface VariableMap {
  [key: string]: string;
}

/**
 * Build a lookup map from an environment's enabled variables.
 */
export function buildVariableMap(variables: KeyValuePair[]): VariableMap {
  const map: VariableMap = {};
  for (const v of variables) {
    if (v.enabled && v.key) {
      map[v.key] = v.value;
    }
  }
  return map;
}

/**
 * Replace all `{{key}}` tokens in a string with values from the map.
 * Unresolved tokens are left as-is.
 */
export function resolveString(input: string, vars: VariableMap): string {
  return input.replace(VARIABLE_PATTERN, (match, key: string) => {
    return key in vars ? vars[key] : match;
  });
}

/**
 * Find all `{{key}}` tokens in a string that are NOT present in the map.
 */
export function findMissingVariables(input: string, vars: VariableMap): string[] {
  const missing: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = re.exec(input)) !== null) {
    if (!(match[1] in vars)) {
      if (!missing.includes(match[1])) {
        missing.push(match[1]);
      }
    }
  }
  return missing;
}

/**
 * Resolve all `{{key}}` tokens in a KeyValuePair array (keys and values).
 */
function resolveKeyValuePairs(pairs: KeyValuePair[], vars: VariableMap): KeyValuePair[] {
  return pairs.map((pair) => ({
    ...pair,
    key: resolveString(pair.key, vars),
    value: resolveString(pair.value, vars),
  }));
}

/**
 * Resolve auth config values.
 */
function resolveAuth(auth: AuthConfig, vars: VariableMap): AuthConfig {
  if (auth.type === "bearer") {
    return { type: "bearer", token: resolveString(auth.token, vars) };
  }
  if (auth.type === "basic") {
    return {
      type: "basic",
      username: resolveString(auth.username, vars),
      password: resolveString(auth.password, vars),
    };
  }
  return auth;
}

/**
 * Produce a fully-resolved copy of a request snapshot.
 * The original snapshot is NOT mutated.
 */
export function resolveSnapshot(
  snapshot: RequestDraftSnapshot,
  vars: VariableMap
): RequestDraftSnapshot {
  return {
    ...snapshot,
    url: resolveString(snapshot.url, vars),
    queryParams: resolveKeyValuePairs(snapshot.queryParams, vars),
    headers: resolveKeyValuePairs(snapshot.headers, vars),
    rawBody: resolveString(snapshot.rawBody, vars),
    formData: resolveKeyValuePairs(snapshot.formData, vars),
    urlEncodedBody: resolveKeyValuePairs(snapshot.urlEncodedBody, vars),
    auth: resolveAuth(snapshot.auth, vars),
  };
}

/**
 * Collect all missing variables across the entire request snapshot.
 * Returns a deduplicated list of variable names.
 */
export function collectMissingVariables(
  snapshot: RequestDraftSnapshot,
  vars: VariableMap
): string[] {
  const sources: string[] = [snapshot.url, snapshot.rawBody];

  // Collect from key-value pair arrays
  for (const pairs of [snapshot.queryParams, snapshot.headers, snapshot.formData, snapshot.urlEncodedBody]) {
    for (const pair of pairs) {
      sources.push(pair.key, pair.value);
    }
  }

  // Collect from auth
  if (snapshot.auth.type === "bearer") {
    sources.push(snapshot.auth.token);
  } else if (snapshot.auth.type === "basic") {
    sources.push(snapshot.auth.username, snapshot.auth.password);
  }

  const allMissing = new Set<string>();
  for (const source of sources) {
    for (const key of findMissingVariables(source, vars)) {
      allMissing.add(key);
    }
  }

  return Array.from(allMissing);
}
