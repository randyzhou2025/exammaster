/** 刷题服务调整通知（首页横幅 + 详情页共用） */
export const SERVICE_NOTICE = {
  id: "2025-07-pricing",
  publishedAt: "2025-05-26",
  title: "刷题服务调整通知",
  bannerTitle: "服务调整通知",
  bannerSummary:
    "平台原先免费开放刷题；6月30日前老用户仍可免费使用，7月起将收取一定费用。",
  contactEmail: "103620995@qq.com",
  contactXiaohongshu: "小红书私信联系",
  priceLabel: "19.8 元",
  priceNote: "可无限制使用本软件直至通过考试",
  freeUntilLabel: "2025 年 6 月 30 日",
  paidFromLabel: "2025 年 7 月 1 日",
} as const;

export const SERVICE_NOTICE_SECTIONS: ReadonlyArray<{ heading: string; body: string[] }> = [
  {
    heading: "各位同学好",
    body: [
      "本刷题软件自上线以来，一直为大家免费提供理论练习、模拟考试与实操刷题。",
      "最近使用人数增长较快，服务器与带宽压力持续上升。为保障系统稳定，经综合考虑，对服务方式做如下调整。",
    ],
  },
  {
    heading: `${SERVICE_NOTICE.freeUntilLabel}前（含）`,
    body: [
      "已在使用的用户仍可免费使用刷题功能，请大家安心备考，顺利完成 6 月底的考试。",
    ],
  },
  {
    heading: `${SERVICE_NOTICE.paidFromLabel}起`,
    body: [
      `平台将收取 ${SERVICE_NOTICE.priceLabel} 的服务维护费，${SERVICE_NOTICE.priceNote}。`,
      "费用用于服务器、带宽与日常运维等持续成本，题库内容与功能会持续维护更新。",
    ],
  },
  {
    heading: "7 月及之后如何继续使用",
    body: [
      `如需 ${SERVICE_NOTICE.paidFromLabel} 之后继续刷题，请通过以下方式联系我开通：`,
      `· ${SERVICE_NOTICE.contactXiaohongshu}`,
      `· 邮件：${SERVICE_NOTICE.contactEmail}`,
    ],
  },
  {
    heading: "说明",
    body: [
      "做题进度、错题与收藏仍保存在本机浏览器，请勿清除本站缓存或站点数据。",
      "感谢一直以来的理解与支持，祝考试顺利！",
    ],
  },
];
