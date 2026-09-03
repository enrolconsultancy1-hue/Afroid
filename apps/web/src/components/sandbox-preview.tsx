"use client";

/**
 * SandboxPreview — Sandboxed iframe for live previewing deployed service URLs.
 *
 * Phase 3 of the geezcodE IDE upgrade plan. Provides:
 * - Sandboxed iframe (scripts, same-origin, forms allowed)
 * - Address bar with manual URL input
 * - Refresh / open-in-new-tab controls
 * - "No preview available" graceful state
 */

import React, { useCallback, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Globe, X } from "lucide-react";

interface SandboxPreviewProps {
  /** Initial URL to load — defaults to empty (shows placeholder) */
  initialUrl?: string;
  className?: string;
  onClose?: () => void;
}

export default function SandboxPreview({
  initialUrl = "",
  className = "",
  onClose,
}: SandboxPreviewProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = useCallback((dest: string) => {
    let resolved = dest.trim();
    if (!resolved) return;
    if (!/^https?:\/\//i.test(resolved)) {
      resolved = `https://${resolved}`;
    }
    setUrl(resolved);
    setInputUrl(resolved);
    setLoading(true);
  }, []);

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") navigate(inputUrl);
  };

  const refresh = () => {
    if (!url) return;
    // Force iframe reload by briefly clearing and re-setting src
    if (iframeRef.current) {
      iframeRef.current.src = "";
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = url;
        setLoading(true);
      }, 50);
    }
  };

  return (
    <div
      className={`flex flex-col bg-surface-950 border-t border-surface-800 ${className}`}
    >
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-surface-800 bg-surface-900 px-3">
        <Globe className="h-3.5 w-3.5 shrink-0 text-brand-400" />

        <div className="flex flex-1 items-center gap-1.5 rounded-md border border-surface-750 bg-surface-950 px-2 py-1">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleAddressKeyDown}
            placeholder="Enter preview URL (e.g. https://afroid-web-prod.run.app)"
            className="flex-1 bg-transparent font-mono text-[11px] text-surface-200 outline-none placeholder:text-surface-600"
          />
        </div>

        <button
          type="button"
          onClick={refresh}
          title="Refresh"
          className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close preview"
            className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* iframe / placeholder */}
      <div className="relative flex-1 overflow-hidden">
        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
            title="geezcodE Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="h-full w-full border-none bg-white"
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Globe className="h-8 w-8 text-surface-700" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-surface-400">No preview URL set</p>
              <p className="text-xs text-surface-600">
                Enter a deployed service URL above to preview it live.
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5 mt-2 text-xs text-surface-600 font-mono">
              <span>afroid-web-prod-&lt;hash&gt;.run.app</span>
              <span>localhost:3000</span>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && url && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-950/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg border border-surface-750 bg-surface-900 px-4 py-2 text-xs text-surface-300">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand-400" />
              Loading preview…
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
