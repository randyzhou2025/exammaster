/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 留空则使用相对路径 /api（开发环境走 Vite proxy） */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
