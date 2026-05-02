import { useRef } from "react";
import type { ChangeEventHandler } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { downloadJson, parseBackupJson } from "@/lib/backup";

export function SettingsPage() {
  const resetAll = useAppStore((s) => s.resetAll);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const fileRef = useRef<HTMLInputElement>(null);

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
    <div className="min-h-full bg-surface p-4">
      <header className="mb-6 flex items-center gap-2">
        <Link to="/" className="text-brand">
          ← 返回
        </Link>
        <h1 className="text-lg font-bold text-neutral-900">设置</h1>
      </header>

      <div className="space-y-4">
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
            数据保存在本机浏览器 localStorage（持久化插件）。
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            背题模式不参与「首次答题」统计与错题本写入；多选题须选项集合与标准答案完全一致才得分。
          </p>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-700"
            onClick={() => {
              if (!window.confirm("清除全部本地进度与模考记录？不可恢复。")) return;
              try {
                localStorage.removeItem("ai-trainer-exam-v2");
                localStorage.removeItem("ai-trainer-exam-v1");
              } catch {
                /* ignore */
              }
              resetAll();
            }}
          >
            清除全部数据
          </button>
        </section>
      </div>
    </div>
  );
}
