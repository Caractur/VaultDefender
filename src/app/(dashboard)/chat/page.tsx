"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { TokenVaultInterrupt } from "@auth0/ai/interrupts";
import {
  getToolName,
  isToolOrDynamicToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
} from "ai";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { TokenVaultConsentPopup } from "@/components/auth0-ai/TokenVault/popup";
import { Shield } from "lucide-react";

function isTokenVaultToolErrorPart(
  part: unknown
): part is ToolUIPart | DynamicToolUIPart {
  if (
    !isToolOrDynamicToolUIPart(part as ToolUIPart | DynamicToolUIPart) ||
    typeof part !== "object" ||
    part === null
  ) {
    return false;
  }

  const candidate = part as ToolUIPart | DynamicToolUIPart;

  return (
    candidate.state === "output-error" &&
    typeof candidate.errorText === "string" &&
    candidate.errorText.startsWith(
      "Authorization required to access the Token Vault"
    )
  );
}

function useVaultDefenderChat() {
  return useInterruptions(function useVaultDefenderInterruptions(handleError) {
    return useChat({
      onError: handleError(() => {}),
    });
  });
}

export default function ChatPage() {
  const { messages, sendMessage, status, error, toolInterrupt, addToolResult } =
    useVaultDefenderChat();
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const tokenVaultErrorPart = [...messages]
    .reverse()
    .flatMap((message) => [...message.parts].reverse())
    .find(isTokenVaultToolErrorPart);

  const tokenVaultConsentInterrupt =
    toolInterrupt && TokenVaultInterrupt.isInterrupt(toolInterrupt)
      ? toolInterrupt
      : tokenVaultErrorPart
        ? {
            connection: "github",
            requiredScopes: ["repo"],
            authorizationParams: {},
            resume: () => {
              const toolName = getToolName(tokenVaultErrorPart);
              addToolResult({
                tool: toolName,
                toolCallId: tokenVaultErrorPart.toolCallId,
                output: {
                  continueInterruption: true,
                  toolName,
                },
              });
            },
          }
        : null;

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Agent Chat</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Ask VaultDefender to inspect repositories and commit approved changes within policy boundaries.
        </p>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {tokenVaultConsentInterrupt ? (
        <div className="mx-4 mt-3">
          <TokenVaultConsentPopup
            interrupt={tokenVaultConsentInterrupt}
            auth={{ returnTo: "/close" }}
            connectWidget={{
              title: "Authorize GitHub access",
              description:
                "VaultDefender uses Auth0 Token Vault to request GitHub access only when a tool needs it. Complete the GitHub/Auth0 consent flow, then this chat will resume automatically.",
              action: { label: "Continue with GitHub" },
              containerClassName:
                "border-amber-500/40 bg-amber-500/5 text-foreground",
            }}
          />
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Welcome to VaultDefender</h2>
          <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
            I can help you manage GitHub repos with least-privilege policies. Try:
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            {[
              "List my accessible repositories",
              "Read the README from owner/repo",
              "Edit docs/README.md in owner/repo on branch feature/docs with a short summary and commit it",
              "Review PR #42 in owner/repo",
              "Create a branch called feature/new in owner/repo",
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="rounded-lg border border-border bg-card px-4 py-2.5 text-left text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ChatMessages messages={messages} />
      )}

      <ChatInput
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
