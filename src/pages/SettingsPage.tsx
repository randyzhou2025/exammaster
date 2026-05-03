import { useRef, useState } from "react";
import type { ChangeEventHandler } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { downloadJson, parseBackupJson } from "@/lib/backup";

export function SettingsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const resetAll = useAppStore((s) => s.resetAll);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  /** 原生 confirm 在部分手机浏览器/WebView 不弹出，易被误以为「点了没反应」 */
  const [clearSuccessMessage, setClearSuccessMessage] = useState<string | null>(null);

  const handleExport = () => {
    const json = exportBackup();
    downloadJson(`exam-master-backup-${Date.now()}.json`, json);
  };

  const handleImport: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const parsed = parseBackupJson(raw);
      if (!parsed) {
        window.alert("无法解析备份文件。");
        return;
      }
      if (
        !window.confirm("导入将覆盖当前题库快照、进度、模考记录与设置。是否继续？")
      ) {
        return;
      }
      importBackup(parsed);
      window.alert("备份已恢复。");
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="mb-6 flex items-center gap-2">
        <Link to="/" className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">设置</h1>
      </header>

      <div className="space-y-4">
        <section className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-neutral-900">账号</h2>
          {user ? (
            <p className="mt-2 text-sm text-neutral-600">
              已登录：{user.email}
              {user.role === "admin" ? " · 管理员" : ""}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-800"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            退出登录
          </button>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-neutral-900">数据备份与恢复</h2>
          <p className="mt-2 text-xs leading-relaxed text-neutral-500">
            将进度、错题记录、收藏时间、模考历史及错题本偏好导出为 JSON；可在更换浏览器或设备时用同一文件恢复。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              导出备份
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800"
            >
              从文件导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-sm font-semibold text-neutral-900">存储说明</h2>
          <p className="mt-2 text-sm text-neutral-700">
            做题进度、错题与收藏保存在本机浏览器 localStorage；更换设备可用上方备份文件迁移。
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            背题模式不写入最新作答状态与错题本；多选题须选项集合与标准答案完全一致才得分。
          </p>
          {clearSuccessMessage ? (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-relaxed text-emerald-900">
              {clearSuccessMessage}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700"
            onClick={() => {
              setClearSuccessMessage(null);
              setClearConfirmOpen(true);
            }}
          >
            清除全部数据
          </button>
        </section>
      </div>

      {clearConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:items-center"
          role="presentation"
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="clear-data-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="clear-data-title" className="text-base font-bold text-neutral-900">
              确认清除本地数据？
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              将删除本机做题进度、错题与收藏记录、模考历史及备考偏好，且不可恢复。已选做题库也会清除，之后需重新选择题库。
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-800"
                onClick={() => setClearConfirmOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white active:opacity-90"
                onClick={() => {
                  try {
                    try {
                      localStorage.removeItem("ai-trainer-exam-v2");
                      localStorage.removeItem("ai-trainer-exam-v1");
                    } catch {
                      /* ignore */
                    }
                    try {
                      useAppStore.persist.clearStorage();
                    } catch {
                      /* ignore */
                    }
                    resetAll();
                    setClearConfirmOpen(false);
                    setClearSuccessMessage("已清除成功。本地备考数据与题库选择均已重置。");
                  } catch {
                    setClearConfirmOpen(false);
                    window.alert("清除失败，请稍后重试或检查浏览器是否禁止写入本地存储。");
                  }
                }}
              >
                确认清除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
