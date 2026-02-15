import { ChatMessage } from "@/types/ChatMessage";
import { formatMessageTime } from "@/utils/chat";
import { User } from "lucide-react";

export default function UserMessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-start gap-3 justify-end animate-slide-up group max-w-4xl ml-auto">
      {/* User bubble */}
      <div className="max-w-[80%]">
        <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/10">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-white/85">
            {message.content}
          </pre>
        </div>
        {message.timestamp && !message.streaming && (
          <div className="mt-1.5 mr-1 text-[10px] text-white/20 font-medium text-right">
            {formatMessageTime(message.timestamp)}
          </div>
        )}
      </div>

      {/* User avatar */}
      <div
        className="mt-0.5 flex-shrink-0 p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
        title="You"
      >
        <User className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

