"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  payload: {
    agentName?: string;
    title?: string;
    detail?: string;
    filePath?: string;
    chunk?: string;
    totalFiles?: number;
    totalLines?: number;
    progress?: number;
    phase?: string;
    architecture?: Record<string, any>;
    status?: string;
    message?: string;
  };
}

export interface PatchReviewEvent {
  filePath: string;
  originalContent?: string;
  newContent: string;
  diff?: string;
  agentName?: string;
  milestoneId?: string;
}

export interface UseAgentStreamOptions {
  sessionId?: string;
  onCodeChunk?: (filePath: string, chunk: string) => void;
  onAgentAction?: (agentName: string, title: string, detail: string) => void;
  onPhaseChange?: (phase: string, progress: number) => void;
  onPatchReview?: (patch: PatchReviewEvent) => void;
}

export function useAgentStream({
  sessionId,
  onCodeChunk,
  onAgentAction,
  onPhaseChange,
  onPatchReview,
}: UseAgentStreamOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentPhase, setCurrentPhase] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback((targetSessionId: string) => {
    if (typeof window === "undefined") return;

    // Disconnect existing
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      (window.location.protocol === "https:" ? "wss://" : "ws://") +
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? `localhost:${process.env.NEXT_PUBLIC_WS_PORT || "8014"}`
          : window.location.host);

    const accessToken =
      typeof window !== "undefined"
        ? localStorage.getItem("afroid_access_token")
        : null;
    const tokenParam = accessToken
      ? `?token=${encodeURIComponent(accessToken)}`
      : "";
    const fullUrl = `${wsUrl}/ws/${targetSessionId}${tokenParam}`;
    const ws = new WebSocket(fullUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: AgentEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, msg]);

        if (msg.type === "code_chunk" && msg.payload.filePath && msg.payload.chunk) {
          onCodeChunk?.(msg.payload.filePath, msg.payload.chunk);
        } else if ((msg.type === "code_patch" || msg.type === "patch_review") && msg.payload.filePath && (msg.payload.chunk || msg.payload.detail)) {
          onPatchReview?.({
            filePath: msg.payload.filePath,
            newContent: msg.payload.chunk || "",
            diff: msg.payload.detail,
            agentName: msg.payload.agentName,
            milestoneId: msg.payload.phase,
          });
        } else if (msg.type === "agent_action" && msg.payload.agentName && msg.payload.title) {
          onAgentAction?.(
            msg.payload.agentName,
            msg.payload.title,
            msg.payload.detail || ""
          );
        } else if (msg.type === "phase_change" && msg.payload.phase) {
          setCurrentPhase(msg.payload.phase);
          const p = msg.payload.progress ?? 0;
          setProgress(p);
          onPhaseChange?.(msg.payload.phase, p);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [onCodeChunk, onAgentAction, onPhaseChange, onPatchReview]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendApproval = useCallback((approved: boolean, feedback?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "blueprint_approval",
          payload: { approved, feedback },
        })
      );
    }
  }, []);

  const sendPatchReview = useCallback((approved: boolean, filePath: string, feedback?: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: approved ? "patch_approved" : "patch_rejected",
          payload: { filePath, approved, feedback },
        })
      );
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      connect(sessionId);
    }
    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    isConnected,
    events,
    currentPhase,
    progress,
    connect,
    disconnect,
    sendApproval,
    sendPatchReview,
  };
}
