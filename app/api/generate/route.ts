import { deepseek } from "@ai-sdk/deepseek";
import { streamText } from "ai";

type ChunkSegmentPayload = {
  startMs?: number;
  endMs?: number;
  text?: string;
};

type ChunkMetricsPayload = {
  totalSeconds?: number;
  totalChunks?: number;
  segmentCount?: number;
  segments?: ChunkSegmentPayload[];
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic : "";
  const transcript = typeof body.transcript === "string" ? body.transcript : "";
  const goals = body.goals ?? null;
  const chunkMetrics = (body.chunkMetrics ?? null) as ChunkMetricsPayload | null;

  if (!topic || !transcript) {
    return Response.json({ success: false, error: "缺少评分所需的文本" }, { status: 400 });
  }

  const totalDurationSec =
    typeof chunkMetrics?.totalSeconds === "number"
      ? Math.round(chunkMetrics.totalSeconds)
      : null;
  const chunkCount =
    chunkMetrics?.totalChunks ??
    chunkMetrics?.segmentCount ??
    chunkMetrics?.segments?.length ??
    null;
  const cleanedTranscript = transcript.trim();
  const whitespaceSeparated = cleanedTranscript.replace(/\s+/g, " ").trim();
  const tokenBasedWordCount = whitespaceSeparated
    ? whitespaceSeparated.split(" ").filter(Boolean).length
    : 0;
  const characterWordCount = cleanedTranscript.replace(/\s/g, "").length;
  const totalWords =
    tokenBasedWordCount > 0 ? tokenBasedWordCount : characterWordCount;
  const speechRateWpm =
    totalDurationSec && totalDurationSec > 0
      ? Math.round((totalWords / totalDurationSec) * 60)
      : null;

  const segmentDetails = (chunkMetrics?.segments ?? [])
    .map((segment, index) => {
      const start = typeof segment.startMs === "number" ? segment.startMs : 0;
      const end = typeof segment.endMs === "number" ? segment.endMs : 0;
      return `段落${index + 1} (${start}-${end}ms)：${segment.text ?? ""}`;
    })
    .join("\n");

  const metricsText = `总时长：${totalDurationSec ?? 0} 秒；识别片段：${
    chunkCount ?? 0
  }；约字数：${totalWords}；预估语速：${
    speechRateWpm ?? 0
  }；\n${segmentDetails || "无节奏拆分数据"}`;

  const goalText =
    typeof goals === "string" ? goals : goals?.markdown || "未提供";

  const systemPrompt = `你是一名资深中文销售演讲教练，需要将语音演练记录整理为专业、鼓励式的评估报告。你的任务是从销售分享会、客户路演、新员工培训授课的典型场景出发，结合语音内容、节奏数据、销售类表达特征，产出一份结构化、可训练、带行动指导的总结。

措辞要求：专业、客观、鼓励，不夸张；结论必须可执行；每个段落严格遵守规定的 Markdown 结构和标题；禁止输出任何与格式无关的前后缀。

输出结构与标题必须严格如下：

## 总体评价

### [标题]
[总结内容，2-3 句凝练卖点]

**亮点：**
- [亮点1，强调可复用做法]
- [亮点2]
- [亮点3]

---

## 目标达成情况

**状态：** [ACHIEVED/PARTIAL/NOT_ACHIEVED]

[达成情况总结，指出关键证据]

**完成度：** [0-100]%

**要点：**
1. [要点1]
2. [要点2]
3. [要点3]

---

## 技能评分

以下评分标准已针对“销售代表演讲痛点”增强，包括：讲稿照念、节奏乱、语调平、紧张、缺乏销售故事结构、说服力不足、舞台感染力、普通话清晰度等。

### 逻辑表达 (logic)
**评分：** [0-5] 分  
**点评：**  
从“结构完整度、主题聚焦度、论点衔接、销售故事链路（痛点→方案→价值→案例）”四项评估是否达标。需指出是否出现讲稿照念、信息堆叠、逻辑跳跃或销售价值点缺失，并给出明确的训练方法，如“三段式表达”“开头总括句”等。

### 语言流畅 (fluency)
**评分：** [0-5] 分  
**点评：**  
关注表达自然度、停顿控制、紧张表现（卡壳、呼吸乱）、填充词及脱稿度。指出是否因紧张导致语气不稳或依赖稿件，并提供“关键词法”“逐段背诵拆分法”等训练动作。

### 节奏把控 (pacing)
**评分：** [0-5] 分  
**点评：**  
结合语速数据从“节奏稳定性、重点突出度、停顿设计、句群节奏”进行判断。特别关注销售演讲中的典型痛点：一快到底、重点不突出、段落节奏单一，并提供如“重点处停 1 秒”“段落前置总结”等可执行策略。

### 感染力与表现力 (engagement)
**评分：** [0-5] 分  
**点评：**  
从“情绪表达、语调变化、声音能量、销售说服力、共情力、舞台存在感”综合评估。需指出语调是否平、情绪点不足或缺乏价值瞬间，并给出如“情绪梯度 3-1 法”“每 40 秒加入一个情绪节点”等训练方法。

### 普通话与发音清晰度 (mandarin_clarity)
**评分：** [0-5] 分  
**点评：**  
评估四声准确度、音节清晰度、多音字发音、紧张导致的咬字模糊等，并给出“绕口令训练”“重音关键词咬字法”等提升动作。

### 内容掌控与脱稿度 (content_control)
**评分：** [0-5] 分  
**点评：**  
判断是否依赖讲稿、是否能自然转场、是否有遗忘或段落跳跃，并提供“关键词卡片法”“视觉化记忆法”等逐步脱稿训练。

---

## 关键改进建议

### [建议标题1]
[建议描述1，包含具体可执行动作]

### [建议标题2]
[建议描述2]

### [建议标题3]
[建议描述3]

---

## 提醒事项

- [提醒1，保持优势或注意事项]
- [提醒2]
- [提醒3]`;

  const userPrompt = `演讲主题：${topic}
演讲目标（Markdown 原文）：${goalText}
演练转写：${transcript}

识别数据与节奏：${metricsText}

请依据以上内容完成评估，并满足以下要求：
1. 以下七个评分项全部给出 0-5 分并附一句专业点评：
   - 逻辑表达 (logic)
   - 语言流畅 (fluency)
   - 节奏把控 (pacing)
   - 感染力与表现力 (engagement)
   - 普通话与发音清晰度 (mandarin_clarity)
   - 内容掌控与脱稿度 (content_control)
2. 总体评价需体现卖点、舞台表现、销售说服力及改进思路（凝练 2-3 句）；
3. 目标达成段落必须写明状态（ACHIEVED/PARTIAL/NOT_ACHIEVED）、完成度百分比及 3 条关键要点；
4. 改进建议至少 3 条且互不重复，全部包含明确、可执行的训练动作或步骤（例如具体练习次数、时间、可复用方法）；
5. 提醒事项列出 3 条包含亮点或注意点的 bullet；
6. 所有输出必须严格符合系统提示所列的 Markdown 结构和标题；不要输出多余的说明、版权信息或非请求内容。`;

  try {
    const result = streamText({
      model: deepseek("deepseek-chat"),
      system: systemPrompt,
      prompt: userPrompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("生成演讲评分失败", error);
    return Response.json({ success: false, error: "生成演讲评分失败" }, { status: 500 });
  }
}
