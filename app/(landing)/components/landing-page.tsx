"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  ArrowRight, PlayCircle, Sparkles, 
  HeartHandshake, BrainCircuit, Swords, Lightbulb, 
  ScanText, Users2, Share2, Check, 
  Twitter, Github, Mail, Menu, X, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// --- Data ---

const philosophies = [
  {
    icon: HeartHandshake,
    title: "一语见心，一念成篇",
    description: "Personalize 能听懂您的弦外之音，不放过每一次灵光乍现。我们让 AI 拥有了「共情」的能力，让生成的内容不再冰冷。",
    gradient: "from-amber-400 to-orange-500",
    span: "md:col-span-2",
    accent: "共情智能",
  },
  {
    icon: BrainCircuit,
    title: "属于 Agent 的记忆宫殿",
    description: "自研上下文引擎，无论是万字长文的深度创作，还是多线并行的复杂构思，它都能构建起思维脉络。",
    footer: "复杂任务从此永不迷失，每一步都恰如其分。",
    gradient: "from-rose-400 to-pink-500",
    span: "md:row-span-2",
    accent: "无限记忆",
    featured: true,
  },
  {
    icon: Swords,
    title: "并非花拳绣腿",
    description: "20+ 专家 Agent 协同工作，只为将你的想法以最完整、最优质的形态呈现。确保你每一次出手，都直抵杰作水准。",
    gradient: "from-orange-400 to-amber-500",
    span: "",
    accent: "专业能力",
  },
  {
    icon: Lightbulb,
    title: "我们相信 Know-how",
    description: "与 100+ 内容从业者一道，将爆款策略沉淀为 Personalize 的底层智慧。与你同行的，是百位行家的经验。",
    gradient: "from-yellow-400 to-orange-500",
    span: "",
    accent: "经验沉淀",
  },
];

const features = [
  {
    icon: ScanText,
    title: "素材智能解析",
    description: "支持 PDF、PPT、白底图。自动提取卖点与规格参数，构建专属产品知识库。",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    icon: Users2,
    title: "多维人设匹配",
    description: "美妆 KOL、科技测评师...基于人格维度调整语气与关注点，千人千面。",
    gradient: "from-rose-400 to-pink-500",
  },
  {
    icon: Share2,
    title: "全平台原生输出",
    description: "一键生成小红书图文、IG 贴文、LinkedIn 稿件，自动适配平台风格。",
    gradient: "from-violet-400 to-purple-500",
  },
];

const plans = [
  {
    name: "Free",
    description: "适合个人体验",
    price: "¥0",
    period: "/月",
    features: ["5次生成/月", "2个基础人设模板", "社区支持"],
    color: "zinc",
    buttonText: "免费开始",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "适合内容创作者",
    price: "¥79",
    period: "/月",
    features: [
      "100次生成/月",
      "5个自定义人设",
      "图片 AI 增强",
      "优先客服支持",
      "导出所有格式",
    ],
    color: "amber",
    buttonText: "立即订阅",
    highlighted: true,
    badge: "最受欢迎",
  },
  {
    name: "Business",
    description: "适合团队协作",
    price: "¥299",
    period: "/月",
    features: [
      "无限次生成",
      "无限自定义人设",
      "团队协作功能",
      "专属客服经理",
      "API 访问权限",
    ],
    color: "rose",
    buttonText: "联系销售",
    highlighted: false,
  },
];

// --- Components ---

