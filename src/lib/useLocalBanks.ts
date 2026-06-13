/** 开发默认走本地 JSON；生产构建设 VITE_USE_LOCAL_BANKS=false 走 API */
export function useLocalBanks(): boolean {
  const flag = import.meta.env.VITE_USE_LOCAL_BANKS;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return import.meta.env.DEV;
}
