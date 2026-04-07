import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { setAIContext } from "@auth0/ai-vercel";
import {
  errorSerializer,
  withInterruptions,
} from "@auth0/ai-vercel/interrupts";
import { getAppUser } from "@/lib/auth/session";
import { buildAgentTools } from "@/lib/tools/definitions";
import { APP_NAME } from "@/lib/constants";

const CHAT_MODEL = process.env.CHAT_MODEL || "openai/gpt-4o-mini";
const MAX_AGENT_STEPS = Number(process.env.MAX_AGENT_STEPS) || 5;

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const user = await getAppUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    if (!body || typeof body !== "object" || !("messages" in body)) {
      return new Response("Missing messages field", { status: 400 });
    }

    const { messages, id: threadId } = body as {
      messages: UIMessage[];
      id?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages must be a non-empty array", {
        status: 400,
      });
    }

    setAIContext({ threadID: threadId || user.id });

    const tools = buildAgentTools(user.id);

    const modelMessages = await convertToModelMessages(messages, { tools });

    const sanitizedMessages = modelMessages.filter(
      (m) => m.role !== "system"
    );

    const stream = createUIMessageStream({
      execute: withInterruptions(
        ({ writer }) => {
          const result = streamText({
            model: openrouter(CHAT_MODEL),
            system: `You are ${APP_NAME}, a least-privilege GitHub assistant.

Your role: Help the user manage their GitHub repositories while respecting strict authorization boundaries.

Key behaviors:
- Before performing any action, explain what you're about to do and why
- When a tool call is blocked by policy, explain clearly what happened and suggest how the user can adjust permissions
- Distinguish between GitHub-level permissions (the scopes granted during the user's GitHub/Auth0 authorization flow) and VaultDefender app-level policies (path prefixes and action restrictions configured by the user)
- For high-risk actions, inform the user that approval is required
- Always be transparent about what permissions are in effect
- Write tools may require the user to reconnect GitHub and grant repo write access before GitHub will allow the operation

Available tools: list repos, read files (within allowed paths), review PRs, create branches, edit files by committing full contents to a branch, create draft PRs.
Path-prefix restrictions are enforced by VaultDefender policy before any tool executes.`,
            messages: sanitizedMessages,
            tools,
            stopWhen: stepCountIs(MAX_AGENT_STEPS),
          });

          writer.merge(result.toUIMessageStream({ sendReasoning: true }));
        },
        { messages, tools }
      ),
      onError: errorSerializer((error) => {
        if (error instanceof Error) {
          return error.message;
        }
        return "Internal server error";
      }),
    });

    return createUIMessageStreamResponse({ stream });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
