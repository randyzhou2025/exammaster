/** 从代理头或 socket 解析客户端 IP */
export function normalizeClientIp(raw: string | undefined): string {
  if (!raw) return "unknown";
  const ip = raw.split(",")[0]?.trim() ?? "unknown";
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

export function clientIpFromRequest(headers: Record<string, unknown>, socketIp?: string): string {
  const forwarded = headers["x-forwarded-for"];
  const raw =
    typeof forwarded === "string"
      ? forwarded
      : Array.isArray(forwarded)
        ? String(forwarded[0] ?? "")
        : socketIp;
  return normalizeClientIp(raw);
}
