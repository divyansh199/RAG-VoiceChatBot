import { useState, useEffect, useRef } from "react";
import {
  usePipecatClient,
  usePipecatClientTransportState,
  useRTVIClientEvent,
  PipecatClientMicToggle,
  PipecatClientAudio,
} from "@pipecat-ai/client-react";
import { RTVIEvent, TransportStateEnum } from "@pipecat-ai/client-js";
import { Play, StopCircle, Mic, MicOff, Send, Bot, Sparkles, Zap, Volume2, ChevronDown } from "lucide-react";
import { ChatMessage } from "@/types/ChatMessage";
import { ChunkMetadata } from "@/types/Chunk";
import { getId } from "@/utils/chat";
import BotMessageBubble from "./BotMessageBubble";
import UserMessageBubble from "./UserMessageBubble";
import usePipecatChatEvents from "@/hooks/pipecat-chat-events";
import api from "../utils/api";

interface RealTimeChatPanelProps {
  equipmentId?: string;
  onEquipmentChange?: (id: string) => void;
}

export default function RealTimeChatPanel({
  equipmentId,
  onEquipmentChange
}: RealTimeChatPanelProps) {
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();

  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chunksMetadata, setChunksMetadata] = useState<{ [key: string]: ChunkMetadata }>({});
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>(equipmentId || "");

  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Subscribe to Pipecat chat events
  usePipecatChatEvents(setMessages, setChunksMetadata);

  // Load equipment on mount
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        const response = await api.get("/equipment/");
        // Ensure response.data is an array
        const data = Array.isArray(response.data) ? response.data : [];
        setEquipmentList(data);
        if (data.length > 0 && !selectedEqId) {
          const firstItem = data[0];
          setSelectedEqId(firstItem._id);
          onEquipmentChange?.(firstItem._id);
        }
      } catch (error) {
        console.error("Failed to load equipment:", error);
        // Ensure equipmentList is always an array even on error
        setEquipmentList([]);
      }
    };
    loadEquipment();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const isConnecting =
    transportState === TransportStateEnum.CONNECTING || transportState === TransportStateEnum.AUTHENTICATING;
  // Check for READY state, but also allow CONNECTED as a fallback
  // Also check if we're in a state where the connection is established (even if not READY yet)
  const isConnected =
    transportState === TransportStateEnum.READY ||
    transportState === TransportStateEnum.CONNECTED;

  // Track if we've ever been connected (to show mic toggle even if state temporarily changes)
  const [hasBeenConnected, setHasBeenConnected] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setHasBeenConnected(true);
    } else if (transportState === TransportStateEnum.DISCONNECTED) {
      setHasBeenConnected(false);
    }
  }, [isConnected, transportState]);

  // Log transport state changes for debugging
  useEffect(() => {
    console.log("Transport state changed:", transportState);
    console.log("isConnecting:", isConnecting, "isConnected:", isConnected);
  }, [transportState, isConnecting, isConnected]);

  useRTVIClientEvent(RTVIEvent.BotReady, () => {
    console.log("✅ Bot is ready - connection established");
  });

  useRTVIClientEvent(RTVIEvent.BotConnected, () => {
    console.log("✅ Bot connected");
  });

  useRTVIClientEvent(RTVIEvent.Error, (error: any) => {
    console.error("❌ Connection error:", error);
  });

  useRTVIClientEvent(RTVIEvent.Connected, () => {
    console.log("✅ WebSocket connected");
  });

  useRTVIClientEvent(RTVIEvent.Disconnected, () => {
    console.log("⚠️ WebSocket disconnected");
  });

  const handleConnect = async () => {
    const eqId = selectedEqId || equipmentId;
    if (!eqId) {
      alert("Please select a machine/equipment");
      return;
    }

    // Check if already connected or connecting, disconnect first
    if (transportState !== TransportStateEnum.DISCONNECTED && transportState !== TransportStateEnum.DISCONNECTING) {
      console.log("Client already connected/connecting, disconnecting first...");
      try {
        await handleDisconnect();
        // Wait a bit for disconnect to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error during disconnect before reconnect:", error);
      }
    }

    const endpoint = import.meta.env.VITE_PIPECAT_ENDPOINT || "/stream/connect";

    try {
      console.log("Connecting with equipment_id:", eqId);
      console.log("Endpoint:", endpoint);
      console.log("Full URL:", `${api.defaults.baseURL}${endpoint}`);

      const response = await api.post(endpoint, {
        equipment_id: eqId
      });

      console.log("Connection response:", response.data);
      console.log("WebSocket URL from response:", response.data?.ws_url);
      
      // Rewrite WebSocket URL to use frontend's host for Vite proxy
      let wsUrl = response.data?.ws_url;
      if (wsUrl) {
        const wsScheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsPath = new URL(wsUrl).pathname;
        wsUrl = `${wsScheme}//${window.location.host}${wsPath}`;
        console.log("Rewritten WebSocket URL:", wsUrl);
      }
      
      console.log("Attempting to connect client...");

      if (!client) {
        throw new Error("Pipecat client not initialized");
      }
      // Verify we have a ws_url
      if (!wsUrl) {
        throw new Error("No ws_url in connection response");
      }

      // Wrap connect in try-catch to handle any initialization errors
      try {
        // Only pass recognized connection params to client.connect()
        // Filter out application-specific fields like equipment_id
        const { equipment_id: _eqId, ...pipelineParams } = response.data;
        const connectData = { ...pipelineParams, ws_url: wsUrl };
        console.log("Calling client.connect() with:", connectData);
        const connectResult = await client.connect(connectData);
        console.log("Client.connect() completed, result:", connectResult);
        console.log("Client.connect() called, waiting for transport state update...");
      } catch (connectError: any) {
        console.error("❌ Error during client.connect():", connectError);
        console.error("Error details:", {
          message: connectError?.message,
          stack: connectError?.stack,
          name: connectError?.name,
          toString: connectError?.toString()
        });

        // Handle specific errors like enumerateDevices
        if (connectError?.message?.includes("enumerateDevices") ||
          connectError?.toString().includes("enumerateDevices")) {
          console.warn("⚠️ Microphone access error (this is expected if not using HTTPS or microphone not available):", connectError);
          // Try to connect anyway - the client might still work without microphone
          // The error might be non-fatal
          console.log("Attempting to continue connection despite microphone error...");
        } else {
          // Log the error but don't throw - let the connection attempt continue
          console.error("Connection error (non-fatal, continuing):", connectError);
        }
      }

      // Give the client a moment to establish the connection and update state
      // The transport state should transition: CONNECTING -> READY
      // If it doesn't transition within 5 seconds, log a warning
      setTimeout(() => {
        const currentState = transportState;
        console.log("Transport state after 5 seconds:", currentState);
        if (currentState !== TransportStateEnum.READY &&
          currentState !== TransportStateEnum.CONNECTED &&
          currentState !== TransportStateEnum.CONNECTING) {
          console.warn("⚠️ Transport state did not transition to READY. Current state:", currentState);
        }
      }, 5000);
    } catch (error: any) {
      console.error("Failed to connect:", error);
      const errorMessage = error?.response?.data?.detail || error?.message || "Unknown error";
      console.error("Error details:", {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      alert(`Connection Error: ${errorMessage}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (transportState === TransportStateEnum.DISCONNECTED || transportState === TransportStateEnum.DISCONNECTING) {
        console.log("Already disconnected or disconnecting");
        setHasBeenConnected(false);
        return;
      }
      console.log("Disconnecting client...");
      setHasBeenConnected(false); // Reset connection state
      await client?.disconnect();
      console.log("Client disconnected successfully");
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      if (
        error?.message?.includes("Session ended") ||
        error?.toString().includes("Session ended") ||
        error?.message?.includes("already disconnected")
      ) {
        console.log("Session already ended or disconnected");
        setHasBeenConnected(false);
        return;
      }
      console.error("Failed to disconnect:", error);
      setHasBeenConnected(false);
    }
  };

  const handleSendText = async () => {
    const payload = text.trim();
    if (!payload || !client) return;

    await client.sendText(payload);

    setMessages((prev) => [
      ...prev,
      { id: getId(), role: "user", content: payload, timestamp: new Date() },
    ]);
    setText("");
  };

  return (
    <div className="h-full flex flex-col text-white/90">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-white/[0.06] glass-strong flex items-center justify-between gap-4 animate-slide-down">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-neon-sm">
              <Bot className="h-5 w-5 text-white" />
            </div>
            {isConnected && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-surface-900 animate-pulse-subtle" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-bold tracking-tight truncate">
              <span className="text-gradient">RAG Voice Agent</span>
            </h1>
            <p className="text-[11px] text-white/40 font-medium tracking-wide">
              {isConnected ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-flex">
                    <Volume2 className="h-3 w-3 text-emerald-400" />
                  </span>
                  Live session active
                </span>
              ) : (
                "Real-time AI conversation"
              )}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Equipment Selector */}
          <div className="relative">
            <select
              value={selectedEqId}
              onChange={(e) => {
                setSelectedEqId(e.target.value);
                onEquipmentChange?.(e.target.value);
              }}
              disabled={isConnected}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium border border-white/[0.08] rounded-xl bg-white/[0.04] text-white/80 disabled:opacity-40 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all hover:bg-white/[0.06] cursor-pointer min-w-[140px]"
            >
              <option value="" className="bg-surface-900">Select Equipment</option>
              {Array.isArray(equipmentList) && equipmentList.map((item) => (
                <option key={item._id} value={item._id} className="bg-surface-900">
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
          </div>

          {/* Mic Toggle */}
          {(isConnected || hasBeenConnected) && (
            <PipecatClientMicToggle disabled={!isConnected}>
              {({ disabled, isMicEnabled, onClick }) => (
                <button
                  disabled={disabled}
                  onClick={onClick}
                  className={`p-2 rounded-xl border transition-all duration-200 ${
                    isMicEnabled
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
                      : "text-red-400 border-red-500/20 bg-red-500/10"
                  } ${disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
                  title={isMicEnabled ? "Microphone on" : "Microphone off"}
                >
                  {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
              )}
            </PipecatClientMicToggle>
          )}

          {/* Connect / Disconnect */}
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={isConnecting || !selectedEqId}
            className={`group relative px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
              isConnected
                ? "bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                : "bg-gradient-to-r from-indigo-500 to-violet-500 text-white border border-indigo-400/20 hover:shadow-neon hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {isConnected ? (
              <span className="flex items-center gap-1.5">
                <StopCircle className="h-3.5 w-3.5" />
                End
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                {isConnecting ? (
                  <>
                    <div className="voice-wave" style={{ height: 14 }}>
                      <span /><span /><span /><span /><span />
                    </div>
                    Connecting
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Start Session
                  </>
                )}
              </span>
            )}
          </button>

          {/* Status Pill */}
          <div className={`px-3 py-1.5 text-[11px] font-medium rounded-full border transition-all duration-500 ${
            isConnecting
              ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
              : isConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                : "bg-white/[0.03] text-white/30 border-white/[0.06]"
          }`}>
            <div className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${
                isConnecting
                  ? "bg-amber-400 animate-pulse"
                  : isConnected
                    ? "bg-emerald-400 animate-pulse-subtle"
                    : "bg-white/20"
              }`} />
              {isConnecting ? "Connecting" : isConnected ? "Live" : "Idle"}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element */}
      <div className="hidden">
        <PipecatClientAudio />
      </div>

      {/* ── Chat Messages ───────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center animate-fade-in">
            <div className="text-center space-y-6 max-w-sm">
              {/* Animated logo */}
              <div className="relative inline-flex">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/10 animate-float">
                  <Sparkles className="h-10 w-10 text-indigo-400" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-transparent animate-glow" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white/90">
                  Ready to assist
                </h2>
                <p className="text-sm text-white/35 leading-relaxed">
                  Select your equipment, start a session, then speak or type to begin a real-time AI conversation.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4 text-[11px] text-white/25">
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5" /> Voice input
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> RAG-powered
                </span>
                <span className="text-white/10">|</span>
                <span className="flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5" /> Real-time
                </span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            if (m.role === "bot") {
              return (
                <BotMessageBubble
                  key={m.id}
                  message={m}
                  chunksMetadata={chunksMetadata}
                />
              );
            }
            return <UserMessageBubble key={m.id} message={m} />;
          })
        )}
        <div ref={endRef} />
      </div>

      {/* ── Chat Input ──────────────────────────────────────── */}
      <div className="border-t border-white/[0.06] glass-strong p-4">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isConnected ? "Type a message..." : "Start a session to chat"}
              disabled={!isConnected}
              className="w-full px-4 py-3 text-sm rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/90 placeholder:text-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/20 focus:bg-white/[0.06] outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConnected && text.trim()) {
                  handleSendText();
                }
              }}
            />
            {isConnected && text.trim() && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-white/20 border border-white/[0.06] rounded-md mr-1">
                  ↵
                </kbd>
              </div>
            )}
          </div>
          <button
            onClick={handleSendText}
            disabled={!text.trim() || !isConnected}
            className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white disabled:opacity-20 disabled:cursor-not-allowed hover:shadow-neon hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

