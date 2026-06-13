import { apiFetch } from "@/lib/api";
import type { CodeFillBankResponse, TheoryBankResponse } from "@/types/contentAccess";

export async function fetchTheoryBankApi(bankId: string, token: string): Promise<TheoryBankResponse> {
  const res = await apiFetch(`/api/banks/${encodeURIComponent(bankId)}/theory`, {}, token);
  const data = (await res.json()) as TheoryBankResponse & { error?: string };
  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? "加载理论题库失败"), { status: res.status });
  }
  return data;
}

export async function fetchCodeFillBankApi(bankId: string, token: string): Promise<CodeFillBankResponse> {
  const res = await apiFetch(`/api/banks/${encodeURIComponent(bankId)}/code-fill`, {}, token);
  const data = (await res.json()) as CodeFillBankResponse & { error?: string };
  if (!res.ok) {
    throw Object.assign(new Error(data.error ?? "加载实操题库失败"), { status: res.status });
  }
  return data;
}
