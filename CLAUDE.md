# Project Guidelines for Claude

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui components
- Vercel AI SDK for AI integrations (preferred for streaming)
- Server Actions for 

## Communication Patterns
- Use Server Actions for all server-side mutations and data fetching unless streaming is required.
- For streaming LLM responses (chat, completion), use Vercel AI SDK hooks:
  - useChat() for chat interfaces (reference: https://sdk.vercel.ai/docs/api-reference/use-chat)
  - useCompletion() for single completions (reference: https://sdk.vercel.ai/docs/api-reference/use-completion)
- Never use traditional API routes (/api/) for mutations if Server Actions can handle it.

## UI Guidelines
- Always use shadcn/ui components by default for buttons, forms, cards, dialogs, tables, etc.
- Extend shadcn components when needed, but do not create custom primitives unless necessary.
- Use Tailwind for all styling. No CSS modules or styled-components.

## Project Structure
.
├── app/                # App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/            # Only for streaming endpoints if needed
├── components/         # Shared UI components (shadcn extensions here)
├── actions/            # Server Actions
├── lib/                # Utilities, AI wrappers
└── hooks/              # Client hooks
|__ modules/agent       # The modules/agent framework provides a modular, reusable foundation for building conversational AI agents in your application. At its core, it separates concerns into four layers: types for shared interfaces, hooks for business logic, UI components for presentation, and adapters for domain-specific customization.To build a new agent, start by creating a domain adapter that defines your business-specific logic such as payload transformation, result parsing, and domain constants. Next, set up state management using hooks to track your agent's workflow state. Then leverage the core hooks: useAgentChat handles streaming conversations with your API endpoint, useAgentOrchestrator manages event-driven triggers (tool calls, message patterns, or manual actions), useToolSignal listens for specific tool invocations, and useFileIngestion processes uploaded files with custom parsers.The trigger system is particularly powerful, supporting three types: tool triggers that fire when AI invokes specific tools, pattern triggers that activate based on message content matching, and manual triggers for user-initiated actions. Combine these with the provided UI components like AgentConversation for rendering messages and AgentPromptInput for user input.The framework follows the adapter pattern, keeping generic agent infrastructure separate from domain logic. When creating a new agent (like a social media post generator), you'll create new adapters and orchestrators while reusing the core hooks and UI components, ensuring consistency across different agent implementations.