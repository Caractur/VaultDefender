"use client";

import { useEffect, useRef } from "react";
import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";
import { getToolName, isToolOrDynamicToolUIPart } from "ai";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolCard, type ToolCardResult } from "@/components/chat/tool-card";

function normalizeToolResult(output: unknown): ToolCardResult | undefined {
  if (output === undefined) return undefined;
  if (output && typeof output === "object") {
    const o = output as Record<string, unknown>;
    if (
      "success" in o ||
      "error" in o ||
      "policy" in o ||
      "data" in o
    ) {
      return {
        success: o.success as boolean | undefined,
        error: o.error as string | undefined,
        data: o.data,
        policy: o.policy as ToolCardResult["policy"],
      };
    }
    return { success: true, data: output };
  }
  return { success: true, data: output };
}

function toolArgs(part: ToolUIPart | DynamicToolUIPart): Record<string, unknown> {
  if (!("input" in part) || part.input === undefined) return {};
  if (typeof part.input === "object" && part.input !== null) {
    return part.input as Record<string, unknown>;
  }
  return { value: part.input as unknown };
}

function renderToolPart(part: ToolUIPart | DynamicToolUIPart) {
  const name = getToolName(part);
  const args = toolArgs(part);

  if (part.state === "output-error") {
    return (
      <ToolCard
        toolName={name}
        args={args}
        result={{ success: false, error: part.errorText }}
      />
    );
  }

  if (part.state === "output-available" && "output" in part) {
    return (
      <ToolCard
        toolName={name}
        args={args}
        result={normalizeToolResult(part.output)}
      />
    );
  }

  if (part.state === "output-denied") {
    return (
      <ToolCard
        toolName={name}
        args={args}
        result={{
          success: false,
          policy: {
            allowed: false,
            riskLevel: "high",
            reason: "Denied",
            requiresApproval: false,
          },
        }}
      />
    );
  }

  return (
    <ToolCard
      toolName={name}
      args={args}
      result={{
        policy: {
          allowed: false,
          riskLevel: "medium",
          reason: "Awaiting result",
          requiresApproval: true,
        },
      }}
    />
  );
}

export function ChatMessages({ messages }: { messages: UIMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const inner = (
    <div className="flex flex-col gap-4 pr-2">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex flex-col gap-2",
            message.role === "user" ? "items-end" : "items-start"
          )}
        >
          {message.parts.map((part, i) => {
            const key = `${message.id}-${i}-${part.type}`;

            if (part.type === "text") {
              return (
                <div
                  key={key}
                  className={cn(
                    "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3",
                    message.role === "user"
                      ? "bg-primary/10 text-foreground"
                      : "border border-border bg-card text-card-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {part.text}
                  </p>
                </div>
              );
            }

            if (isToolOrDynamicToolUIPart(part)) {
              return (
                <div key={key} className="w-full max-w-[min(100%,42rem)]">
                  {renderToolPart(part)}
                </div>
              );
            }

            if (part.type === "reasoning") {
              return (
                <div
                  key={key}
                  className="max-w-[min(100%,42rem)] rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <p className="whitespace-pre-wrap text-sm italic text-muted-foreground">
                    {part.text}
                  </p>
                </div>
              );
            }

            return null;
          })}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="h-full min-h-0 flex-1">
        <div className="p-4">{inner}</div>
      </ScrollArea>
    </div>
  );
}
