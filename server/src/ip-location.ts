const locationCache = new Map<string, string>();

export function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const seg = Number(ip.split(".")[1] ?? "0");
    if (seg >= 16 && seg <= 31) return true;
  }
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true;
  return false;
}

/** 根据 IP 解析中文地址（country / region / city） */
export async function resolveLocationByIp(ip: string): Promise<string> {
  const cached = locationCache.get(ip);
  if (cached) return cached;

  if (isPrivateIp(ip)) {
    locationCache.set(ip, "内网IP");
    return "内网IP";
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,country,regionName,city`,
      { signal: controller.signal }
    );
    if (!res.ok) {
      locationCache.set(ip, "未知");
      return "未知";
    }
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status !== "success") {
      locationCache.set(ip, "未知");
      return "未知";
    }
    const parts = [data.country, data.regionName, data.city].filter(Boolean);
    const location = parts.length > 0 ? parts.join(" / ") : "未知";
    locationCache.set(ip, location);
    return location;
  } catch {
    locationCache.set(ip, "未知");
    return "未知";
  } finally {
    clearTimeout(timer);
  }
}

/** 批量解析 IP 地址，同一 IP 只请求一次 */
export async function resolveLocationsByIps(ips: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ips.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (ip) => [ip, await resolveLocationByIp(ip)] as const)
  );
  return new Map(entries);
}
