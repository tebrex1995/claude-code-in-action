import { Loader2, FilePlus, FileEdit, Eye, Undo2, Trash2, ArrowRightLeft, Wrench } from "lucide-react";

interface ToolInvocationDisplayProps {
  tool: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

function getLabel(tool: ToolInvocationDisplayProps["tool"]): {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
} {
  const { toolName, args } = tool;
  const command = args?.command as string | undefined;
  const path = args?.path as string | undefined;
  const newPath = args?.new_path as string | undefined;

  if (toolName === "str_replace_editor" && command && path) {
    switch (command) {
      case "create":
        return { icon: FilePlus, text: `Created ${path}` };
      case "str_replace":
        return { icon: FileEdit, text: `Edited ${path}` };
      case "insert":
        return { icon: FileEdit, text: `Edited ${path}` };
      case "view":
        return { icon: Eye, text: `Viewed ${path}` };
      case "undo_edit":
        return { icon: Undo2, text: `Reverted ${path}` };
    }
  }

  if (toolName === "file_manager" && command && path) {
    switch (command) {
      case "rename":
        return { icon: ArrowRightLeft, text: `Renamed ${path} → ${newPath}` };
      case "delete":
        return { icon: Trash2, text: `Deleted ${path}` };
    }
  }

  return { icon: Wrench, text: toolName };
}

export function ToolInvocationDisplay({ tool }: ToolInvocationDisplayProps) {
  const isComplete = tool.state === "result" && tool.result;
  const { icon: Icon, text } = getLabel(tool);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <Icon className="w-3.5 h-3.5 text-neutral-500" />
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
