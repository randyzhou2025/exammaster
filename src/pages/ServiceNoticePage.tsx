import { Link } from "react-router-dom";
import { SERVICE_NOTICE, SERVICE_NOTICE_SECTIONS } from "@/content/serviceNotice";
import { theoryHomeForBank } from "@/lib/routes";
import { useAppStore } from "@/stores/appStore";

export function ServiceNoticePage() {
  const bankId = useAppStore((s) => s.selectedQuestionBankId);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 border-b border-neutral-200/80 bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link to={theoryHomeForBank(bankId)} className="min-h-11 min-w-11 shrink-0 content-center text-brand">
            ← 返回
          </Link>
          <h1 className="min-w-0 flex-1 text-base font-bold leading-snug text-neutral-900">
            {SERVICE_NOTICE.title}
          </h1>
        </div>
      </header>

      <article className="min-w-0 flex-1 space-y-4 px-4 pt-4">
        <p className="text-xs text-neutral-500">发布日期：{SERVICE_NOTICE.publishedAt}</p>

        {SERVICE_NOTICE_SECTIONS.map((section) => (
          <section key={section.heading} className="rounded-2xl bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-neutral-900">{section.heading}</h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-700">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="break-words">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-brand/20 bg-brand-light/20 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">联系方式</h2>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-700">
            <li>{SERVICE_NOTICE.contactXiaohongshu}</li>
            <li>
              邮件：
              <a
                href={`mailto:${SERVICE_NOTICE.contactEmail}`}
                className="ml-1 font-medium text-brand underline-offset-2 active:underline"
              >
                {SERVICE_NOTICE.contactEmail}
              </a>
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