const Nav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? "bg-white/70 backdrop-blur-xl border-b border-zinc-200/50 py-3" : "bg-transparent py-5"}`}>
      <div className="container mx-auto flex max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="bg-linear-to-r from-zinc-900 to-zinc-600 bg-clip-text text-transparent">
            Personalize
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
          {["理念", "功能", "定价"].map((item, i) => (
            <a key={item} href={`#${["philosophy", "features", "pricing"][i]}`} className="hover:text-amber-600 transition-colors relative group">
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-linear-to-r from-amber-500 to-rose-500 group-hover:w-full transition-all duration-300"></span>
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">登录</Link>
          <Link href="/register" className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg active:scale-95">
            免费试用
          </Link>
        </div>

        <button className="md:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-zinc-200 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {["理念", "功能", "定价"].map((item, i) => (
                <a key={item} href={`#${["philosophy", "features", "pricing"][i]}`} onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-zinc-600">{item}</a>
              ))}
              <div className="pt-4 border-t border-zinc-100 flex flex-col gap-4">
                <Link href="/login" className="text-lg font-medium text-zinc-600">登录</Link>
                <Link href="/register" className="flex h-12 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold">免费试用</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-rose-200/20 rounded-full blur-[100px] animate-pulse-slow delay-700"></div>
      </div>

      <div className="container mx-auto max-w-7xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/50 px-4 py-1.5 text-xs font-medium text-amber-700 mb-8"
        >
          <Sparkles className="w-4 h-4" />
          <span>全新升级 Personalize v2.0</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight mb-8 leading-[1.1]"
        >
          从产品文档到<br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-500 via-orange-500 to-rose-500">
            爆款社媒
          </span>
          <span className="inline-block">，</span>
          只需一念。
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-base md:text-lg text-zinc-600 mb-10 leading-relaxed"
        >
          上传资料，定义人设，剩下的交给 Personalize。<br className="hidden md:block" />
          让品牌拥有统一而多元的人格，让每一次创作都直抵人心。
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/register" className="group h-12 px-8 rounded-full bg-zinc-900 text-white font-bold flex items-center gap-2 text-base hover:bg-zinc-800 transition-all hover:shadow-2xl hover:-translate-y-1">
            开始创作 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="h-12 px-8 rounded-full border border-zinc-200 bg-white font-semibold flex items-center gap-2 text-base hover:bg-zinc-50 transition-all hover:shadow-xl hover:-translate-y-0.5">
            <PlayCircle className="w-5 h-5 text-amber-500" /> 观看演示
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-20 relative max-w-5xl mx-auto"
        >
          <div className="absolute -inset-1 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-4xl blur opacity-20"></div>
          <div className="relative bg-white border border-zinc-200 rounded-4xl overflow-hidden shadow-2xl">
            <div className="aspect-video bg-zinc-50 flex items-center justify-center overflow-hidden">
               <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-700"></div>
               <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent"></div>
               <div className="absolute bottom-10 left-10 right-10 flex flex-wrap justify-center gap-6">
                  {["PDF 解析", "20+ 专家 Agent", "一键生成", "多平台适配"].map((tag) => (
                    <div key={tag} className="px-3 py-1.5 bg-white/80 backdrop-blur-md border border-white/50 rounded-full text-xs font-semibold text-zinc-800 shadow-sm">
                      {tag}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Philosophy = () => {
  return (
    <section id="philosophy" className="py-24 md:py-32 bg-zinc-50/50">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            不仅是工具，更是<br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-500 to-rose-500">
              您的创作合伙人
            </span>
          </h2>
          <p className="text-xl text-zinc-500">
            我们不仅仅是在做内容，我们是在赋予 AI 灵魂。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {philosophies.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 ${item.span} ${item.featured ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200 hover:shadow-2xl hover:shadow-amber-500/10"}`}
            >
              <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${item.featured ? "bg-white/10" : "bg-linear-to-br " + item.gradient + " text-white"}`}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 ${item.featured ? "bg-white/10 text-zinc-300" : "bg-zinc-100 text-zinc-500"}`}>
                {item.accent}
              </span>
              <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
              <p className={`leading-relaxed ${item.featured ? "text-zinc-400" : "text-zinc-500"}`}>{item.description}</p>
              {item.footer && <div className="mt-8 pt-6 border-t border-white/10 text-sm text-zinc-500">{item.footer}</div>}
              
              <div className="mt-8 flex items-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                了解更多 <ArrowUpRight className="ml-1 w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">核心功能</h2>
          <p className="text-xl text-zinc-500">将繁琐的素材整理交给机器，将创造的灵魂留给自己。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <motion.div 
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group"
            >
              <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${f.gradient} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                <f.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-amber-600 transition-colors">{f.title}</h3>
              <p className="text-zinc-500 leading-relaxed mb-6">{f.description}</p>
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-400 group-hover:text-amber-600 transition-colors cursor-pointer">
                了解更多 <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-zinc-50/50 relative overflow-hidden">
      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">选择适合您的方案</h2>
          <p className="text-xl text-zinc-500">从个人体验到团队协作，找到最适合您业务阶段的方案</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative bg-white rounded-[2.5rem] p-10 border ${p.highlighted ? "border-amber-500 shadow-2xl scale-105 z-10" : "border-zinc-200 shadow-xl"}`}
            >
              {p.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  {p.badge}
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
              <p className="text-zinc-500 text-sm mb-6">{p.description}</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-black">{p.price}</span>
                <span className="text-zinc-400 font-medium">{p.period}</span>
              </div>
              <ul className="space-y-4 mb-10">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-zinc-600">
                    <Check className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`flex h-14 items-center justify-center rounded-2xl font-bold transition-all ${p.highlighted ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"}`}>
                {p.buttonText}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-white border-t border-zinc-100 pt-24 pb-12">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
             <Link href="/" className="flex items-center gap-2.5 font-bold text-2xl tracking-tight mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <span>Personalize</span>
            </Link>
            <p className="text-zinc-500 max-w-xs mb-8 leading-relaxed">
              从产品文档到爆款社媒，只需一念之间。让每一次创作都直抵人心。
            </p>
            <div className="flex gap-4">
              {[Twitter, Github, Mail].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-50 hover:text-amber-500 transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6">产品</h4>
            <ul className="space-y-4 text-zinc-500 text-sm">
              <li><a href="#" className="hover:text-amber-600 transition-colors">功能</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">定价</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">更新日志</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">公司</h4>
            <ul className="space-y-4 text-zinc-500 text-sm">
              <li><a href="#" className="hover:text-amber-600 transition-colors">关于我们</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">隐私政策</a></li>
              <li><a href="#" className="hover:text-amber-600 transition-colors">服务条款</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-zinc-50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-400">
          <p>© {new Date().getFullYear()} Personalize Inc. 保留所有权利。</p>
          <p>Made with ❤️ by Personalize Team</p>
        </div>
      </div>
    </footer>
  );
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-amber-100 selection:text-amber-900">
      <Nav />
      <Hero />
      <Philosophy />
      <Features />
      <Footer />
    </div>
  );
}
