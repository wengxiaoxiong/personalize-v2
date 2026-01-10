export interface AgentContext {
  user: {
    id: string;
    [key: string]: unknown;
  };
  personaId?: string;
  projectId?: string;
  knowledgeBase?: string | null;
  currentPersonaId?: string | null;
  lastPostId?: string;
}
