import { useState } from "react";
import { cn } from "@/utils/cn";
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react";

interface ToolInvocationProps {
  toolName: string;
  toolCallId: string;
  state: string;
  input: unknown;
  output?: unknown;
}

export function ToolInvocationStep(props: {
  invocation: ToolInvocationProps;
  visible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { toolName, input, output, state } = props.invocation;

  if (!props.visible) return null;

  const isLoading = state === "input-streaming" || state === "input-available";

  return (
    <div className="mr-auto bg-secondary border border-input rounded p-3 max-w-[80%] mb-2 whitespace-pre-wrap flex flex-col">
      <button
        type="button"
        className={cn(
          "text-left flex items-center gap-1",
          expanded && "w-full",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1">
          {isLoading && (
            <LoaderCircle className="w-4 h-4 animate-spin" />
          )}
          Step: <strong className="font-mono">{toolName}</strong>
        </span>
        <span className={cn(expanded && "hidden")}>
          <ChevronDown className="w-5 h-5" />
        </span>
        <span className={cn(!expanded && "hidden")}>
          <ChevronUp className="w-5 h-5" />
        </span>
      </button>
      <div
        className={cn(
          "overflow-hidden max-h-[0px] transition-[max-height] ease-in-out text-sm",
          expanded && "max-h-[360px]",
        )}
      >
        <div
          className={cn(
            "rounded",
            expanded ? "max-w-full" : "transition-[max-width] delay-100",
          )}
        >
          Input:{" "}
          <code className="max-h-[100px] overflow-auto">
            {JSON.stringify(input)}
          </code>
        </div>
        {output != null && (
          <div
            className={cn(
              "rounded",
              expanded ? "max-w-full" : "transition-[max-width] delay-100",
            )}
          >
            Output:{" "}
            <code className="max-h-[260px] overflow-auto block overflow-y-auto">
              {typeof output === "string" ? output : JSON.stringify(output)}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
