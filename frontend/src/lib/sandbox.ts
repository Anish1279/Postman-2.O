import type { VariableMap } from "./variable-resolver";

export interface SandboxContext {
  pm: {
    environment: {
      get: (key: string) => string | undefined;
      set: (key: string, value: string) => void;
      unset: (key: string) => void;
    };
    variables: {
      get: (key: string) => string | undefined;
      set: (key: string, value: string) => void;
    };
    response?: any;
  };
}

export function runScript(script: string, vars: VariableMap, response?: any): { updatedVars: VariableMap } {
  const updatedVars = { ...vars };

  const pm = {
    environment: {
      get: (key: string) => updatedVars[key],
      set: (key: string, value: string) => {
        updatedVars[key] = String(value);
      },
      unset: (key: string) => {
        delete updatedVars[key];
      }
    },
    variables: {
      get: (key: string) => updatedVars[key],
      set: (key: string, value: string) => {
        updatedVars[key] = String(value);
      }
    },
    response
  };

  try {
    // new Function takes argument names followed by the function body
    const executor = new Function("pm", script);
    executor(pm);
  } catch (error) {
    console.error("Script execution error:", error);
  }

  return { updatedVars };
}
