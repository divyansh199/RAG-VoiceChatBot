import { BotJson } from "@/types/BotJson";
import { ChunkMetadata } from "@/types/Chunk";
import { parseTextWithCitations } from "@/utils/chat";
import { FileText, AlertTriangle } from "lucide-react";

export default function BotJsonCard({
  data,
  chunksMetadata,
}: {
  data: BotJson;
  chunksMetadata: { [key: string]: ChunkMetadata };
}) {
  return (
    <div className="space-y-3">
      {/* Suggested Response — Main Body */}
      <div className="text-sm text-white/85 leading-7 max-w-none">
        {data.suggested_response}
      </div>

      {/* Facts with Citations */}
      {data.facts && data.facts.length > 0 && (
        <div className="pt-3 mt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-3">
            <FileText className="h-3 w-3 text-indigo-400/60" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">
              Sources
            </span>
          </div>
          <ul className="space-y-2.5">
            {data.facts.map((fact, idx) => {
              const parts = parseTextWithCitations(fact, chunksMetadata);
              return (
                <li key={idx} className="text-sm text-white/65 flex items-start gap-2.5">
                  <span className="mt-2 h-1 w-1 rounded-full bg-indigo-400/40 flex-shrink-0" />
                  <span className="leading-relaxed">
                    {parts.map((part, partIdx) => {
                      if (part.type === "citation") {
                        const metadata = part.chunkId ? chunksMetadata[part.chunkId] : null;
                        return (
                          <span
                            key={partIdx}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 text-[11px] font-medium rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/10 hover:bg-indigo-500/20 transition-colors cursor-help"
                            title={metadata ? `From: ${metadata.file_name}` : ""}
                          >
                            {part.content}
                          </span>
                        );
                      }
                      return <span key={partIdx}>{part.content}</span>;
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sarcasm Detection */}
      {data.sarcasm?.detected && (
        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">
              Sarcasm Detected ({(data.sarcasm.confidence * 100).toFixed(0)}%)
            </span>
          </div>
          {data.sarcasm.reason && (
            <p className="text-xs text-amber-200/60 ml-5.5">{data.sarcasm.reason}</p>
          )}
          {data.sarcasm.type && (
            <p className="text-[11px] text-amber-200/40 mt-1 ml-5.5">
              Type: {data.sarcasm.type.replace("_", " ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

