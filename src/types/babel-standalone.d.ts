// babel-standalone.d.ts - Type definitions for @babel/standalone
declare module '@babel/standalone' {
  export interface TransformOptions {
    presets?: string[];
    filename?: string;
    plugins?: string[];
  }

  export interface TransformResult {
    code?: string;
    map?: any;
    ast?: any;
  }

  export function transform(code: string, options?: TransformOptions): TransformResult;
}