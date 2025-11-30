const personas = [
  {
    name: "科技测评师 Alex",
    domain: ["科技", "3C"],
    style: "理性 + 专业评测口吻",
    usage: 128,
    lastUsed: "2 小时前",
    badge: "最近使用",
  },
  {
    name: "宝妈体验官 Mia",
    domain: ["母婴", "生活方式"],
    style: "温柔体贴 + 使用体验",
    usage: 96,
    lastUsed: "昨天",
    badge: "高频",
  },
  {
    name: "小众设计师 Leo",
    domain: ["设计", "家居"],
    style: "美学叙事 + 质感强调",
    usage: 64,
    lastUsed: "3 天前",
    badge: "热门",
  },
  {
    name: "职场达人 Jane",
    domain: ["职场", "商业"],
    style: "专业洞察 + 战略视角",
    usage: 72,
    lastUsed: "1 周前",
    badge: "模板",
  },
];

const posts = [
  {
    title: "小红书 | 护手霜秋冬保湿测评",
    persona: "宝妈体验官 Mia",
    platform: "XiaoHongShu",
    status: "待发布",
    created: "2024-12-01 09:30",
  },
  {
    title: "Instagram | Lifestyle 氛围感大片",
    persona: "小众设计师 Leo",
    platform: "Instagram",
    status: "草稿",
    created: "2024-11-29 16:10",
  },
  {
    title: "LinkedIn | AI SaaS 发布公告",
    persona: "职场达人 Jane",
    platform: "LinkedIn",
    status: "已发布",
    created: "2024-11-28 10:00",
  },
  {
    title: "Twitter | 智能耳机体验速评",
    persona: "科技测评师 Alex",
    platform: "Twitter/X",
    status: "已过期",
    created: "2024-11-25 08:40",
  },
];

const recommendations = [
  {
    title: "环保政策落地，绿色消费热度飙升",
    source: "36Kr",
    time: "08:00",
    score: "0.93",
    product: "智能空气净化器",
    persona: "科技测评师 Alex",
    platform: "LinkedIn / X",
  },
  {
    title: "双十二家居新品榜单出炉",
    source: "小红书热榜",
    time: "07:30",
    score: "0.87",
    product: "北欧极简落地灯",
    persona: "小众设计师 Leo",
    platform: "XiaoHongShu",
  },
  {
    title: "秋冬宝妈护肤关键词飙升",
    source: "微博热搜",
    time: "07:10",
    score: "0.81",
    product: "婴儿保湿面霜",
    persona: "宝妈体验官 Mia",
    platform: "Instagram / XHS",
  },
];

const statusColor: Record<string, string> = {
  草稿: "bg-muted text-foreground",
  待发布: "bg-amber-100 text-amber-800",
  已发布: "bg-emerald-100 text-emerald-800",
  已过期: "bg-rose-100 text-rose-800",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Personalize 2.0</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              后台主页：人设 · 素材 · 推荐 · 帖子
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              快速切换人设、查看生成记录，并根据热点获取推荐发布计划。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">
              新建人设
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              上传素材
            </button>
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              一键生成内容
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_2.4fr] xl:grid-rows-[auto_auto]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:row-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">人设列表</h2>
                <p className="text-sm text-slate-500">按最近使用排序，支持快捷编辑/复制</p>
              </div>
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                筛选/排序
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {personas.map((persona) => (
                <div
                  key={persona.name}
                  className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="absolute right-3 top-3 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {persona.badge}
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {persona.name.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{persona.name}</p>
                      <p className="text-xs text-slate-500">{persona.style}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {persona.domain.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>使用次数：{persona.usage}</span>
                    <span>最近：{persona.lastUsed}</span>
                  </div>
                  <div className="mt-3 hidden items-center justify-end gap-2 text-xs font-semibold text-slate-700 group-hover:flex">
                    <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">编辑</button>
                    <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">复制</button>
                    <button className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50">
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">帖子列表</h2>
                <p className="text-sm text-slate-500">支持预览、发布、编辑、批量操作</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <button className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50">搜索</button>
                <button className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50">批量操作</button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">预览标题</th>
                    <th className="px-4 py-3">人设</th>
                    <th className="px-4 py-3">发布平台</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">创建时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {posts.map((post) => (
                    <tr key={post.title} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{post.title}</td>
                      <td className="px-4 py-3 text-slate-600">{post.persona}</td>
                      <td className="px-4 py-3 text-slate-600">{post.platform}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor[post.status]}`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{post.created}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-slate-700">
                        <div className="flex items-center justify-end gap-2">
                          <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">预览</button>
                          <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">编辑</button>
                          <button className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50">发布</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:row-span-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">时事爬虫 · 推荐发布</h2>
                <p className="text-sm text-slate-500">结合行业热点与历史数据，自动生成 3-5 条推荐</p>
              </div>
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                配置爬虫源
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {recommendations.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-700">
                        {item.source}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span>{item.time}</span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      热点关联度 {item.score}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      推荐产品
                      <p className="text-sm font-semibold text-slate-900">{item.product}</p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      匹配人设
                      <p className="text-sm font-semibold text-slate-900">{item.persona}</p>
                    </div>
                    <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                      建议平台
                      <p className="text-sm font-semibold text-slate-900">{item.platform}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                    <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-white">查看详情</button>
                    <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-white">加入待发布</button>
                    <button className="rounded-md border border-slate-200 px-3 py-1 hover:bg-white">生成完整版</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
