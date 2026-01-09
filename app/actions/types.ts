/* eslint-disable @typescript-eslint/no-explicit-any */
export type PersonaSummary = {
  id?: string;
  name: string;
  domain: string[];
  style: string;
  usage: number;
  lastUsed: string;
  badge?: string;
  avatarUrl?: string | null;
  // 扩展字段
  alias?: string;
  tagline?: string;
  audience?: string;
  voice?: string;
  tone?: string;
  background?: string;
  bio?: string;
  callToAction?: string;
  contentPillars?: string[];
  hooks?: string[];
};

export type DashboardSnapshot = {
  personas: PersonaSummary[];
};

/**
 * 基础 Action 返回状态
 */
export type ActionState<T = any> = {
  ok: boolean;
  message: string;
  data?: T;
};

/**
 * ActionResult 是 ActionState 的别名，更明确地表示带返回数据的操作结果
 */
export type ActionResult<T = any> = ActionState<T>;

// JSON 字段的类型定义
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type ProfessionalBackground = {
  background?: string;
  tagline?: string;
  alias?: string;
  bio?: string;
};

export type ExpressionStyle = {
  style?: string;
  voice?: string;
  tone?: string;
};

export type AudienceRelation = {
  audience?: string;
};

export type ProfessionalPreferences = {
  contentPillars?: string[];
  hooks?: string[];
  reminders?: string[];
  callToAction?: string;
};

export interface ProjectAssetMetadata {
  [key: string]: JsonValue | undefined;
  textContent?: string;
  fileType?: string;
  fileSize?: number;
  pageCount?: number;
  aiSummary?: string;
  extractedAt?: string;
}

export interface KnowledgeBaseMetadata {
  [key: string]: JsonValue | undefined;
  aiKnowledgeBase?: string;
  summary?: string;
  keyPoints?: string[];
  categories?: string[];
  generatedAt?: string;
  documentCount?: number;
  totalTextLength?: number;
}
