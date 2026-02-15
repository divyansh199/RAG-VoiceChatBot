import { ChatMessage } from "@/types/ChatMessage";
import { ChunkMetadata } from "@/types/Chunk";
import { parseBotJson, formatMessageTime } from "@/utils/chat";
import { Bot } from "lucide-react";
import { useMemo } from "react";
import BotJsonCard from "./BotJsonCard";

export default function BotMessageBubble({
  message,
  chunksMetadata,
}: {
  message: ChatMessage;
  chunksMetadata: { [key: string]: ChunkMetadata };
}) {
  // Parse JSON only when the message is finalized (not streaming)
  const botJson = useMemo(() => {
    if (message.streaming) return null;
    return parseBotJson(message.content);
  }, [message.streaming, message.content]);

  return (
    <div className="flex items-start gap-3 animate-slide-up group max-w-4xl">
      {/* Bot avatar */}
      <div className="mt-0.5 flex-shrink-0 relative" title="Bot">
        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-neon-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Bot bubble */}
      <div className="flex-1 min-w-0">
        <div className="px-4 py-3 rounded-2xl rounded-tl-md glass-sm">
          {botJson ? (
            <BotJsonCard data={botJson} chunksMetadata={chunksMetadata} />
          ) : (
            <>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/85">
                {message.content}
              </pre>
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const uniqueCitations = message.citations.reduce((acc, chunk) => {
                        const exists = acc.find(c => c.file_name === chunk.file_name);
                        if (!exists) {
                          acc.push(chunk);
                        }
                        return acc;
                      }, [] as ChunkMetadata[]);

                      return uniqueCitations.map((chunk) => (
                        <div
                          key={chunk.chunk_id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 hover:bg-indigo-500/15 transition-colors cursor-default"
                          title={chunk.file_name}
                        >
                          <span className="truncate max-w-[150px]">{chunk.file_name}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
              {message.streaming && (
                <span className="inline-block w-2 h-4 align-baseline ml-1 rounded-sm bg-indigo-400/50 animate-pulse" />
              )}
            </>
          )}
        </div>
        {message.timestamp && !message.streaming && (
          <div className="mt-1.5 ml-1 text-[10px] text-white/20 font-medium">
            {formatMessageTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

