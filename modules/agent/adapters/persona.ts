import type { UIMessage } from "ai";
import { parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";
import { buildFallbackPersona } from "@/app/(dashboard)/personas/components/persona-generator-helpers";

export const PERSONA_TOOL_NAME = "finalizePersona";
export const PERSONA_GENERATE_KEYWORDS = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];

export const buildPersonaPayload = (messages: UIMessage[]) => {
  const hasPdfContent = messages.some(
    (msg) =>
      msg.role === "user" &&
      msg.parts?.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
  );

  if (hasPdfContent) {
    const pdfMessage = messages.find(
      (msg) =>
        msg.role === "user" &&
        msg.parts?.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
    );
    const userSupplements = messages
      .filter(
        (msg) =>
          msg.role === "user" &&
          !msg.parts?.some((part) => part.type === "text" && part.text.includes("[已上传简历/PDF]"))
      )
      .map((msg) =>
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? ""
      )
      .join("\n");

    const pdfText =
      pdfMessage?.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
        .replace("[已上传简历/PDF]\n\n", "") || "";

    return {
      brief: pdfText + (userSupplements ? `\n\n用户补充需求：\n${userSupplements}` : ""),
      goal: "基于上传的PDF内容和用户补充的需求，生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。",
    };
  }

  return {
    messages: messages.map((msg) => ({
      role: msg.role,
      content:
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? "",
    })),
  };
};

export const parsePersonaResult = (text: string): PersonaParseResult => {
  const parsed = parsePersonaMarkdown(text);
  return parsed ?? buildFallbackPersona(text);
};
