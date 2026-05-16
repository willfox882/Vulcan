// Minimal type declarations for Pyodide (loaded from CDN — not an npm package)
declare module "pyodide" {
  export interface PyodideInterface {
    loadPackage(packages: string[]): Promise<void>;
    runPythonAsync(code: string): Promise<unknown>;
    globals: {
      set(key: string, value: unknown): void;
      get(key: string): unknown;
    };
  }
}

declare function loadPyodide(config: { indexURL: string }): Promise<import("pyodide").PyodideInterface>;
