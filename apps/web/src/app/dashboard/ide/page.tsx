"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Files,
  Search,
  GitBranch,
  Bot,
  ShieldCheck,
  Coins,
  Settings,
  PanelLeft,
  PanelRight,
  Terminal as TerminalIcon,
  ChevronRight,
  X,
  Play,
  Pause,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Cpu,
  Layers,
  FileText,
  SlidersHorizontal,
  Plus,
  Trash2,
  Check,
  Send,
  FilePlus,
  RefreshCw,
  Code2,
  QrCode,
  Smartphone,
  Loader2,
  Sparkles,
  Folder,
  Save,
  Undo2,
  Redo2,
  Zap,
  WrapText,
  Eye,
  Hash,
  Globe,
  Keyboard,
  Info,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  Maximize2,
  Minimize2,
  Columns,
  AtSign,
} from "lucide-react";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { QrCodeView } from "@/components/qr-code";
import { useAuthStore } from "@/stores/auth-store";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { registerGeezCodeLanguage } from "@/lib/geezcode-monaco";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090";
// Orchestrator WebSocket base (direct — Cloud Run supports WS; the gateway proxies HTTP only).
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "";

const authHeaders = (): Record<string, string> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("afroid_access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const MonacoDiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  { ssr: false }
);
const XTerminalPanel = dynamic(() => import("@/components/xterm-panel"), { ssr: false });
const SandboxPreview = dynamic(() => import("@/components/sandbox-preview"), { ssr: false });
import { IDEMenuBar } from "@/components/ide-menu-bar";
import { QuickOpenModal } from "@/components/quick-open-modal";
import { CommandPalette, CommandItem } from "@/components/command-palette";
import { SettingsModal, IDESettings } from "@/components/settings-modal";
import { WelcomeScreen } from "@/components/welcome-screen";
import { ShortcutsModal, AboutModal } from "@/components/ide-dialogs";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string;
  children?: FileNode[];
  content?: string;
  savedContent?: string;
  isOpen?: boolean;
}

interface CoreModule {
  id: string;
  name: string;
  purpose: string;
  responsibilities: string[];
  files: string[];
  acceptance: string[];
}

interface Milestone {
  id: string;
  name: string;
  objective: string;
  tasks: string[];
  filesToCreate: string[];
  definitionsOfDone: string[];
}

interface BlueprintData {
  projectName: string;
  summary: string;
  completeness: number;
  techStack: {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    infra?: string[];
    keyLibraries?: string[];
    rationale?: string;
  };
  systemArchitecture: string;
  dataFlow: string;
  directoryStructure: string;
  databaseSchema: Record<string, string[]> | string;
  apiDesign: Array<{ method: string; path: string; summary: string }> | string;
  authDesign: string;
  securityConsiderations: string;
  deploymentArchitecture: string;
  coreModules: CoreModule[];
  milestones: Milestone[];
  buildOrder: string[];
  risksAndAssumptions: string[];
  generatedBy: string;
}

interface BusinessIdeaForm {
  projectName: string;
  oneLiner: string;
  problem: string;
  targetUsers: string;
  coreFeatures: string[];
  businessModel: string;
  monetization: string;
  integrations: string[];
  constraints: string[];
  compliance: string[];
  platform: string;
  techPreferences: string;
  teamSkill: string;
  timeline: string;
  successCriteria: string;
}

interface AiDockMessage {
  id: string;
  sender: "user" | "agent" | "system";
  agentName?: string;
  text: string;
  thought?: string;
  filesModified?: string[];
  commandsRun?: string[];
  timestamp: string;
}

interface PendingReviewFile {
  filePath: string;
  diff: string;
  originalContent?: string;
  newContent: string;
  agentName: string;
  milestoneId: string;
}

interface ProblemItem {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warning";
  source?: string;
}

interface CustomProvider {
  id: string;
  label: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

// One-click presets for common free / OpenAI-compatible providers.
const PROVIDER_PRESETS: { label: string; baseUrl: string; model: string; hint: string }[] = [
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile", hint: "console.groq.com/keys" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct", hint: "openrouter.ai/keys" },
  { label: "Together", baseUrl: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", hint: "api.together.xyz" },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat", hint: "platform.deepseek.com" },
];

function ProvidersModal({
  providers,
  onClose,
  onChange,
  onSelect,
}: {
  providers: CustomProvider[];
  onClose: () => void;
  onChange: (list: CustomProvider[]) => void;
  onSelect: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});

  const applyPreset = (p: (typeof PROVIDER_PRESETS)[number]) => {
    setLabel(p.label);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
  };
  const canAdd = !!(label.trim() && baseUrl.trim() && model.trim() && apiKey.trim());
  const addProvider = () => {
    if (!canAdd) return;
    const id = Date.now().toString(36);
    onChange([...providers, { id, label: label.trim(), baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() }]);
    setLabel("");
    setBaseUrl("");
    setModel("");
    setApiKey("");
  };
  const removeProvider = (id: string) => onChange(providers.filter((p) => p.id !== id));
  const testProvider = async (p: CustomProvider) => {
    setTesting(p.id);
    try {
      const res = await fetch(`${API_BASE}/v1/builder/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ message: "Reply with a short confirmation.", provider: { base_url: p.baseUrl, api_key: p.apiKey, model: p.model } }),
      });
      const d = (await res.json())?.data;
      const ok = res.ok && d && typeof d.reply === "string" && !/temporarily unavailable/i.test(d.reply);
      setTestResult((r) => ({ ...r, [p.id]: ok ? "ok" : "fail" }));
    } catch {
      setTestResult((r) => ({ ...r, [p.id]: "fail" }));
    } finally {
      setTesting(null);
    }
  };
  const mask = (k: string) => (k.length <= 6 ? "••••" : `${k.slice(0, 3)}••••${k.slice(-3)}`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border border-surface-700 bg-[#161618] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-surface-100">
            <Sparkles className="h-4 w-4 text-brand-400" /> AI Providers
          </div>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-200"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-[11px] leading-relaxed text-surface-400">
            Bring your own OpenAI-compatible provider (Groq, OpenRouter, Together, DeepSeek, local, …) and run the Copilot on it with your own key.
            Keys are stored <b className="text-surface-200">only in this browser</b> and sent per request over TLS — never saved on our servers.
          </p>

          {providers.length > 0 && (
            <div className="space-y-1.5">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded border border-surface-800 bg-surface-900/50 px-2.5 py-1.5 text-[11px]">
                  <span className="flex-1 truncate">
                    <span className="font-medium text-surface-100">{p.label}</span>
                    <span className="text-surface-500"> · {p.model} · key {mask(p.apiKey)}</span>
                  </span>
                  {testResult[p.id] === "ok" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                  {testResult[p.id] === "fail" && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
                  <button onClick={() => testProvider(p)} disabled={testing === p.id} className="rounded px-1.5 py-0.5 text-surface-300 hover:bg-surface-800">
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                  </button>
                  <button onClick={() => onSelect(p.id)} className="rounded px-1.5 py-0.5 text-brand-300 hover:bg-surface-800">Use</button>
                  <button onClick={() => removeProvider(p.id)} className="rounded px-1.5 py-0.5 text-red-400 hover:bg-surface-800">Remove</button>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-surface-500">Quick preset (fills URL + a default model)</div>
            <div className="flex flex-wrap gap-1.5">
              {PROVIDER_PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p)} className="rounded border border-surface-700 px-2 py-0.5 text-[11px] text-surface-300 hover:border-brand-500 hover:text-surface-100" title={`Get a key: ${p.hint}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Groq)" className="w-full rounded border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-[12px] text-surface-100 outline-none focus:border-brand-500" />
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="Base URL (e.g. https://api.groq.com/openai/v1)" className="w-full rounded border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-[12px] text-surface-100 outline-none focus:border-brand-500" />
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model id (e.g. llama-3.3-70b-versatile)" className="w-full rounded border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-[12px] text-surface-100 outline-none focus:border-brand-500" />
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="API key (stored only in this browser)" className="w-full rounded border border-surface-700 bg-surface-950 px-2.5 py-1.5 text-[12px] text-surface-100 outline-none focus:border-brand-500" />
            <button onClick={addProvider} disabled={!canAdd} className="w-full rounded bg-brand-600 py-1.5 text-[12px] font-medium text-white hover:bg-brand-500 disabled:opacity-50">
              Add provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTypeIcon({ name }: { name: string }) {
  if (name.endsWith(".geez") || name.endsWith(".geezcode")) return <Sparkles className="h-3.5 w-3.5 text-amber-400" />;
  if (name.endsWith(".py")) return <FileCode2 className="h-3.5 w-3.5 text-brand-400" />;
  if (name.endsWith(".tsx") || name.endsWith(".ts")) return <FileCode2 className="h-3.5 w-3.5 text-brand-400" />;
  if (name.endsWith(".json")) return <FileCode2 className="h-3.5 w-3.5 text-surface-400" />;
  if (name.endsWith(".yml") || name.endsWith(".yaml")) return <FileText className="h-3.5 w-3.5 text-amber-500/80" />;
  if (name.endsWith(".md")) return <FileText className="h-3.5 w-3.5 text-surface-400" />;
  return <FileCode2 className="h-3.5 w-3.5 text-surface-500" />;
}

const INITIAL_FILES: FileNode[] = [
  {
    name: "services",
    path: "services",
    type: "directory",
    isOpen: true,
    children: [
      {
        name: "api",
        path: "services/api",
        type: "directory",
        isOpen: true,
        children: [
          {
            name: "main.py",
            path: "services/api/main.py",
            type: "file",
            language: "python",
            content: `from fastapi import FastAPI\nfrom pydantic import BaseModel\n\napp = FastAPI(title="Sovereign Agritech API", version="1.0.0")\n\nclass LoanRequest(BaseModel):\n    farmer_id: str\n    amount_usd: float\n    crop_type: str\n\n@app.get("/health")\ndef health_check():\n    return {"status": "healthy", "sovereignty": "verified"}\n\n@app.post("/v1/loans/originate")\ndef originate_loan(req: LoanRequest):\n    return {"loan_id": "LN-9921", "approved": True, "amount": req.amount_usd}\n`,
          },
          {
            name: "routes.py",
            path: "services/api/routes.py",
            type: "file",
            language: "python",
            content: `# API Routes definition\nfrom fastapi import APIRouter\n\nrouter = APIRouter()\n\n@router.get("/v1/commodities")\ndef list_commodities():\n    return [{"crop": "Coffee", "price_per_kg": 4.5}, {"crop": "Cocoa", "price_per_kg": 8.2}]\n`,
          },
        ],
      },
    ],
  },
  {
    name: "apps",
    path: "apps",
    type: "directory",
    isOpen: true,
    children: [
      {
        name: "web",
        path: "apps/web",
        type: "directory",
        isOpen: true,
        children: [
          {
            name: "page.tsx",
            path: "apps/web/page.tsx",
            type: "file",
            language: "typescriptreact",
            content: `export default function Home() {\n  return (\n    <main className="min-h-screen bg-slate-950 text-white p-8">\n      <h1 className="text-3xl font-bold">Afroid Sovereign App</h1>\n      <p className="mt-2 text-surface-400">Powered by geezcodE 2.5</p>\n    </main>\n  );\n}\n`,
          },
        ],
      },
    ],
  },
  {
    name: "docker-compose.yml",
    path: "docker-compose.yml",
    type: "file",
    language: "yaml",
    content: `version: '3.8'\nservices:\n  api:\n    build: .\n    ports:\n      - "8000:8000"\n    environment:\n      - DATABASE_URL=postgresql://afroid:***@postgres:5432/afroid\n`,
  },
  {
    name: "domain.geez",
    path: "domain.geez",
    type: "file",
    language: "geezcode",
    content: `domain SovereignAgritech {
  describe "A peer-to-peer micro-lending and crop insurance platform for African smallholder farmers"
}

entity Farmer {
  name: string @required;
  phone: phone @unique;
  country: string @required;
  creditScore: number @min(300) @max(850) @default(600);
  kycVerified: boolean @default(false);
  createdAt: date @default(now);
}

entity LoanRequest {
  farmer: Farmer @required;
  amount: money @min(10);
  currency: string @default("USD");
  cropType: string @required;
  status: string @default("pending");
}

flow LoanOriginationFlow {
  step SubmitRequest {
    action "Farmer dials USSD or submits mobile application form"
    input LoanRequest
    output LoanDecision
  }

  step Disbursement {
    action "Instant automated payout via M-Pesa or Paystack"
    condition "loan.approved == true"
    on_error "Notify farmer via SMS and route to manual review"
  }
}

rule AutoApproveLowRisk when loan.amount < 500 && farmer.creditScore >= 700 then approve(loan)

api AgritechAPI {
  POST   "/v1/loans/originate"    -> LoanRequest     auth authenticated
  GET    "/v1/farmers/:id"        -> Farmer          auth authenticated
  GET    "/v1/commodities"        -> void            auth public
}
`,
  },
  {
    name: "README.md",
    path: "README.md",
    type: "file",
    language: "markdown",
    content: `# Sovereign Agritech Project\n\nGenerated autonomously by geezcodE IDE 2.5.\n\n## Stack\n- FastAPI (Python 3.12)\n- Next.js 15 App Router\n- PostgreSQL 16 + pgvector\n`,
  },
];

const DEFAULT_IDEA: BusinessIdeaForm = {
  projectName: "Sovereign Agritech",
  oneLiner: "Automated micro-lending and crop insurance platform for African smallholder farmers.",
  problem: "Traditional commercial banks reject 85% of smallholder farmers due to zero formal credit history.",
  targetUsers: "Rural cooperative farmers, micro-finance institutions, and agricultural off-takers in Nigeria and Kenya.",
  coreFeatures: [
    "Passwordless SMS & USSD Onboarding",
    "Satellite Weather & Harvest Verification Risk Engine",
    "Instant M-Pesa & Paystack Loan Origination",
    "Automated Escrow Repayment Settlement",
  ],
  businessModel: "B2B2C Marketplace with revenue-sharing lender partners.",
  monetization: "1.5% loan origination fee + 0.5% automated repayment processing commission.",
  integrations: ["M-Pesa Daraja API", "Paystack", "Africa's Talking (SMS/USSD)", "Google Earth Engine"],
  constraints: ["Offline-first local cache for rural agents", "Low-bandwidth 2G/3G compatibility", "Sub-second USSD responses"],
  compliance: ["Nigeria Startup Act 2022 (Tax Exemption)", "Kenya Startup Bill 2024", "AU Startup Framework"],
  platform: "Web App + USSD / SMS Bot + Mobile App",
  techPreferences: "FastAPI + Next.js 15 + PostgreSQL 16 (pgvector) + Redis 7",
  teamSkill: "Intermediate",
  timeline: "1-3 months",
  successCriteria: "$250k monthly loan origination with <1.2% default rate across 5,000 farmers.",
};

const GRANT_CATALOG = [
  { id: "g1", title: "Tony Elumelu Foundation Entrepreneurship Programme", funder: "Tony Elumelu Foundation", amount: "$5,000 seed", region: "Pan-African", sector: "Agnostic" },
  { id: "g2", title: "Google for Startups Black Founders Fund Africa", funder: "Google", amount: "$150,000 non-dilutive", region: "Pan-African", sector: "Technology" },
  { id: "g3", title: "Kenya National Innovation Agency (KeNIA) Grant", funder: "KeNIA", amount: "$20,000", region: "Kenya", sector: "Innovation" },
  { id: "g4", title: "Mastercard Foundation Fund for Rural Prosperity", funder: "Mastercard Foundation", amount: "$100,000+", region: "Pan-African", sector: "Agritech / Fintech" },
  { id: "g5", title: "develoPPP Ventures", funder: "DEG / GIZ", amount: "€100,000", region: "Pan-African", sector: "Impact" },
];

function updateTreeContent(nodes: FileNode[], path: string, newContent: string): FileNode[] {
  return nodes.map((n) => {
    if (n.path === path) {
      return { ...n, content: newContent };
    }
    if (n.children) {
      return { ...n, children: updateTreeContent(n.children, path, newContent) };
    }
    return n;
  });
}

function findNodeInTree(nodes: FileNode[], path: string): FileNode | null {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const found = findNodeInTree(n.children, path);
      if (found) return found;
    }
  }
  return null;
}

function GeezCodeIDEContent() {
  const { user } = useAuthStore();

  const [activeActivity, setActiveActivity] = useState<string>("explorer");
  const [fileTree, setFileTree] = useState<FileNode[]>(INITIAL_FILES);
  const initialMainPy = INITIAL_FILES[0].children![0].children![0].content || "";
  const [openFiles, setOpenFiles] = useState<FileNode[]>([
    {
      name: "main.py",
      path: "services/api/main.py",
      type: "file",
      language: "python",
      content: initialMainPy,
      savedContent: initialMainPy,
    },
  ]);
  const [activeFilePath, setActiveFilePath] = useState<string>("services/api/main.py");
  const [editorContent, setEditorContent] = useState<string>(initialMainPy);
  const [autoSave, setAutoSave] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dirtyCloseTarget, setDirtyCloseTarget] = useState<string | null>(null);

  const [autopilot, setAutopilot] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gemini-flash-latest");
  // Bring-Your-Own custom AI providers (stored only in this browser).
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showProvidersModal, setShowProvidersModal] = useState(false);
  // AI autocomplete (ghost-text inline completions)
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
  const completionCfgRef = useRef<{ enabled: boolean; model_id: string; provider: any }>({
    enabled: true,
    model_id: "gemini-flash-latest",
    provider: null,
  });
  const activeFilePathRef = useRef<string>("");
  const diagTimerRef = useRef<any>(null);

  const [projectRoot, setProjectRoot] = useState<string | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [intakeIdeas, setIntakeIdeas] = useState<
    Array<{ id: string; project_name: string; status: string }>
  >([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<
    Array<{ name: string; path: string }>
  >([]);
  const [ideaStats, setIdeaStats] = useState<{ pending: number; synced: number; total: number }>({
    pending: 0,
    synced: 0,
    total: 0,
  });
  const prevPendingRef = useRef<number | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReviewFile | null>(null);
  const [pendingEditQueue, setPendingEditQueue] = useState<PendingReviewFile[]>([]);
  const [diffSideBySide, setDiffSideBySide] = useState(true);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    "task-M1-0": true,
    "task-M1-1": true,
  });
  const [planApproved, setPlanApproved] = useState(false);

  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightDock, setShowRightDock] = useState(true);
  const [showBottomTerminal, setShowBottomTerminal] = useState(true);
  const [terminalTab, setTerminalTab] = useState<"terminal" | "preview" | "problems" | "output">("terminal");
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [runningTests, setRunningTests] = useState(false);
  // Cmd+K inline edit
  const monacoRef = useRef<any>(null);
  const inlineSelRef = useRef<string>("");
  const [inlineEditOpen, setInlineEditOpen] = useState(false);
  const [inlineEditPrompt, setInlineEditPrompt] = useState("");
  const [inlineEditBusy, setInlineEditBusy] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState<Array<{ id: string; title: string; shell: "powershell" | "bash" | "cmd" | "wsl" }>>([
    { id: "term-1", title: "1: powershell", shell: "powershell" },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("term-1");
  const [isSplitTerminal, setIsSplitTerminal] = useState(false);
  const [showShellDropdown, setShowShellDropdown] = useState(false);
  const [showNewShellDropdown, setShowNewShellDropdown] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const editorRef = useRef<any>(null);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [formatOnSave, setFormatOnSave] = useState(false);
  const [autoApprovePatches, setAutoApprovePatches] = useState(false);
  const [autopilotMode, setAutopilotMode] = useState<"guided" | "autonomous" | "strict">("guided");
  const [terminalFontSize, setTerminalFontSize] = useState(13);
  const [terminalCursorBlink, setTerminalCursorBlink] = useState(true);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectionCount, setSelectionCount] = useState(0);
  const [tabSize, setTabSize] = useState(4);

  const [leftSidebarWidth, setLeftSidebarWidth] = useState(260);
  const [rightDockWidth, setRightDockWidth] = useState(360);
  const [bottomTerminalHeight, setBottomTerminalHeight] = useState(208);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.min(Math.max(e.clientX - 48, 160), 520);
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 240), 620);
        setRightDockWidth(newWidth);
      } else if (isResizingBottom) {
        const newHeight = Math.min(Math.max(window.innerHeight - e.clientY - 24, 90), 550);
        setBottomTerminalHeight(newHeight);
      }
    };
    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setIsResizingBottom(false);
    };
    if (isResizingLeft || isResizingRight || isResizingBottom) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = isResizingBottom ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingLeft, isResizingRight, isResizingBottom]);

  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; text: string }>>([]);

  const [gitBranch, setGitBranch] = useState("main*");
  const [commitMessage, setCommitMessage] = useState("");
  const [changedFiles, setChangedFiles] = useState<string[]>(["services/api/main.py", "services/api/routes.py"]);

  const [certifyCountry, setCertifyCountry] = useState("nigeria");
  const [certifyResult, setCertifyResult] = useState<any>(null);
  const [certifying, setCertifying] = useState(false);

  const [grantSearch, setGrantSearch] = useState("");
  const [selectedGrant, setSelectedGrant] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(false);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorMinimap, setEditorMinimap] = useState(true);
  const [fontLigatures, setFontLigatures] = useState(true);

  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeTab, setIntakeTab] = useState<"concept" | "tech" | "features">("concept");
  const [ideaForm, setIdeaForm] = useState<BusinessIdeaForm>(DEFAULT_IDEA);
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [newIntegrationInput, setNewIntegrationInput] = useState("");

  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [blueprintTab, setBlueprintTab] = useState<"overview" | "arch" | "data" | "modules" | "milestones" | "json">("overview");
  const [blueprintData, setBlueprintData] = useState<BlueprintData | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptPlaceholder, setPromptPlaceholder] = useState("");
  const [promptInputValue, setPromptInputValue] = useState("");
  const [promptCallback, setPromptCallback] = useState<((val: string) => void) | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const openPrompt = (title: string, placeholder: string, cb: (val: string) => void) => {
    setPromptTitle(title);
    setPromptPlaceholder(placeholder);
    setPromptInputValue("");
    setPromptCallback(() => cb);
    setShowPromptModal(true);
  };

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setShowAlertModal(true);
  };
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false);
  const [editedBlueprintSummary, setEditedBlueprintSummary] = useState("");
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [blueprintRaw, setBlueprintRaw] = useState<any>(null);
  const [swarmAgents, setSwarmAgents] = useState<any[]>([]);
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [kycSessionId, setKycSessionId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<"idle" | "pending_scan" | "scanned" | "verified">("idle");
  const [kycCountry, setKycCountry] = useState("Nigeria");
  const [kycIdType, setKycIdType] = useState("National ID / NIN");
  const [kycAuditHash, setKycAuditHash] = useState<string | null>(null);

  const [activeLiveTask, setActiveLiveTask] = useState<string>("Ready for concept intake or code edit");
  const [activeLiveAgent, setActiveLiveAgent] = useState<string>("geezcodE Copilot");
  const [liveProgress, setLiveProgress] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(1240);
  const [dockMessages, setDockMessages] = useState<AiDockMessage[]>([
    {
      id: "msg-1",
      sender: "agent",
      agentName: "geezcodE Copilot",
      text: "Hi — I'm geezcodE Copilot. Ask me about the file you're editing, or tell me what to build or change and I'll propose an edit you can review and apply. What are we working on?",
      timestamp: "Just now",
    },
  ]);
  const [dockInput, setDockInput] = useState("");
  // @-mention: extra workspace files attached as Copilot context
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionedPaths, setMentionedPaths] = useState<string[]>([]);
  // Codebase-aware retrieval (pgvector via the vector-store service)
  const [codebaseIndexed, setCodebaseIndexed] = useState(false);
  const [codebaseRetrieval, setCodebaseRetrieval] = useState(false);
  const [indexingCodebase, setIndexingCodebase] = useState(false);
  const dockEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dockEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dockMessages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const proj = params.get("projectName");
      if (proj) {
        const cleanTree = generateCleanWorkspace(proj);
        const slug = proj.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const mainPyPath = `services/${slug}/main.py`;
        const mainPyContent = cleanTree[0].children![0].children![0].content || "";
        setFileTree(cleanTree);
        setOpenFiles([{ name: "main.py", path: mainPyPath, type: "file", language: "python", content: mainPyContent }]);
        setActiveFilePath(mainPyPath);
        setEditorContent(mainPyContent);
        setIdeaForm((prev) => ({ ...prev, projectName: proj, oneLiner: `Sovereign full-stack project for ${proj}` }));
        setTerminalLogs((prev) => [...prev, `[Bridge] Successfully synchronized clean workspace for project '${proj}' from Architect Intake bridge.`]);
        setDockMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            sender: "agent",
            agentName: "Chief Architect",
            text: `Welcome to geezcodE IDE! Your clean workspace for '${proj}' has been successfully generated and synchronized from your Architect Intake form.`,
            timestamp: "Just now",
          },
        ]);
      }
    }
  }, []);

  const { sendPatchReview, isConnected: isWsConnected } = useAgentStream({
    sessionId: sessionId || undefined,
    onCodeChunk: (filePath, chunk) => {
      setEditorContent((prev) => prev + chunk);
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === filePath ? { ...f, content: (f.content || "") + chunk } : f))
      );
    },
    onPatchReview: (patch) => {
      const existing = findFileContentByPath(fileTree, patch.filePath) || "";
      setPendingReview({
        filePath: patch.filePath,
        diff: patch.diff || "+ Live streamed changes from swarm",
        originalContent: patch.originalContent ?? existing,
        newContent: patch.newContent,
        agentName: patch.agentName || activeLiveAgent,
        milestoneId: patch.milestoneId || "M1",
      });
      setTerminalLogs((prev) => [
        ...prev,
        `[Swarm Stream] Received live patch proposal for '${patch.filePath}' from ${patch.agentName || "Agent"}. Opening Visual Diff Editor.`,
      ]);
      showToast(`Swarm patch proposed: ${patch.filePath}`);
    },
    onAgentAction: (agentName, title, detail) => {
      setTerminalLogs((prev) => [...prev, `[${agentName}] ${title}: ${detail}`]);
      setActiveLiveAgent(agentName);
      setActiveLiveTask(`${title}: ${detail}`);
    },
    onPhaseChange: (phase, prog) => {
      setActiveLiveTask(`Phase: ${phase} (${prog}%)`);
      setLiveProgress(prog);
    },
  });

  const handleCreateKycSession = useCallback(async () => {
    const sessId = `kyc_sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setKycSessionId(sessId);
    setKycStatus("pending_scan");
    setKycAuditHash(null);
    try {
      const res = await fetch(`${API_BASE}/v1/kyc/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: kycCountry, id_type: kycIdType }),
      });
      if (res.ok) {
        const data = await res.json();
        setKycSessionId(data.data.session_id);
      }
    } catch {
      // Offline fallback
    }
  }, [kycCountry, kycIdType]);

  const handleSimulateKyc = useCallback(async () => {
    if (!kycSessionId) return;
    setKycStatus("scanned");
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/kyc/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: kycSessionId, country: kycCountry, id_type: kycIdType }),
        });
        if (res.ok) {
          const data = await res.json();
          setKycAuditHash(data.data.audit_hash);
        } else {
          setKycAuditHash("0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "...");
        }
      } catch {
        setKycAuditHash("0x" + Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("") + "...");
      }
      setKycStatus("verified");
      setTerminalLogs((prev) => [...prev, `[KYC] Verification complete — Session: ${kycSessionId}`]);
    }, 1800);
  }, [kycSessionId, kycCountry, kycIdType]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const q = searchQuery.trim();
      let found: Array<{ file: string; line: number; text: string }> = [];
      try {
        const res = await fetch(`${API_BASE}/v1/workspace/search?q=${encodeURIComponent(q)}`, {
          headers: { ...authHeaders() },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            found = json.data;
          }
        }
      } catch {
        // fallback to tree
      }

      if (found.length === 0) {
        const needle = q.toLowerCase();
        function recurse(list: FileNode[]) {
          for (const node of list) {
            if (node.type === "file" && node.content) {
              const lines = node.content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(needle)) {
                  found.push({
                    file: node.path,
                    line: i + 1,
                    text: lines[i].trim().slice(0, 160),
                  });
                  if (found.length >= 100) return;
                }
              }
            }
            if (node.children) recurse(node.children);
          }
        }
        recurse(fileTree);
      }

      if (!cancelled) setSearchResults(found);
    };
    const t = setTimeout(run, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchQuery, fileTree]);

  const fetchWorkspaceTree = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/tree${projectRoot ? `?path=${encodeURIComponent(projectRoot)}` : ""}`);
      if (!res.ok) return;
      const json = await res.json();
      const nodes: FileNode[] = Array.isArray(json.data) ? json.data : [];
      if (nodes.length > 0) setFileTree(nodes);
    } catch {
      // keep current tree on failure
    }
  }, [projectRoot]);

  const loadIntakeIdeas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/intake/ideas?limit=25`, { headers: { ...authHeaders() } });
      if (res.ok) setIntakeIdeas(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadWorkspaceProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/projects`, { headers: { ...authHeaders() } });
      if (res.ok) {
        const json = await res.json();
        setWorkspaceProjects(Array.isArray(json.projects) ? json.projects : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadIntakeIdeas();
    loadWorkspaceProjects();
  }, [loadIntakeIdeas, loadWorkspaceProjects]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2400);
  }, []);

  // Poll the FIFO idea-stock counts (authoritative, from the intake DB) every 15s.
  // Surfaces a live badge + a notification when new applicant ideas arrive.
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/v1/intake/ideas/stats`, { headers: { ...authHeaders() } });
        if (!res.ok) return;
        const json = await res.json();
        const d = json.data || {};
        if (cancelled) return;
        const pending = Number(d.pending) || 0;
        const synced = Number(d.synced) || 0;
        setIdeaStats({ pending, synced, total: Number(d.total) || 0 });
        if (prevPendingRef.current !== null && pending > prevPendingRef.current) {
          const delta = pending - prevPendingRef.current;
          showToast(`${delta} new idea${delta === 1 ? "" : "s"} in the intake queue`);
          setDockMessages((prev) => [
            ...prev,
            {
              id: `intake-${Date.now()}`,
              sender: "system",
              text: `${delta} new applicant idea${delta === 1 ? "" : "s"} arrived in the FIFO intake stock — ${pending} pending, ${synced} synced.`,
              timestamp: "Just now",
            },
          ]);
          loadIntakeIdeas();
        }
        prevPendingRef.current = pending;
      } catch {
        /* ignore transient poll errors */
      }
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [showToast, loadIntakeIdeas]);

  const startProjectFromIdea = async (ideaId: string) => {
    try {
      const res = await fetch(`${API_BASE}/v1/intake/ideas/${ideaId}/start-project`, {
        method: "POST",
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.path) {
        setProjectRoot(json.path);
        setShowNewProject(false);
        await loadWorkspaceProjects();
        fetchWorkspaceTree();
      }
    } catch { /* ignore */ }
  };

  const fetchGitStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/git/status`);
      if (!res.ok) return;
      const json = await res.json();
      const d = json.data;
      if (d) {
        setGitBranch(d.branch || "main");
        setChangedFiles(Array.isArray(d.changed_files) ? d.changed_files : []);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/git/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commitMessage.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setCommitMessage("");
        fetchGitStatus();
        setTerminalLogs((prev) => [...prev, `[git] committed ${json.data?.commit_sha ?? ""}`]);
      } else {
        setTerminalLogs((prev) => [...prev, `[git] ${json.detail || "commit failed"}`]);
      }
    } catch {
      setTerminalLogs((prev) => [...prev, "[git] workspace service unreachable"]);
    }
  }, [commitMessage, fetchGitStatus]);

  useEffect(() => {
    fetchWorkspaceTree();
    fetchGitStatus();
  }, [fetchWorkspaceTree, fetchGitStatus]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/orchestrate/models`, { headers: { ...authHeaders() } });
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json.data?.models) ? json.data.models : [];
      if (list.length > 0) setModels(list.map((m: any) => ({ id: m.id, name: m.name })));
    } catch {
      // keep default model list
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);
  const isFileDirty = useCallback((f: FileNode) => {
    const current = f.content ?? "";
    const saved = f.savedContent ?? f.content ?? "";
    return current !== saved;
  }, []);

  const activeFileNode = openFiles.find((f) => f.path === activeFilePath);
  const isActiveDirty = Boolean(activeFileNode && isFileDirty(activeFileNode));
  const dirtyFilesCount = openFiles.filter(isFileDirty).length;

  const handleFileSelect = async (node: FileNode) => {
    if (node.type !== "file") return;
    const existing = openFiles.find((f) => f.path === node.path);
    if (existing) {
      setActiveFilePath(node.path);
      setEditorContent(existing.content || "");
      return;
    }

    let content = node.content;
    if (content === undefined) {
      try {
        const res = await fetch(`${API_BASE}/v1/workspace/file?path=${encodeURIComponent(node.path)}`, {
          headers: { ...authHeaders() },
        });
        if (res.ok) {
          const json = await res.json();
          content = json.data?.content ?? "";
        } else {
          content = `// Unable to load ${node.path}`;
        }
      } catch {
        content = `// Unable to load ${node.path}`;
      }
    }

    const newNode: FileNode = {
      ...node,
      content: content || "",
      savedContent: content || "",
    };
    setOpenFiles((prev) => [...prev, newNode]);
    setActiveFilePath(node.path);
    setEditorContent(content || "");
  };

  const executeCloseTab = useCallback((path: string) => {
    const filtered = openFiles.filter((f) => f.path !== path);
    setOpenFiles(filtered);
    if (activeFilePath === path) {
      if (filtered.length > 0) {
        const next = filtered[filtered.length - 1];
        setActiveFilePath(next.path);
        setEditorContent(next.content || "");
      } else {
        setActiveFilePath("");
        setEditorContent("");
      }
    }
    setDirtyCloseTarget(null);
  }, [openFiles, activeFilePath]);

  const handleCloseTabRequest = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const fileNode = openFiles.find((f) => f.path === path);
    if (fileNode && isFileDirty(fileNode)) {
      setDirtyCloseTarget(path);
      return;
    }
    executeCloseTab(path);
  }, [openFiles, isFileDirty, executeCloseTab]);

  const handleNewFile = () => {
    openPrompt("Create New File", "e.g. services/api/utils.py", async (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const initialText = "# New file\n";
      const newFile: FileNode = {
        name: trimmed.split("/").pop() || trimmed,
        path: trimmed,
        type: "file",
        content: initialText,
        savedContent: initialText,
      };
      // Persist to workspace disk
      try {
        await fetch(`${API_BASE}/v1/workspace/file`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ path: trimmed, content: initialText }),
        });
      } catch {
        // local fallback
      }
      setFileTree((prev) => [...prev, newFile]);
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFilePath(trimmed);
      setEditorContent(initialText);
      setTerminalLogs((prev) => [...prev, `[Filesystem] Created file: ${trimmed}`]);
      showToast(`Created ${trimmed}`);
    });
  };

  const handleNewFolder = () => {
    openPrompt("Create New Folder", "e.g. services/api/utils", (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const newDir: FileNode = {
        name: trimmed.split("/").pop() || trimmed,
        path: trimmed,
        type: "directory",
        isOpen: true,
        children: [],
      };
      setFileTree((prev) => [...prev, newDir]);
      setTerminalLogs((prev) => [...prev, `[Filesystem] Created directory: ${trimmed}`]);
      showToast(`Created folder ${trimmed}`);
    });
  };

  const handleSaveFile = useCallback(async (targetPath?: string) => {
    const path = targetPath || activeFilePath;
    if (!path) return;
    const targetNode = openFiles.find((f) => f.path === path);
    const contentToWrite = path === activeFilePath ? editorContent : (targetNode?.content ?? "");

    try {
      const res = await fetch(`${API_BASE}/v1/workspace/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ path, content: contentToWrite }),
      });
      if (res.ok) {
        setOpenFiles((prev) =>
          prev.map((f) => (f.path === path ? { ...f, content: contentToWrite, savedContent: contentToWrite } : f))
        );
        setFileTree((prev) => updateTreeContent(prev, path, contentToWrite));
        setTerminalLogs((prev) => [...prev, `[Filesystem] Saved to disk: ${path}`]);
        showToast(`Saved ${path}`);
        // Refresh diagnostics (real linter) for the just-saved buffer.
        void runDiagnostics(path, contentToWrite);
        return;
      }
    } catch {
      // offline fallback
    }

    setOpenFiles((prev) =>
      prev.map((f) => (f.path === path ? { ...f, content: contentToWrite, savedContent: contentToWrite } : f))
    );
    setFileTree((prev) => updateTreeContent(prev, path, contentToWrite));
    setTerminalLogs((prev) => [...prev, `[Filesystem (local)] Saved ${path}`]);
    showToast(`Saved ${path} (local)`);
  }, [activeFilePath, editorContent, openFiles, showToast]);

  const handleSaveAll = useCallback(async () => {
    const dirtyList = openFiles.filter(isFileDirty);
    if (dirtyList.length === 0) {
      showToast("All files are saved");
      return;
    }
    for (const f of dirtyList) {
      await handleSaveFile(f.path);
    }
    showToast(`Saved ${dirtyList.length} files`);
  }, [openFiles, isFileDirty, handleSaveFile, showToast]);

  // Auto-Save effect (debounced at 1.5s)
  useEffect(() => {
    if (!autoSave || !activeFilePath) return;
    const activeNode = openFiles.find((f) => f.path === activeFilePath);
    if (!activeNode || !isFileDirty(activeNode)) return;

    const timer = setTimeout(() => {
      handleSaveFile(activeFilePath);
    }, 1500);

    return () => clearTimeout(timer);
  }, [autoSave, editorContent, activeFilePath, openFiles, isFileDirty, handleSaveFile]);

  // Global keyboard shortcuts (Ctrl+S, Ctrl+K S)
  useEffect(() => {
    let chordK = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        chordK = true;
        setTimeout(() => { chordK = false; }, 1200);
        return;
      }
      if (chordK && e.key.toLowerCase() === "s") {
        e.preventDefault();
        chordK = false;
        handleSaveAll();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveFile, handleSaveAll]);

  const handleSearchResultClick = useCallback(async (result: { file: string; line: number; text: string }) => {
    let targetNode = openFiles.find((f) => f.path === result.file);
    if (!targetNode) {
      const foundInTree = findNodeInTree(fileTree, result.file);
      let content = foundInTree?.content;
      if (content === undefined) {
        try {
          const res = await fetch(`${API_BASE}/v1/workspace/file?path=${encodeURIComponent(result.file)}`, {
            headers: { ...authHeaders() },
          });
          if (res.ok) {
            const json = await res.json();
            content = json.data?.content || "";
          } else {
            content = `// Unable to load ${result.file}`;
          }
        } catch {
          content = `// Unable to load ${result.file}`;
        }
      }
      targetNode = {
        name: result.file.split("/").pop() || result.file,
        path: result.file,
        type: "file",
        content,
        savedContent: content,
      };
      setOpenFiles((prev) => [...prev, targetNode!]);
    }
    setActiveFilePath(result.file);
    setEditorContent(targetNode.content || "");

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(result.line);
        editorRef.current.setPosition({ lineNumber: result.line, column: 1 });
        editorRef.current.focus();
      }
    }, 80);
  }, [openFiles, fileTree]);

  const handleSaveAs = () => {
    openPrompt("Save As", "e.g. services/api/main_copy.py", async (newPath) => {
      const trimmed = newPath.trim();
      if (!trimmed) return;
      const newFile: FileNode = {
        name: trimmed.split("/").pop() || trimmed,
        path: trimmed,
        type: "file",
        content: editorContent,
        savedContent: editorContent,
      };
      try {
        await fetch(`${API_BASE}/v1/workspace/file`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ path: trimmed, content: editorContent }),
        });
      } catch {
        // fallback
      }
      setFileTree((prev) => [...prev, newFile]);
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFilePath(trimmed);
      setTerminalLogs((prev) => [...prev, `[Filesystem] Saved file as: ${trimmed}`]);
      showToast(`Saved as ${trimmed}`);
    });
  };

  const handleDeleteFile = () => {
    if (!activeFilePath) return;
    openPrompt("Delete File", `Type path to confirm deletion: ${activeFilePath}`, async (val) => {
      if (val.trim() !== activeFilePath) {
        showAlert("Deletion cancelled: path did not match.");
        return;
      }
      try {
        await fetch(`${API_BASE}/v1/workspace/file?path=${encodeURIComponent(activeFilePath)}`, {
          method: "DELETE",
          headers: { ...authHeaders() },
        });
      } catch {
        // offline fallback
      }
      const filteredTree = fileTree.filter((f) => f.path !== activeFilePath);
      setFileTree(filteredTree);
      executeCloseTab(activeFilePath);
      setTerminalLogs((prev) => [...prev, `[Filesystem] Deleted file: ${activeFilePath}`]);
      showToast(`Deleted ${activeFilePath}`);
    });
  };

  const handleTerminalCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalLogs((prev) => [...prev, `geezcodE@ide:~$ ${cmd}`]);
    setTerminalInput("");
    if (cmd === "clear") {
      setTerminalLogs([]);
      return;
    }
    if (cmd === "help") {
      setTerminalLogs((prev) => [...prev, "Available commands:", "  clear                     Clear terminal", "  <any shell command>       Runs in the workspace root (git status, dir, pytest, ...)"]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ command: cmd }),
      });
      const json = await res.json();
      const d = json.data;
      if (d) {
        const out = ((d.stdout || "") + (d.stderr || "")).trim();
        if (out) setTerminalLogs((prev) => [...prev, out]);
        if (d.exit_code !== undefined && d.exit_code !== 0) {
          setTerminalLogs((prev) => [...prev, `[exit code ${d.exit_code}]`]);
        }
      }
    } catch {
      setTerminalLogs((prev) => [...prev, "[terminal] workspace service unreachable"]);
    }
  };

  const runTerminalCommand = async (cmd: string) => {
    setTerminalTab("terminal");
    setShowBottomTerminal(true);
    setTerminalLogs((prev) => [...prev, `geezcodE@ide:~$ ${cmd}`]);
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ command: cmd }),
      });
      const json = await res.json();
      const d = json.data;
      if (d) {
        const out = ((d.stdout || "") + (d.stderr || "")).trim();
        if (out) setTerminalLogs((prev) => [...prev, out]);
        if (d.exit_code !== undefined && d.exit_code !== 0) {
          setTerminalLogs((prev) => [...prev, `[exit code ${d.exit_code}]`]);
        }
      }
    } catch {
      setTerminalLogs((prev) => [...prev, "[terminal] workspace service unreachable"]);
    }
  };

  // Run a command in the workspace and return its captured output (also echoed to
  // the terminal). Backs the integrated run/test + diagnostics flow.
  const runAndCapture = async (
    cmd: string,
  ): Promise<{ stdout: string; stderr: string; exit_code: number }> => {
    setTerminalTab("terminal");
    setShowBottomTerminal(true);
    setTerminalLogs((prev) => [...prev, `geezcodE@ide:~$ ${cmd}`]);
    try {
      const res = await fetch(`${API_BASE}/v1/workspace/terminal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ command: cmd }),
      });
      const json = await res.json();
      const d = json.data || {};
      const out = ((d.stdout || "") + (d.stderr || "")).trim();
      if (out) setTerminalLogs((prev) => [...prev, out]);
      if (d.exit_code !== undefined && d.exit_code !== 0) {
        setTerminalLogs((prev) => [...prev, `[exit code ${d.exit_code}]`]);
      }
      return { stdout: d.stdout || "", stderr: d.stderr || "", exit_code: d.exit_code ?? 0 };
    } catch {
      setTerminalLogs((prev) => [...prev, "[terminal] workspace service unreachable"]);
      return { stdout: "", stderr: "workspace service unreachable", exit_code: -1 };
    }
  };

  // Parse pytest failures and Python tracebacks from run output into structured
  // problems (file + line + message) that populate the Problems panel.
  const parseDiagnostics = (output: string): ProblemItem[] => {
    const norm = (p: string) => p.replace(/^\.\//, "").replace(/^\/+/, "").trim();
    const out: ProblemItem[] = [];
    const lines = output.split("\n");
    const frameRe = /File "([^"]+)", line (\d+)/;
    const pytestRe = /^(.+\.py):(\d+):\s*(.*)$/;
    const excRe = /^([A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception|Warning)):\s*(.*)$/;
    let lastFrame: { file: string; line: number } | null = null;
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      const fm = line.match(frameRe);
      if (fm) {
        lastFrame = { file: norm(fm[1]), line: parseInt(fm[2], 10) };
        continue;
      }
      const pm = line.match(pytestRe);
      if (pm && !line.trim().startsWith("File ")) {
        out.push({ file: norm(pm[1]), line: parseInt(pm[2], 10), message: pm[3] || "Test failure", severity: "error", source: "pytest" });
        continue;
      }
      const em = line.match(excRe);
      if (em && lastFrame) {
        out.push({ file: lastFrame.file, line: lastFrame.line, message: `${em[1]}: ${em[2]}`.trim(), severity: "error", source: "runtime" });
        lastFrame = null;
      }
    }
    const seen = new Set<string>();
    return out.filter((p) => {
      const k = `${p.file}:${p.line}:${p.message}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const handleRunActiveFile = async () => {
    if (!activeFilePath) return;
    let cmd: string;
    if (activeFilePath.endsWith(".py")) cmd = `python ${activeFilePath}`;
    else if (activeFilePath.endsWith(".js") || activeFilePath.endsWith(".ts")) cmd = `node ${activeFilePath}`;
    else {
      runTerminalCommand(`cat ${activeFilePath}`);
      return;
    }
    const { stdout, stderr } = await runAndCapture(cmd);
    const diags = parseDiagnostics(`${stdout}\n${stderr}`);
    setProblems(diags);
    if (diags.length) {
      setTerminalTab("problems");
      showToast(`${diags.length} problem${diags.length === 1 ? "" : "s"} found`);
    }
  };

  const handleRunTests = async () => {
    setRunningTests(true);
    const { stdout, stderr, exit_code } = await runAndCapture("pytest -v");
    const diags = parseDiagnostics(`${stdout}\n${stderr}`);
    setProblems(diags);
    if (diags.length) {
      setTerminalTab("problems");
      showToast(`${diags.length} problem${diags.length === 1 ? "" : "s"} found`);
    } else if (exit_code === 0) {
      showToast("All tests passed — no problems");
    }
    setRunningTests(false);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && (e.key === "F1" || (e.shiftKey && e.key.toLowerCase() === "p"))) {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.key === "F1") {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (isCtrlOrMeta && e.key === "," && !e.shiftKey) {
        e.preventDefault();
        setShowSettingsModal(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setShowIntakeModal(true);
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        handleNewFile();
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveFile();
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        setShowQuickOpen(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setActiveActivity("explorer");
        setShowLeftSidebar(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setActiveActivity("search");
        setShowLeftSidebar(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setActiveActivity("git");
        setShowLeftSidebar(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setActiveActivity("plan");
        setShowLeftSidebar(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setActiveActivity("swarm");
        setShowLeftSidebar(true);
      } else if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setTerminalTab("preview");
        setShowBottomTerminal(true);
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "b" && !e.altKey) {
        e.preventDefault();
        setShowLeftSidebar((prev) => !prev);
      } else if (isCtrlOrMeta && e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setShowRightDock((prev) => !prev);
      } else if (isCtrlOrMeta && e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setWordWrap((prev) => !prev);
      } else if (isCtrlOrMeta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setShowBottomTerminal((prev) => !prev);
      } else if (isCtrlOrMeta && e.key === "`") {
        e.preventDefault();
        setTerminalTab("terminal");
        setShowBottomTerminal(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeFilePath, editorContent, autoSave, wordWrap]);

  const generateOfflineBlueprintFallback = () => {
    const slug = (ideaForm.projectName || "Sovereign").toLowerCase().replace(/\s+/g, "-");
    const fallbackBp: BlueprintData = {
      projectName: ideaForm.projectName || "Sovereign Agritech",
      summary: ideaForm.oneLiner || "Autonomous sovereign startup platform.",
      completeness: 100,
      techStack: {
        languages: ["Python 3.12", "TypeScript 5.5", "SQL"],
        frameworks: ["FastAPI", "Next.js 15 App Router", "Pydantic v2"],
        databases: ["PostgreSQL 16 + pgvector", "Redis 7"],
        infra: ["GCP africa-south1", "Cloud Run", "Docker"],
        keyLibraries: ["argon2-cffi", "pyjwt", "httpx", "structlog", "zustand"],
        rationale: "Engineered for sub-second latency, offline-first resilience, and zero-question execution.",
      },
      systemArchitecture:
        "+---------------------------------------------------------------+\n|                      Client Applications                      |\n|      [ Next.js 15 Web App ]   <--->   [ Mobile / USSD ]       |\n+---------------------------------------------------------------+\n                               |\n                               v\n+---------------------------------------------------------------+\n|                     FastAPI Gateway & API                     |\n+---------------------------------------------------------------+\n         |                     |                     |\n         v                     v                     v\n+------------------+  +------------------+  +-------------------+\n|  PostgreSQL 16   |  |     Redis 7      |  | Payment Adapters  |\n+------------------+  +------------------+  +-------------------+",
      dataFlow: "Journey 1: Onboarding -> SMS OTP -> JWT token -> Account active.\nJourney 2: Transaction -> Schema validation -> M-Pesa STK Push -> Webhook settlement.\nJourney 3: Audit -> MinHash IP verification -> SHA-256 ledger proof generated.",
      directoryStructure: `${slug}/\n  apps/\n    web/ (Next.js 15 App Router)\n  services/\n    api/ (FastAPI Core Backend)\n    db/ (PostgreSQL & pgvector Schemas)\n    integrations/ (M-Pesa, Paystack, SMS)\n  tests/ (Automated AST QA Suite)\n  docker-compose.yml\n  pyproject.toml`,
      databaseSchema: {
        users: ["id (UUID)", "email (VARCHAR)", "phone (VARCHAR)", "created_at (TIMESTAMPTZ)"],
        transactions: ["id (UUID)", "amount (NUMERIC)", "status (VARCHAR)", "reference (VARCHAR)"],
        audit_logs: ["id (UUID)", "action (VARCHAR)", "hash_chain (VARCHAR)", "timestamp (TIMESTAMPTZ)"],
      },
      apiDesign: [
        { method: "POST", path: "/v1/auth/register", summary: "User registration & OTP verification" },
        { method: "POST", path: "/v1/auth/login", summary: "Argon2id + JWT authentication" },
        { method: "POST", path: "/v1/transactions/originate", summary: "Trigger M-Pesa / Paystack payment" },
        { method: "POST", path: "/v1/webhooks/payment", summary: "HMAC-SHA256 signed payment webhook callback" },
      ],
      authDesign: "Argon2id password hashing with stateless short-lived JWT access tokens and database-backed refresh tokens.",
      securityConsiderations: "OWASP Top 10 mitigation: Parameterized SQL, HMAC-SHA256 webhook signatures, TLS 1.3 encryption, and Pydantic sanitization.",
      deploymentArchitecture: "Containerized Docker images targeting Google Cloud Run in Johannesburg (africa-south1).",
      coreModules: [
        { id: "M1", name: "Core API & Domain Engine", purpose: "FastAPI microservice managing business logic and database state.", responsibilities: ["REST API Endpoints", "Database CRUD", "Workflow execution"], files: ["services/api/main.py", "services/api/routes.py"], acceptance: ["RFC 7807 error envelopes", "Pydantic validation"] },
        { id: "M2", name: "Sovereign Web Frontend", purpose: "Next.js 15 App Router web application with Monaco IDE integration.", responsibilities: ["State management", "Real-time WebSocket telemetry", "Responsive layout"], files: ["apps/web/src/app/page.tsx"], acceptance: ["SSR passes with 0 hydration errors"] },
        { id: "M3", name: "Telecom & Payment Adapters", purpose: "Integrations for M-Pesa, Paystack, and Africa's Talking SMS/USSD.", responsibilities: ["STK Push payment triggers", "Signed webhook callbacks", "SMS queues"], files: ["services/integrations/mpesa.py", "services/integrations/paystack.py"], acceptance: ["Signed webhooks validated cryptographically"] },
      ],
      milestones: [
        { id: "MS1", name: "Repository Foundation & Config", objective: "Initialize pyproject.toml, Docker Compose, and environment settings.", tasks: ["Set up dependencies", "Create database schema"], filesToCreate: ["pyproject.toml", "docker-compose.yml"], definitionsOfDone: ["Docker Compose boots cleanly"] },
        { id: "MS2", name: "Domain API & Business Workflows", objective: "Implement FastAPI routers, Pydantic models, and database queries.", tasks: ["Write CRUD endpoints", "Add tracing middleware"], filesToCreate: ["services/api/main.py", "services/api/routes.py"], definitionsOfDone: ["FastAPI returns 200 OK"] },
        { id: "MS3", name: "Frontend Dashboard & WebSocket Sync", objective: "Build Next.js 15 App Router dashboard with live telemetry.", tasks: ["Create page templates", "Connect Zustand store"], filesToCreate: ["apps/web/src/app/page.tsx"], definitionsOfDone: ["Build prerenders with 0 errors"] },
        { id: "MS4", name: "Payment Gateway & Webhook Security", objective: "Integrate M-Pesa & Paystack payment handlers.", tasks: ["Write payment handlers", "Verify HMAC-SHA256 signatures"], filesToCreate: ["services/integrations/mpesa.py"], definitionsOfDone: ["Webhooks verified"] },
        { id: "MS5", name: "QA AST Testing & Compliance Audit", objective: "Run automated AST syntax verification and Startup Act audit.", tasks: ["Execute AST scanner", "Issue compliance certificate"], filesToCreate: ["tests/test_api.py", "README.md"], definitionsOfDone: ["100% tests pass"] },
      ],
      buildOrder: ["MS1", "MS2", "MS3", "MS4", "MS5"],
      risksAndAssumptions: [
        "Assumption: Users have intermittent 3G/4G connectivity, requiring offline sync resilience.",
        "Risk: Local payment gateway API latency spikes; mitigated by asynchronous background worker task queues.",
      ],
      generatedBy: "geezcodE:ZeroQuestionArchitect",
    };
    setBlueprintData(fallbackBp);
    setEditedBlueprintSummary(fallbackBp.summary);
    setJsonText(JSON.stringify(fallbackBp, null, 2));
  };

  const handleGenerateBlueprint = async (fromForm = false) => {
    setIsGenerating(true);
    if (fromForm) setShowIntakeModal(false);
    setActiveLiveAgent("Architect");
    setActiveLiveTask("Formulating zero-question full-stack architectural blueprint...");
    setLiveProgress(25);

    try {
      const payload = fromForm
        ? { idea: ideaForm, model_id: selectedModel }
        : { concept: ideaForm.oneLiner, model_id: selectedModel };
      const res = await fetch(`${API_BASE}/v1/builder/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        const bp = json.data.blueprint;
        setBlueprintRaw(bp);
        const normalizedBp: BlueprintData = {
          projectName: bp.project_name || ideaForm.projectName,
          summary: bp.summary || `Sovereign full-stack blueprint for ${ideaForm.projectName}`,
          completeness: bp.completeness || 100,
          techStack: bp.tech_stack || {},
          systemArchitecture: bp.system_architecture || "",
          dataFlow: bp.data_flow || "",
          directoryStructure: bp.directory_structure || "",
          databaseSchema: bp.database_schema || {},
          apiDesign: bp.api_design || [],
          authDesign: bp.auth_design || "",
          securityConsiderations: bp.security_considerations || "",
          deploymentArchitecture: bp.deployment_architecture || "",
          coreModules: bp.core_modules || [],
          milestones: bp.milestones || [],
          buildOrder: bp.build_order || [],
          risksAndAssumptions: bp.risks_and_assumptions || [],
          generatedBy: bp.generated_by || "geezcodE:architect",
        };
        setBlueprintData(normalizedBp);
        setEditedBlueprintSummary(normalizedBp.summary);
        setJsonText(JSON.stringify(normalizedBp, null, 2));
      } else {
        generateOfflineBlueprintFallback();
      }
    } catch {
      generateOfflineBlueprintFallback();
    } finally {
      setIsGenerating(false);
      setShowBlueprintModal(true);
      setLiveProgress(50);
      setDockMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "agent",
          agentName: "Architect",
          text: `Architectural blueprint formulated for '${ideaForm.projectName}'. Review the sections or approve to dispatch parallel sub-agent workers.`,
          thought: "Constructed microservice topology, PostgreSQL relational schemas, API endpoint shapes, and 5 sequential build milestones.",
          timestamp: "Just now",
        },
      ]);
    }
  };

  // Apply one build-status snapshot (from either the WebSocket stream or an HTTP
  // poll) to the UI. Writes generated files to the workspace on completion.
  // Returns true when the build has reached a terminal state (complete/error).
  const applyBuildSnapshot = async (d: any, logRef: { lastLogLen: number }): Promise<boolean> => {
    if (!d || d.status === "not_found") return false;

    if (typeof d.progress === "number") setLiveProgress(d.progress);
    setActiveLiveAgent("Parallel Builder");
    if (d.current) setActiveLiveTask(d.current);
    if (Array.isArray(d.sub_agents) && d.sub_agents.length) setSwarmAgents(d.sub_agents);
    if (Array.isArray(d.log) && d.log.length > logRef.lastLogLen) {
      const fresh = d.log.slice(logRef.lastLogLen);
      logRef.lastLogLen = d.log.length;
      setTerminalLogs((prev) => [...prev, ...fresh]);
    }

    if (d.status === "complete") {
      const files = Array.isArray(d.generated_files) ? d.generated_files : [];
      const ast = Array.isArray(d.test_results) && d.test_results[0] ? d.test_results[0] : null;
      for (const f of files) {
        if (!f?.path || typeof f.content !== "string") continue;
        try {
          await fetch(`${API_BASE}/v1/workspace/file`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ path: f.path, content: f.content }),
          });
        } catch {
          /* keep loading the rest */
        }
        setFileTree((prev) => {
          const exists = findFileContentByPath(prev, f.path) !== null;
          if (exists) return updateTreeContent(prev, f.path, f.content);
          return [
            ...prev,
            {
              name: f.path.split("/").pop() || f.path,
              path: f.path,
              type: "file" as const,
              language: getLanguage(f.path),
              content: f.content,
              savedContent: f.content,
            },
          ];
        });
      }
      setLiveProgress(100);
      setActiveLiveTask(`Build complete — ${files.length} files generated.`);
      setDockMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "agent",
          agentName: "Parallel Builder",
          text: `Build complete: ${files.length} file(s) generated and written to your workspace.${ast ? ` AST validation ${ast.passed ? "passed" : "failed"} across ${ast.files_scanned ?? 0} Python file(s).` : ""
            }`,
          filesModified: files.map((f: any) => f.path),
          timestamp: "Just now",
        },
      ]);
      showToast(`Build complete — ${files.length} files written`);
      fetchWorkspaceTree();
      setIsBuilding(false);
      return true;
    }

    if (d.status === "error") {
      setTerminalLogs((prev) => [...prev, `[Parallel Builder] Build error: ${d.error || "unknown"}`]);
      setActiveLiveTask("Build failed.");
      setDockMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}`, sender: "agent", agentName: "Parallel Builder", text: `Build failed: ${d.error || "unknown error"}`, timestamp: "Just now" },
      ]);
      setIsBuilding(false);
      return true;
    }
    return false;
  };

  // HTTP fallback: poll the real parallel-build job and stream its events. Shares
  // logRef with the WebSocket path so log lines aren't duplicated when we fail over.
  const pollBuildStatus = async (buildSessionId: string, logRef: { lastLogLen: number } = { lastLogLen: 0 }) => {
    for (let i = 0; i < 400; i++) {
      await new Promise((r) => setTimeout(r, 1800));
      let d: any;
      try {
        const res = await fetch(`${API_BASE}/v1/builder/status/${buildSessionId}`, { headers: { ...authHeaders() } });
        if (!res.ok) continue;
        d = (await res.json())?.data || {};
      } catch {
        continue;
      }
      const done = await applyBuildSnapshot(d, logRef);
      if (done) return;
    }
    setTerminalLogs((prev) => [...prev, "[Parallel Builder] Stopped watching build after timeout — it may still be running."]);
    setIsBuilding(false);
  };

  // Preferred path: stream real build progress over a WebSocket (true server push,
  // backed by the durable store so it works across instances). Falls back to HTTP
  // polling if the socket can't open or closes before the build finishes.
  const streamBuildStatus = async (buildSessionId: string) => {
    const logRef = { lastLogLen: 0 };
    if (!WS_BASE || typeof WebSocket === "undefined") {
      await pollBuildStatus(buildSessionId, logRef);
      return;
    }
    await new Promise<void>((resolve) => {
      let settled = false;
      let opened = false;
      let ws: WebSocket | null = null;

      const finish = () => {
        if (settled) return;
        settled = true;
        try { ws?.close(); } catch { /* noop */ }
        resolve();
      };
      const failover = async () => {
        if (settled) return;
        settled = true;
        try { ws?.close(); } catch { /* noop */ }
        await pollBuildStatus(buildSessionId, logRef);
        resolve();
      };

      const connectTimer = setTimeout(() => { if (!opened) failover(); }, 4000);

      try {
        const wsTok = typeof window !== "undefined" ? localStorage.getItem("afroid_access_token") : null;
        const q = wsTok ? `?token=${encodeURIComponent(wsTok)}` : "";
        ws = new WebSocket(`${WS_BASE}/ws/build/${buildSessionId}${q}`);
      } catch {
        clearTimeout(connectTimer);
        failover();
        return;
      }

      ws.onopen = () => { opened = true; clearTimeout(connectTimer); };
      ws.onmessage = async (ev) => {
        let msg: any;
        try { msg = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch { return; }
        if (msg?.type === "snapshot" && msg.data) {
          const done = await applyBuildSnapshot(msg.data, logRef);
          if (done) finish();
        }
      };
      ws.onerror = () => { if (!opened) { clearTimeout(connectTimer); failover(); } };
      ws.onclose = () => {
        clearTimeout(connectTimer);
        // Closed before a terminal snapshot → finish the watch over HTTP.
        if (!settled) failover();
      };
    });
  };

  const handleSyncProject = async () => {
    setSyncStatus("syncing");
    setTerminalLogs((prev) => [...prev, `[Sync] Initializing project synchronization for '${blueprintData?.projectName}'...`]);
    await new Promise((r) => setTimeout(r, 700));
    setTerminalLogs((prev) => [...prev, `[Sync] Project Syncing (process): Generating directory structure, core modules & schemas...`]);
    await new Promise((r) => setTimeout(r, 900));

    if (blueprintData) {
      const cleanTree = generateCleanWorkspace(blueprintData.projectName);
      const slug = blueprintData.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const mainPyPath = `services/${slug}/main.py`;
      const mainPyContent = cleanTree[0].children![0].children![0].content || "";
      setFileTree(cleanTree);
      setOpenFiles([{ name: "main.py", path: mainPyPath, type: "file", language: "python", content: mainPyContent }]);
      setActiveFilePath(mainPyPath);
      setEditorContent(mainPyContent);
      setTerminalLogs((prev) => [
        ...prev,
        `[Sync] Synced! Project folder successfully landed on IDE workspace at services/${slug}/`,
        `[AI Dock] Gemini frontier model (${selectedModel}) integrated and ready for builder instructions.`,
      ]);
      setDockMessages((prev) => [
        ...prev,
        {
          id: `msg-sync-${Date.now()}`,
          sender: "agent",
          agentName: "Chief Architect",
          text: `Project '${blueprintData.projectName}' has been successfully synced. Workspace files are loaded. I am Gemini (${selectedModel}), ready for your instructions.`,
          timestamp: "Just now",
        },
      ]);
    }
    setSyncStatus("synced");
    setTimeout(() => {
      setShowBlueprintModal(false);
      setSyncStatus("idle");
    }, 1000);
  };

  const handleApproveAndBuild = async () => {
    if (!blueprintRaw) {
      showAlert("Generate an Architect Blueprint first, then Approve & Build.");
      return;
    }
    setShowBlueprintModal(false);
    setIsBuilding(true);
    setLiveProgress(2);
    setActiveLiveAgent("Parallel Builder");
    setActiveLiveTask("Dispatching parallel build…");
    setTerminalLogs((prev) => [
      ...prev,
      `[Architect] Approved blueprint for '${blueprintData?.projectName}'. Starting parallel build…`,
    ]);
    try {
      const res = await fetch(`${API_BASE}/v1/builder/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ blueprint: blueprintRaw, autopilot, model_id: selectedModel, provider: providerPayloadFor(selectedModel) }),
      });
      const json = await res.json();
      const buildSessionId = json?.data?.session_id;
      if (!res.ok || !buildSessionId) {
        throw new Error(json?.detail || "Failed to start the build job.");
      }
      setSessionId(buildSessionId);
      setDockMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: "agent",
          agentName: "Parallel Builder",
          text: `Build dispatched for '${blueprintData?.projectName}'. Generating code milestone by milestone with ${selectedModel} — live progress is streaming into the terminal.`,
          timestamp: "Just now",
        },
      ]);
      await streamBuildStatus(buildSessionId);
    } catch (err) {
      setTerminalLogs((prev) => [...prev, `[Parallel Builder] Could not start build: ${(err as Error).message}`]);
      setActiveLiveTask("Build failed to start.");
      setIsBuilding(false);
    }
  };

  // Pop the next queued Copilot edit into the review panel (or clear when done).
  const advanceEditQueue = () => {
    setPendingEditQueue((q) => {
      const [next, ...rest] = q;
      setPendingReview(next ?? null);
      return rest;
    });
  };

  const handleApprovePendingFile = async () => {
    if (!pendingReview) return;
    const targetPath = pendingReview.filePath;
    const updatedContent = pendingReview.newContent;

    // Update in-memory file buffers
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === targetPath
          ? { ...f, content: updatedContent, savedContent: updatedContent }
          : f
      )
    );
    // Update the tree — adding the file if the Copilot created a new one.
    setFileTree((prev) => {
      const exists = findFileContentByPath(prev, targetPath) !== null;
      if (exists) return updateTreeContent(prev, targetPath, updatedContent);
      return [
        ...prev,
        {
          name: targetPath.split("/").pop() || targetPath,
          path: targetPath,
          type: "file" as const,
          language: getLanguage(targetPath),
          content: updatedContent,
          savedContent: updatedContent,
        },
      ];
    });
    if (activeFilePath === targetPath) {
      setEditorContent(updatedContent);
    }

    // Persist approved edit directly to workspace disk
    try {
      await fetch(`${API_BASE}/v1/workspace/file`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ path: targetPath, content: updatedContent }),
      });
    } catch {
      // offline fallback
    }

    // Best-effort notify any connected orchestrator stream (no-op if not connected).
    sendPatchReview(true, targetPath);

    setTerminalLogs((prev) => [
      ...prev,
      `[Founder] Approved edit for ${targetPath}. Written to the workspace on disk.`,
    ]);
    showToast(`Applied edit to ${targetPath}`);
    advanceEditQueue();
  };

  const handleRejectPendingFile = (feedback?: string) => {
    if (!pendingReview) return;
    const targetPath = pendingReview.filePath;
    // Best-effort notify any connected orchestrator stream (no-op if not connected).
    sendPatchReview(false, targetPath, feedback || "Founder rejected proposed edit");
    setTerminalLogs((prev) => [
      ...prev,
      `[Founder] Rejected edit for ${targetPath}.`,
    ]);
    showToast(`Rejected edit for ${targetPath}`);
    advanceEditQueue();
  };

  const [dockThinking, setDockThinking] = useState(false);

  // Load custom providers + autocomplete pref from this browser on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("afroid_custom_providers");
      if (raw) setCustomProviders(JSON.parse(raw));
      const ac = localStorage.getItem("afroid_autocomplete");
      if (ac !== null) setAutocompleteEnabled(ac === "1");
    } catch {
      /* ignore unreadable storage */
    }
  }, []);
  // Keep the completion config current for the (once-registered) Monaco provider.
  useEffect(() => {
    completionCfgRef.current = {
      enabled: autocompleteEnabled,
      model_id: selectedModel,
      provider: providerPayloadFor(selectedModel),
    };
    try {
      localStorage.setItem("afroid_autocomplete", autocompleteEnabled ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [autocompleteEnabled, selectedModel, customProviders]);
  useEffect(() => {
    activeFilePathRef.current = activeFilePath;
  }, [activeFilePath]);
  // Fetch a single inline completion for the cursor context.
  const fetchCompletion = async (prefix: string, suffix: string, language: string): Promise<string> => {
    const cfg = completionCfgRef.current;
    if (!cfg.enabled) return "";
    try {
      const res = await fetch(`${API_BASE}/v1/builder/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ prefix, suffix, language, path: activeFilePathRef.current, model_id: cfg.model_id, provider: cfg.provider }),
      });
      if (!res.ok) return "";
      return (await res.json())?.data?.completion || "";
    } catch {
      return "";
    }
  };
  // ── LSP-style diagnostics ─────────────────────────────────
  // Runs a real static-analysis linter (Ruff for Python) server-side and paints the
  // results as Monaco squiggles + Problems-panel entries. Ruff only parses and lints
  // — it never executes the buffer — so it is safe to run on unsaved content.
  const fetchDiagnostics = async (
    path: string,
    content: string,
    language: string,
  ): Promise<
    Array<{ line: number; column: number; endLine: number; endColumn: number; code: string; message: string; severity: "error" | "warning" }>
  > => {
    try {
      const res = await fetch(`${API_BASE}/v1/builder/diagnose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ path, content, language }),
      });
      if (!res.ok) return [];
      return (await res.json())?.data?.diagnostics || [];
    } catch {
      return [];
    }
  };

  // Lint a buffer and reconcile both the Monaco markers and the Problems list.
  const runDiagnostics = useCallback(async (path: string, content: string) => {
    if (!path) return;
    const language = getLanguage(path);
    const diags = await fetchDiagnostics(path, content, language);
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    // Only paint markers when this buffer is the one shown in the editor.
    if (monaco && editor && path === activeFilePathRef.current) {
      const model = editor.getModel();
      if (model) {
        const markers = diags.map((d) => ({
          startLineNumber: d.line,
          startColumn: d.column,
          endLineNumber: d.endLine,
          endColumn: Math.max(d.endColumn, d.column + 1),
          message: `${d.message}${d.code && d.code !== "syntax" ? ` (${d.code})` : ""}`,
          severity: d.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          source: "ruff",
        }));
        monaco.editor.setModelMarkers(model, "ruff", markers);
      }
    }
    // Reconcile the Problems panel: drop this file's prior ruff entries, add fresh ones.
    setProblems((prev) => {
      const kept = prev.filter((p) => !(p.source === "ruff" && p.file === path));
      const added: ProblemItem[] = diags.map((d) => ({
        file: path,
        line: d.line,
        message: `${d.message}${d.code && d.code !== "syntax" ? ` (${d.code})` : ""}`,
        severity: d.severity,
        source: "ruff",
      }));
      return [...kept, ...added];
    });
  }, []);

  // Debounced trigger for live diagnostics as the user types or switches files.
  const scheduleDiagnostics = useCallback((path: string, content: string) => {
    if (diagTimerRef.current) clearTimeout(diagTimerRef.current);
    diagTimerRef.current = setTimeout(() => {
      void runDiagnostics(path, content);
    }, 900);
  }, [runDiagnostics]);

  // Live-lint the active buffer on open and (debounced) as it changes.
  useEffect(() => {
    if (activeFilePath) scheduleDiagnostics(activeFilePath, editorContent);
  }, [activeFilePath, editorContent, scheduleDiagnostics]);
  const persistProviders = (list: CustomProvider[]) => {
    setCustomProviders(list);
    try {
      localStorage.setItem("afroid_custom_providers", JSON.stringify(list));
    } catch {
      /* ignore unwritable storage */
    }
  };
  // Build the per-request provider payload when a custom provider is selected.
  const providerPayloadFor = (sel: string): { base_url: string; api_key: string; model: string } | null => {
    if (!sel || !sel.startsWith("custom:")) return null;
    const p = customProviders.find((x) => `custom:${x.id}` === sel);
    return p ? { base_url: p.baseUrl, api_key: p.apiKey, model: p.model } : null;
  };

  // Flatten the file tree to a list of file paths (for the @-mention picker).
  const allWorkspaceFilePaths = (): string[] => {
    const out: string[] = [];
    const walk = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (n.type === "file") out.push(n.path);
        if (n.children) walk(n.children);
      }
    };
    walk(fileTree);
    return out;
  };

  // Resolve a file's content from open buffers, the tree, or the workspace API.
  const resolveFileContent = async (path: string): Promise<string | null> => {
    const open = openFiles.find((f) => f.path === path);
    if (open) return path === activeFilePath ? editorContent : open.content || "";
    const inTree = findFileContentByPath(fileTree, path);
    if (inTree != null) return inTree;
    try {
      const r = await fetch(`${API_BASE}/v1/workspace/file?path=${encodeURIComponent(path)}`, { headers: { ...authHeaders() } });
      if (r.ok) return (await r.json())?.data?.content ?? "";
    } catch {
      /* offline */
    }
    return null;
  };

  // pgvector namespace for this project's codebase index.
  const codebaseNamespace = (): string =>
    `codebase:${(blueprintData?.projectName || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  // Index the workspace into the vector store (Gemini embeddings + pgvector),
  // chunking each file so the Copilot can later retrieve relevant code semantically.
  const handleIndexCodebase = async () => {
    if (indexingCodebase) return;
    const paths = allWorkspaceFilePaths().slice(0, 120); // cap for a responsive index
    if (paths.length === 0) {
      showToast("No workspace files to index yet");
      return;
    }
    setIndexingCodebase(true);
    setTerminalLogs((prev) => [...prev, `[Codebase] Indexing ${paths.length} file(s) into the vector store…`]);
    const ns = codebaseNamespace();
    let indexed = 0;
    for (const p of paths) {
      const content = await resolveFileContent(p);
      if (!content || !content.trim()) continue;
      // ~1200-char chunks keep each embedding well within model limits.
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += 1200) chunks.push(content.slice(i, i + 1200));
      try {
        const res = await fetch(`${API_BASE}/v1/vector/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ texts: chunks, metadata: { path: p }, namespace: ns }),
        });
        if (res.ok) indexed++;
      } catch {
        /* skip file on failure */
      }
    }
    setCodebaseIndexed(indexed > 0);
    setCodebaseRetrieval(indexed > 0);
    setIndexingCodebase(false);
    setTerminalLogs((prev) => [...prev, `[Codebase] Indexed ${indexed} file(s). Semantic retrieval is ${indexed > 0 ? "ON" : "unavailable"}.`]);
    showToast(indexed > 0 ? `Codebase indexed (${indexed} files) — retrieval on` : "Indexing failed");
  };

  // Retrieve the most relevant code chunks for a query from the vector store.
  const retrieveCodebaseContext = async (query: string): Promise<{ path: string; content: string }[]> => {
    try {
      const res = await fetch(`${API_BASE}/v1/vector/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ query, namespace: codebaseNamespace(), top_k: 5, threshold: 0.25 }),
      });
      if (!res.ok) return [];
      const data = (await res.json())?.results || [];
      return data.map((r: any) => ({
        path: `retrieved: ${r?.metadata?.path || "codebase"}`,
        content: r?.text || "",
      }));
    } catch {
      return [];
    }
  };

  const handleSendDockMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dockInput.trim() || dockThinking) return;
    const userText = dockInput.trim();
    setDockInput("");
    setDockMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: "user", text: userText, timestamp: "Just now" }]);
    setActiveLiveAgent("geezcodE Copilot");
    setActiveLiveTask(`Thinking: "${userText.slice(0, 48)}${userText.length > 48 ? "…" : ""}"`);
    setDockThinking(true);

    // Attach the active file + all other open files as context so the Copilot can
    // reason across the codebase and propose coordinated multi-file edits.
    const activeFile = openFiles.find((f) => f.path === activeFilePath);
    const activeFilePayload = activeFile
      ? {
        path: activeFile.path,
        content: activeFilePath === activeFile.path ? editorContent : activeFile.content || "",
      }
      : null;
    const openFilesPayload = openFiles
      .filter((f) => f.path !== activeFilePath)
      .map((f) => ({ path: f.path, content: f.content || "" }));

    // Attach @-mentioned workspace files not already in the open set.
    for (const p of mentionedPaths) {
      if (p === activeFilePath || openFilesPayload.some((f) => f.path === p)) continue;
      const content = await resolveFileContent(p);
      if (content != null) openFilesPayload.push({ path: p, content });
    }

    // Codebase-aware retrieval: pull semantically relevant chunks from pgvector.
    if (codebaseRetrieval && codebaseIndexed) {
      const retrieved = await retrieveCodebaseContext(userText);
      for (const r of retrieved) {
        if (r.content) openFilesPayload.push(r);
      }
    }

    try {
      const res = await fetch(`${API_BASE}/v1/builder/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          message: userText,
          model_id: selectedModel,
          active_file: activeFilePayload,
          open_files: openFilesPayload,
          provider: providerPayloadFor(selectedModel),
        }),
      });
      const json = await res.json();
      const d = (json && json.data) || {};
      const reply = d.reply || "I couldn't produce a response — try again.";
      setDockMessages((prev) => [
        ...prev,
        { id: `reply-${Date.now()}`, sender: "agent", agentName: "geezcodE Copilot", text: reply, timestamp: "Just now" },
      ]);

      // Coordinated multi-file edits: queue them and open the first in the Diff
      // review panel; approving/rejecting advances to the next automatically.
      const rawEdits = Array.isArray(d.edits) ? d.edits : d.proposed_edit ? [d.proposed_edit] : [];
      const reviews: PendingReviewFile[] = rawEdits
        .filter((e: any) => e && e.path && typeof e.new_content === "string")
        .map((e: any) => ({
          filePath: e.path,
          diff: e.summary || "Proposed change from geezcodE Copilot",
          originalContent: findFileContentByPath(fileTree, e.path) ?? "",
          newContent: e.new_content,
          agentName: "geezcodE Copilot",
          milestoneId: "assistant",
        }));
      if (reviews.length > 0) {
        setPendingReview(reviews[0]);
        setPendingEditQueue(reviews.slice(1));
        const files = reviews.length === 1 ? reviews[0].filePath : `${reviews.length} files`;
        showToast(`Copilot proposed changes to ${files} — review the diff${reviews.length > 1 ? "s" : ""}`);
      }
    } catch {
      setDockMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: "agent",
          agentName: "geezcodE Copilot",
          text: "geezcodE Copilot is unreachable right now — is the gateway running?",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setDockThinking(false);
      setActiveLiveAgent("geezcodE Copilot");
      setActiveLiveTask("Ready");
    }
  };

  // Cmd+K inline edit: send the instruction (+ selected code) to the Copilot and
  // route the returned edit(s) into the same Diff review flow as the dock.
  const runInlineEdit = async () => {
    const instruction = inlineEditPrompt.trim();
    if (!instruction || inlineEditBusy) return;
    if (!activeFilePath) {
      showToast("Open a file first, then ⌘K");
      return;
    }
    setInlineEditBusy(true);
    const sel = inlineSelRef.current;
    const message = sel
      ? `${instruction}\n\nApply this specifically to the following selected code from ${activeFilePath}:\n\n${sel}`
      : instruction;
    try {
      const res = await fetch(`${API_BASE}/v1/builder/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          message,
          model_id: selectedModel,
          active_file: { path: activeFilePath, content: editorContent },
          open_files: [],
          provider: providerPayloadFor(selectedModel),
        }),
      });
      const json = await res.json();
      const d = (json && json.data) || {};
      const rawEdits = Array.isArray(d.edits) ? d.edits : d.proposed_edit ? [d.proposed_edit] : [];
      const reviews: PendingReviewFile[] = rawEdits
        .filter((e: any) => e && e.path && typeof e.new_content === "string")
        .map((e: any) => ({
          filePath: e.path,
          diff: e.summary || "Inline edit (⌘K)",
          originalContent: findFileContentByPath(fileTree, e.path) ?? (e.path === activeFilePath ? editorContent : ""),
          newContent: e.new_content,
          agentName: "geezcodE Copilot (⌘K)",
          milestoneId: "inline-edit",
        }));
      if (reviews.length > 0) {
        setPendingReview(reviews[0]);
        setPendingEditQueue(reviews.slice(1));
        setInlineEditOpen(false);
        showToast(`Inline edit ready — review the diff${reviews.length > 1 ? "s" : ""}`);
      } else {
        if (d.reply) {
          setDockMessages((prev) => [
            ...prev,
            { id: `reply-${Date.now()}`, sender: "agent", agentName: "geezcodE Copilot", text: d.reply, timestamp: "Just now" },
          ]);
        }
        showToast("No edit produced — rephrase, or check the Copilot dock");
        setInlineEditOpen(false);
      }
    } catch {
      showToast("Copilot unreachable — try again");
    } finally {
      setInlineEditBusy(false);
    }
  };

  const handleRunCertifyAudit = async () => {
    setCertifying(true);
    try {
      const res = await fetch(`${API_BASE}/v1/certify/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          jurisdictions: [certifyCountry],
          profile: {
            legal_name: user?.full_name || "Afroid Founder",
            country: certifyCountry,
            documents: { tax_id: "TIN-000-000-0000" },
            technologies: ["FastAPI", "Next.js", "PostgreSQL"],
            jobs_created: 0,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setCertifyResult(json.data || json);
      } else {
        const err = await res.json().catch(() => ({}));
        setCertifyResult({ error: err.detail || `Audit request failed (${res.status})` });
      }
    } catch {
      setCertifyResult({ error: "Certify service unreachable - is the gateway running?" });
    } finally {
      setCertifying(false);
    }
  };

  const fetchOpportunities = useCallback(async () => {
    setGrantsLoading(true);
    setGrantsError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/opportunities?limit=100`, {
        headers: { ...authHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(Array.isArray(data) ? data : []);
      } else {
        setGrantsError("Failed to load funding opportunities.");
      }
    } catch {
      setGrantsError("Incubate service unreachable - is the gateway running?");
    } finally {
      setGrantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop() || "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
      py: "python", json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
      css: "css", html: "html", sql: "sql", sh: "shell",
      geez: "geezcode", geezcode: "geezcode",
    };
    return map[ext] || "plaintext";
  };

  const findFileContentByPath = useCallback((nodes: FileNode[], targetPath: string): string | null => {
    for (const node of nodes) {
      if (node.path === targetPath && node.type === "file") {
        return node.content || "";
      }
      if (node.children) {
        const found = findFileContentByPath(node.children, targetPath);
        if (found !== null) return found;
      }
    }
    return null;
  }, []);

  const toggleDirectory = (nodePath: string) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.path === nodePath) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileTree((prev) => updateNodes(prev));
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => (
    <div>
      {nodes.map((node) => (
        <div key={node.path}>
          <button
            onClick={() => {
              if (node.type === "directory") {
                toggleDirectory(node.path);
              } else {
                handleFileSelect(node);
              }
            }}
            className={`flex w-full items-center gap-1.5 px-2 py-[3px] text-[13px] transition-colors ${node.path === activeFilePath
                ? "bg-surface-800 text-surface-100"
                : "text-surface-400 hover:bg-surface-850 hover:text-surface-200"
              }`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
          >
            {node.type === "directory" ? (
              <ChevronRight className={`h-3.5 w-3.5 text-surface-500 transition-transform ${node.isOpen ? "rotate-90" : ""}`} />
            ) : (
              <span className="w-3.5 flex items-center justify-center">
                <FileTypeIcon name={node.name} />
              </span>
            )}
            <span className="truncate font-mono text-[12.5px]">{node.name}</span>
          </button>
          {node.type === "directory" && node.isOpen && node.children && renderFileTree(node.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  const ideCommands: CommandItem[] = useMemo(() => [
    // File Commands
    { id: "file.new", category: "File", label: "New File...", detail: "Create blank file in workspace", shortcut: "Ctrl+N", icon: FilePlus, action: handleNewFile },
    { id: "file.newFolder", category: "File", label: "New Folder...", detail: "Create directory structure", icon: Folder, action: handleNewFolder },
    { id: "file.quickOpen", category: "File", label: "Quick Open File...", detail: "Fuzzy search project files", shortcut: "Ctrl+P", icon: Search, action: () => setShowQuickOpen(true) },
    { id: "file.save", category: "File", label: "Save File", detail: "Persist active dirty buffer to disk", shortcut: "Ctrl+S", icon: Save, action: () => handleSaveFile() },
    { id: "file.saveAs", category: "File", label: "Save As...", detail: "Clone buffer into new file path", shortcut: "Ctrl+Shift+S", icon: Save, action: handleSaveAs },
    { id: "file.saveAll", category: "File", label: "Save All Files", detail: "Flush all dirty open tabs to disk", shortcut: "Ctrl+K S", icon: Save, action: handleSaveAll },
    { id: "file.autoSave", category: "File", label: `Toggle Auto-Save (${autoSave ? "Currently ON" : "Currently OFF"})`, detail: "Auto-persist dirty buffers after 1.5s", icon: SlidersHorizontal, action: () => setAutoSave((prev) => !prev) },
    { id: "file.close", category: "File", label: "Close Active File", detail: "Close active editor tab with guard", shortcut: "Ctrl+W", icon: X, action: () => openFiles.length > 0 && handleCloseTabRequest({ stopPropagation: () => { } } as any, activeFilePath) },
    { id: "file.closeAll", category: "File", label: "Close All Files", detail: "Return to Welcome Screen", icon: X, action: () => { setOpenFiles([]); setActiveFilePath(""); } },
    { id: "file.intake", category: "File", label: "Architect Intake Wizard...", detail: "AI prompt intake to synthesize sovereign blueprint", shortcut: "Ctrl+Shift+N", icon: Sparkles, action: () => setShowIntakeModal(true) },

    // Edit Commands
    { id: "edit.undo", category: "Edit", label: "Undo", detail: "Revert previous buffer modification", shortcut: "Ctrl+Z", icon: Undo2, action: () => editorRef.current?.trigger("menu", "undo", null) },
    { id: "edit.redo", category: "Edit", label: "Redo", detail: "Reapply undone buffer modification", shortcut: "Ctrl+Y", icon: Redo2, action: () => editorRef.current?.trigger("menu", "redo", null) },
    { id: "edit.find", category: "Edit", label: "Find in File", detail: "Open Monaco search widget", shortcut: "Ctrl+F", icon: Search, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("actions.find")?.run(); } },
    { id: "edit.replace", category: "Edit", label: "Find & Replace", detail: "Open Monaco replacement widget", shortcut: "Ctrl+H", icon: Search, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.startFindReplaceAction")?.run(); } },
    { id: "edit.findInFiles", category: "Edit", label: "Search in Files (Grep)", detail: "Workspace-wide text search", shortcut: "Ctrl+Shift+F", icon: Search, action: () => { setActiveActivity("search"); setShowLeftSidebar(true); } },
    { id: "edit.commentLine", category: "Edit", label: "Toggle Line Comment", detail: "Comment/uncomment selected lines", shortcut: "Ctrl+/", icon: Code2, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.commentLine")?.run(); } },
    { id: "edit.format", category: "Edit", label: "Format Document", detail: "Run Monaco AST document formatter", shortcut: "Shift+Alt+F", icon: Code2, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.formatDocument")?.run(); } },

    // Selection Commands
    { id: "select.all", category: "Selection", label: "Select All", detail: "Highlight entire active buffer", shortcut: "Ctrl+A", icon: Check, action: () => { editorRef.current?.focus(); editorRef.current?.setSelection(editorRef.current?.getModel()?.getFullModelRange()); } },
    { id: "select.expand", category: "Selection", label: "Expand Selection", detail: "Smart syntax-aware expansion", shortcut: "Shift+Alt+Right", icon: Check, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.smartSelect.expand")?.run(); } },
    { id: "select.shrink", category: "Selection", label: "Shrink Selection", detail: "Smart syntax-aware reduction", shortcut: "Shift+Alt+Left", icon: Check, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.smartSelect.shrink")?.run(); } },
    { id: "select.copyLineDown", category: "Selection", label: "Copy Line Down", detail: "Duplicate line directly below", shortcut: "Shift+Alt+Down", icon: Layers, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.copyLinesDownAction")?.run(); } },
    { id: "select.moveLineUp", category: "Selection", label: "Move Line Up", detail: "Shift current line above", shortcut: "Alt+Up", icon: Layers, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.moveLinesUpAction")?.run(); } },
    { id: "select.moveLineDown", category: "Selection", label: "Move Line Down", detail: "Shift current line below", shortcut: "Alt+Down", icon: Layers, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.moveLinesDownAction")?.run(); } },

    // View Commands
    { id: "view.commandPalette", category: "View", label: "Command Palette...", detail: "Search all IDE commands & tools", shortcut: "Ctrl+Shift+P", icon: Zap, action: () => setShowCommandPalette(true) },
    { id: "view.explorer", category: "View", label: "View: Show Explorer", detail: "Focus project file tree dock", shortcut: "Ctrl+Shift+E", icon: Files, action: () => { setActiveActivity("explorer"); setShowLeftSidebar(true); } },
    { id: "view.search", category: "View", label: "View: Show Search", detail: "Focus global grep dock", shortcut: "Ctrl+Shift+F", icon: Search, action: () => { setActiveActivity("search"); setShowLeftSidebar(true); } },
    { id: "view.git", category: "View", label: "View: Show Source Control", detail: "Focus git diff & commit dock", shortcut: "Ctrl+Shift+G", icon: GitBranch, action: () => { setActiveActivity("git"); setShowLeftSidebar(true); } },
    { id: "view.planning", category: "View", label: "View: Show Planning Mode", detail: "Focus milestones & task matrix", shortcut: "Ctrl+Shift+D", icon: FileText, action: () => { setActiveActivity("plan"); setShowLeftSidebar(true); } },
    { id: "view.swarm", category: "View", label: "View: Show Swarm Agent", detail: "Focus multi-agent build stream", shortcut: "Ctrl+Shift+A", icon: Bot, action: () => { setActiveActivity("swarm"); setShowLeftSidebar(true); } },
    { id: "view.toggleSidebar", category: "View", label: "Toggle Primary Sidebar", detail: "Expand or collapse left navigation", shortcut: "Ctrl+B", icon: PanelLeft, action: () => setShowLeftSidebar((p) => !p) },
    { id: "view.toggleRightDock", category: "View", label: "Toggle AI Assistant Dock", detail: "Expand or collapse right copilot", shortcut: "Ctrl+Alt+B", icon: PanelRight, action: () => setShowRightDock((p) => !p) },
    { id: "view.toggleTerminal", category: "View", label: "Toggle Terminal Panel", detail: "Expand or collapse bottom drawer", shortcut: "Ctrl+J", icon: TerminalIcon, action: () => setShowBottomTerminal((p) => !p) },
    { id: "view.toggleWordWrap", category: "View", label: `Toggle Word Wrap (${wordWrap ? "ON" : "OFF"})`, detail: "Wrap long lines at viewport edge", shortcut: "Alt+Z", icon: WrapText, action: () => setWordWrap((p) => !p) },
    { id: "view.toggleMinimap", category: "View", label: `Toggle Minimap (${editorMinimap ? "ON" : "OFF"})`, detail: "Toggle code minimap column", icon: Eye, action: () => setEditorMinimap((p) => !p) },

    // Go Commands
    { id: "go.file", category: "Go", label: "Go to File...", detail: "Jump to file in project", shortcut: "Ctrl+P", icon: Search, action: () => setShowQuickOpen(true) },
    { id: "go.line", category: "Go", label: "Go to Line/Column...", detail: "Jump cursor to specific line:col", shortcut: "Ctrl+G", icon: Hash, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.gotoLine")?.run(); } },
    { id: "go.definition", category: "Go", label: "Go to Definition", detail: "Jump to symbol declaration", shortcut: "F12", icon: Code2, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.revealDefinition")?.run(); } },
    { id: "go.references", category: "Go", label: "Go to References", detail: "Find all usages across file", shortcut: "Shift+F12", icon: Code2, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.referenceSearch.trigger")?.run(); } },
    { id: "go.nextProblem", category: "Go", label: "Go to Next Problem", detail: "Navigate to next syntax error/marker", shortcut: "F8", icon: AlertCircle, action: () => { editorRef.current?.focus(); editorRef.current?.getAction("editor.action.marker.next")?.run(); } },

    // Run Commands
    { id: "run.file", category: "Run", label: "Run Active File", detail: "Execute active script in terminal runtime", shortcut: "F5", icon: Play, action: handleRunActiveFile },
    { id: "run.tests", category: "Run", label: "Run Test Suite (pytest)", detail: "Execute pytest across workspace", shortcut: "Ctrl+F5", icon: CheckCircle2, action: handleRunTests },
    { id: "run.swarm", category: "Run", label: "Run Autonomous Swarm Build", detail: "Kick off AI generation swarm for blueprint", shortcut: "Ctrl+Shift+B", icon: Sparkles, action: handleApproveAndBuild },
    { id: "run.preview", category: "Run", label: "Open Sandboxed Live Preview", detail: "Launch web preview iframe", shortcut: "Ctrl+Shift+V", icon: Globe, action: () => { setTerminalTab("preview"); setShowBottomTerminal(true); } },

    // Terminal Commands
    { id: "terminal.focus", category: "Terminal", label: "Focus Terminal", detail: "Bring Canvas PTY terminal to focus", shortcut: "Ctrl+`", icon: TerminalIcon, action: () => { setTerminalTab("terminal"); setShowBottomTerminal(true); } },
    { id: "terminal.clear", category: "Terminal", label: "Clear Terminal Buffer", detail: "Reset terminal output log", shortcut: "Ctrl+K", icon: Trash2, action: () => setTerminalLogs([]) },

    // Preferences & Help Commands
    { id: "pref.settings", category: "Preferences", label: "Preferences: Open Settings", detail: "Configure editor ergonomics & swarm sovereignty", shortcut: "Ctrl+,", icon: Settings, action: () => setShowSettingsModal(true) },
    { id: "help.shortcuts", category: "Help", label: "Help: Keyboard Shortcuts Cheat Sheet", detail: "View all hotkeys and commands", shortcut: "Ctrl+K Ctrl+S", icon: Keyboard, action: () => setShowShortcutsModal(true) },
    { id: "help.welcome", category: "Help", label: "Help: Welcome & Overview", detail: "Open geezcodE Quickstart Hub", icon: Sparkles, action: () => { setOpenFiles([]); setActiveFilePath(""); } },
    { id: "help.about", category: "Help", label: "Help: About geezcodE IDE", detail: "Inspect version, engines & stack topology", icon: Info, action: () => setShowAboutModal(true) },
  ], [activeFilePath, autoSave, editorMinimap, handleApproveAndBuild, handleCloseTabRequest, handleNewFile, handleNewFolder, handleRunActiveFile, handleRunTests, handleSaveAs, handleSaveFile, handleSaveAll, openFiles.length, wordWrap]);

  const ideSettings: IDESettings = {
    editorFontSize,
    tabSize,
    fontLigatures,
    editorMinimap,
    wordWrap,
    autoSave,
    autoSaveDelay: 1500,
    formatOnSave,
    lineNumbers: "on",
    cursorBlinking: "smooth",
    autoApprovePatches,
    autopilotMode,
    swarmVerbosity: "standard",
    terminalFontSize,
    terminalCursorBlink,
    apiBase: API_BASE,
  };

  const handleUpdateSettings = (updated: Partial<IDESettings>) => {
    if (updated.editorFontSize !== undefined) setEditorFontSize(updated.editorFontSize);
    if (updated.tabSize !== undefined) setTabSize(updated.tabSize);
    if (updated.fontLigatures !== undefined) setFontLigatures(updated.fontLigatures);
    if (updated.editorMinimap !== undefined) setEditorMinimap(updated.editorMinimap);
    if (updated.wordWrap !== undefined) setWordWrap(updated.wordWrap);
    if (updated.autoSave !== undefined) setAutoSave(updated.autoSave);
    if (updated.formatOnSave !== undefined) setFormatOnSave(updated.formatOnSave);
    if (updated.autoApprovePatches !== undefined) setAutoApprovePatches(updated.autoApprovePatches);
    if (updated.autopilotMode !== undefined) setAutopilotMode(updated.autopilotMode);
    if (updated.terminalFontSize !== undefined) setTerminalFontSize(updated.terminalFontSize);
    if (updated.terminalCursorBlink !== undefined) setTerminalCursorBlink(updated.terminalCursorBlink);
  };

  const activityItems: Array<{ id: string; label: string; icon: React.ReactNode }> = [
    { id: "explorer", label: "Explorer", icon: <Files className="h-[18px] w-[18px]" /> },
    { id: "search", label: "Search", icon: <Search className="h-[18px] w-[18px]" /> },
    { id: "git", label: "Source Control", icon: <GitBranch className="h-[18px] w-[18px]" /> },
    { id: "plan", label: "Planning Mode", icon: <FileText className="h-[18px] w-[18px]" /> },
    { id: "architect", label: "Architect", icon: <Layers className="h-[18px] w-[18px]" /> },
    { id: "intake", label: "Architect Intake", icon: <SlidersHorizontal className="h-[18px] w-[18px]" /> },
    { id: "swarm", label: "Agent Swarm", icon: <Bot className="h-[18px] w-[18px]" /> },
    { id: "certify", label: "Certify", icon: <ShieldCheck className="h-[18px] w-[18px]" /> },
    { id: "incubate", label: "Incubate", icon: <Coins className="h-[18px] w-[18px]" /> },
    { id: "kyc", label: "KYC", icon: <QrCode className="h-[18px] w-[18px]" /> },
  ];

  const handleActivityClick = (id: string) => {
    if (id === "intake") {
      setShowIntakeModal(true);
    } else {
      setActiveActivity(id);
      setShowLeftSidebar(true);
    }
  };

  function generateCleanWorkspace(projectName: string): FileNode[] {
    const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return [
      {
        name: "services",
        path: "services",
        type: "directory",
        isOpen: true,
        children: [
          {
            name: slug,
            path: `services/${slug}`,
            type: "directory",
            isOpen: true,
            children: [
              {
                name: "main.py",
                path: `services/${slug}/main.py`,
                type: "file",
                language: "python",
                content: `from fastapi import FastAPI\n\napp = FastAPI(title="${projectName}", version="1.0.0")\n\n@app.get("/health")\ndef health_check():\n    return {"status": "healthy", "project": "${projectName}", "sovereignty": "verified"}\n\n@app.get("/")\ndef root():\n    return {"message": "Welcome to ${projectName} API powered by geezcodE"}\n`,
              },
              {
                name: "Dockerfile",
                path: `services/${slug}/Dockerfile`,
                type: "file",
                language: "dockerfile",
                content: `FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nRUN pip install fastapi uvicorn\nCMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]\n`,
              },
            ],
          },
        ],
      },
      {
        name: "README.md",
        path: "README.md",
        type: "file",
        language: "markdown",
        content: `# ${projectName}\n\nGenerated autonomously via geezcodE 2-Phase Architect Intake & Multi-Agent Swarm.\n\n## Stack\n- Python 3.12 + FastAPI\n- Cloud Run Serverless\n- PostgreSQL + pgvector\n`,
      },
    ];
  }

  const badgeFor = (id: string) => {
    const n = id === "intake" ? ideaStats.pending : id === "explorer" ? ideaStats.synced : 0;
    if (!n) return null;
    return (
      <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
        {n > 99 ? "99+" : n}
      </span>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-surface-950 text-surface-100 font-sans antialiased overflow-hidden">
      {/* ===== Title bar ===== */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-surface-800 bg-surface-900 px-3 select-none relative z-40 gap-2">
        {/* Left: Brand + Full 8-Menu Bar */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0 mr-1" title="Back to Dashboard">
            <GeezCodeLogo size={15} showWordmark={false} />
          </Link>
          <IDEMenuBar
            editorRef={editorRef}
            activeFilePath={activeFilePath}
            hasOpenFiles={openFiles.length > 0}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            onSaveFile={handleSaveFile}
            onSaveAs={handleSaveAs}
            onSaveAll={handleSaveAll}
            autoSave={autoSave}
            onToggleAutoSave={() => setAutoSave(!autoSave)}
            onDeleteFile={handleDeleteFile}
            onCloseFile={() => {
              if (openFiles.length > 0) {
                handleCloseTabRequest({ stopPropagation: () => { } } as any, activeFilePath);
              }
            }}
            onNewProject={() => setShowIntakeModal(true)}
            onOpenQuickOpen={() => setShowQuickOpen(true)}
            onOpenCommandPalette={() => setShowCommandPalette(true)}
            onOpenShortcuts={() => setShowShortcutsModal(true)}
            onOpenAbout={() => setShowAboutModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenWelcome={() => {
              setOpenFiles([]);
              setActiveFilePath("");
            }}
            setActiveActivity={setActiveActivity}
            showLeftSidebar={showLeftSidebar}
            setShowLeftSidebar={setShowLeftSidebar}
            showRightDock={showRightDock}
            setShowRightDock={setShowRightDock}
            showBottomTerminal={showBottomTerminal}
            setShowBottomTerminal={setShowBottomTerminal}
            editorMinimap={editorMinimap}
            setEditorMinimap={setEditorMinimap}
            onRunActiveFile={handleRunActiveFile}
            onRunTests={handleRunTests}
            onRevertFile={() => {
              // Revert active file to its last saved content
              const activeFile = openFiles.find((f) => f.path === activeFilePath);
              if (activeFile && activeFile.savedContent !== undefined) {
                setOpenFiles((prev) =>
                  prev.map((f) =>
                    f.path === activeFilePath
                      ? { ...f, content: f.savedContent ?? f.content, isDirty: false }
                      : f
                  )
                );
                // Also reset the Monaco editor model
                if (editorRef.current) {
                  const model = editorRef.current.getModel();
                  if (model) {
                    model.setValue(activeFile.savedContent ?? activeFile.content ?? "");
                  }
                }
              }
            }}
            onDuplicateWorkspace={() => {
              // Open a new IDE window with same project context
              const projectName = blueprintData?.projectName || ideaForm.projectName || "";
              const url = projectName
                ? `/dashboard/ide?project=${encodeURIComponent(projectName)}`
                : "/dashboard/ide";
              window.open(url, "_blank");
            }}
            onRunSwarm={handleApproveAndBuild}
            setTerminalTab={setTerminalTab}
            onClearTerminal={() => setTerminalLogs([])}
          />
        </div>

        {/* Center: Dynamic Title Bar: logo geezcodE (X) */}
        <div className="flex items-center justify-center flex-1 min-w-0 px-2">
          <button
            type="button"
            onClick={() => setShowQuickOpen(true)}
            title={`Active Project: ${blueprintData?.projectName || ideaForm.projectName || "Sovereign Agritech"} — Quick Open (Ctrl+P)`}
            className="group flex items-center gap-1.5 rounded-md border border-surface-800/80 bg-surface-950/80 hover:bg-surface-850 hover:border-surface-700/80 px-3 py-1 text-xs transition-all shadow-sm cursor-pointer max-w-md truncate"
          >
            {/* Logo */}
            <span className="shrink-0 flex items-center group-hover:scale-105 transition-transform">
              <GeezCodeLogo size={13} showWordmark={false} />
            </span>

            {/* Unbold, Italic: geezcodE */}
            <span className="font-normal italic text-surface-200 tracking-normal select-none">
              geezcodE
            </span>

            {/* Unbold, Italic: (X) where X is Active Project Name */}
            <span className="font-normal italic text-surface-400 truncate select-none">
              ({blueprintData?.projectName || ideaForm.projectName || "Sovereign Agritech"})
            </span>
          </button>
        </div>

        {/* Right: Layout Panel Toggles */}
        <div className="flex items-center justify-end gap-1 shrink-0">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            title="Toggle sidebar (Ctrl+B)"
            className={`rounded p-1.5 transition-colors ${showLeftSidebar ? "text-surface-300 bg-surface-800" : "text-surface-500 hover:text-surface-200"}`}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowRightDock(!showRightDock)}
            title="Toggle AI assistant (Ctrl+Alt+B)"
            className={`rounded p-1.5 transition-colors ${showRightDock ? "text-surface-300 bg-surface-800" : "text-surface-500 hover:text-surface-200"}`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowBottomTerminal(!showBottomTerminal)}
            title="Toggle terminal (Ctrl+J)"
            className={`rounded p-1.5 transition-colors ${showBottomTerminal ? "text-surface-300 bg-surface-800" : "text-surface-500 hover:text-surface-200"}`}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <nav className="flex w-12 shrink-0 flex-col items-center justify-between border-r border-surface-800 bg-surface-900 py-2 select-none">
          <div className="flex flex-col items-center gap-1">
            {activityItems.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleActivityClick(item.id)}
                title={item.label}
                className={`relative p-2 rounded-md transition-colors ${activeActivity === item.id && showLeftSidebar && item.id !== "intake"
                    ? "text-surface-100"
                    : "text-surface-500 hover:text-surface-200"
                  }`}
              >
                {activeActivity === item.id && showLeftSidebar && item.id !== "intake" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-brand-500" />
                )}
                {item.icon}
                {badgeFor(item.id)}
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center gap-1">
            {activityItems.slice(5).map((item) => (
              <button
                key={item.id}
                onClick={() => handleActivityClick(item.id)}
                title={item.label}
                className={`relative p-2 rounded-md transition-colors ${activeActivity === item.id && showLeftSidebar && item.id !== "intake"
                    ? "text-surface-100"
                    : "text-surface-500 hover:text-surface-200"
                  }`}
              >
                {activeActivity === item.id && showLeftSidebar && item.id !== "intake" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-brand-500" />
                )}
                {item.icon}
                {badgeFor(item.id)}
              </button>
            ))}
            <button
              onClick={() => { setActiveActivity("settings"); setShowLeftSidebar(true); }}
              title="Settings"
              className={`relative p-2 rounded-md transition-colors ${activeActivity === "settings" && showLeftSidebar ? "text-surface-100" : "text-surface-500 hover:text-surface-200"
                }`}
            >
              {activeActivity === "settings" && showLeftSidebar && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-brand-500" />
              )}
              <Settings className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>

        {/* Left sidebar */}
        {showLeftSidebar && (
          <>
            <aside style={{ width: `${leftSidebarWidth}px` }} className="flex shrink-0 flex-col bg-surface-900 border-r border-surface-800">
              <div className="flex h-8 items-center justify-between border-b border-surface-800 px-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-surface-400">{activeActivity}</span>
                <button onClick={() => setShowLeftSidebar(false)} className="text-surface-500 hover:text-surface-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {activeActivity === "explorer" && (
                  <div className="py-1">
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Workspace</span>
                      <div className="flex items-center gap-0.5 text-surface-500">
                        <button
                          onClick={handleNewFile}
                          title="New File"
                          className="p-1 rounded hover:text-surface-200 hover:bg-surface-800"
                        >
                          <FilePlus className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setShowNewProject(true)} title="Start New Project" className="p-1 rounded hover:text-surface-200 hover:bg-surface-800">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={fetchWorkspaceTree} title="Refresh" className="p-1 rounded hover:text-surface-200 hover:bg-surface-800">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {renderFileTree(
                      projectRoot
                        ? ([{ name: projectRoot.slice(1), path: projectRoot.slice(1), type: "dir" as const, children: fileTree }] as unknown as FileNode[])
                        : fileTree
                    )}
                  </div>
                )}

                {activeActivity === "search" && (
                  <div className="flex flex-col">
                    <div className="p-2">
                      <div className="flex items-center gap-2 rounded border border-surface-750 bg-surface-950 px-2 py-1.5">
                        <Search className="h-3.5 w-3.5 text-surface-500" />
                        <input
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search in files..."
                          className="w-full bg-transparent text-xs outline-none placeholder:text-surface-500"
                        />
                      </div>
                    </div>
                    <div className="px-2 pb-2 text-[11px] text-surface-500">
                      {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                    </div>
                    <div>
                      {searchResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => handleSearchResultClick(r)}
                          className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left hover:bg-surface-850 cursor-pointer transition-colors"
                        >
                          <span className="font-mono text-[11px] text-surface-300">{r.file}</span>
                          <span className="font-mono text-[11px] text-surface-500 truncate">
                            <span className="text-brand-400 font-semibold">{r.line}</span>: {r.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeActivity === "git" && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <GitBranch className="h-3.5 w-3.5 text-surface-500" />
                      <span className="font-mono text-xs text-surface-200">{gitBranch}</span>
                    </div>
                    <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                      Changes ({changedFiles.length})
                    </div>
                    {changedFiles.map((f) => (
                      <div key={f} className="flex items-center gap-2 px-3 py-1 font-mono text-xs text-surface-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {f}
                      </div>
                    ))}
                    <div className="p-3">
                      <input
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message"
                        className="w-full rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs outline-none placeholder:text-surface-500"
                      />
                      <button
                        onClick={handleCommit}
                        className="mt-2 w-full rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                      >
                        Commit
                      </button>
                    </div>
                  </div>
                )}

                {activeActivity === "plan" && (
                  <div className="flex flex-col p-3 gap-3">
                    {/* Header & Status */}
                    <div className="flex items-center justify-between border-b border-surface-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-brand-400" />
                        <span className="text-xs font-semibold text-surface-100">Implementation Plan</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${planApproved
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        }`}>
                        {planApproved ? "Approved & Executing" : "Review Required"}
                      </span>
                    </div>

                    {/* Antigravity Alert Box */}
                    <div className="rounded-lg border border-brand-500/20 bg-brand-500/5 p-2.5 text-[11px] leading-relaxed text-surface-300">
                      <div className="flex items-center gap-1.5 font-semibold text-brand-400 mb-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Planning Mode Active</span>
                      </div>
                      Autonomous agent swarm executes milestones sequentially according to strict Definition-of-Done criteria.
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-surface-400 mb-1">
                        <span>Milestone Progress</span>
                        <span className="font-mono text-brand-400">
                          {Object.values(completedTasks).filter(Boolean).length} tasks done
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (Object.values(completedTasks).filter(Boolean).length /
                                  Math.max(1, (blueprintData?.milestones || []).flatMap((m) => m.tasks || []).length || 6)) *
                                100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Approval Action */}
                    {!planApproved ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPlanApproved(true);
                          setTerminalLogs((prev) => [
                            ...prev,
                            `[Planning Mode] Founder approved implementation plan for '${blueprintData?.projectName || "Sovereign Agritech"}'.`,
                            "[Planning Mode] Autonomous execution unlocked.",
                          ]);
                          handleApproveAndBuild();
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 text-xs font-medium text-white shadow-md transition-all"
                      >
                        <Check className="h-4 w-4" /> Approve Plan & Run Swarm
                      </button>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Plan Approved
                        </span>
                        <button
                          type="button"
                          onClick={() => setPlanApproved(false)}
                          className="text-[10px] text-surface-500 hover:text-surface-300 underline"
                        >
                          Pause / Revise
                        </button>
                      </div>
                    )}

                    {/* Milestones & Tasks List */}
                    <div className="space-y-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                        Milestones & Tasks
                      </div>

                      {(blueprintData?.milestones && blueprintData.milestones.length > 0
                        ? blueprintData.milestones
                        : [
                          {
                            id: "M1",
                            name: "Core API Gateway",
                            objective: "FastAPI microservices, Pydantic entity schemas",
                            tasks: ["Initialize FastAPI gateway", "Define sovereign loan schema", "Configure PostgreSQL connection pool"],
                            filesToCreate: ["services/api/main.py", "services/api/routes.py"],
                            definitionsOfDone: ["RFC 7807 error envelopes active", "Pydantic validation passing"],
                          },
                          {
                            id: "M2",
                            name: "Frontend VFS & Monaco",
                            objective: "Next.js 15 App Router IDE",
                            tasks: ["Create dashboard layout", "Mount Monaco DiffEditor", "Register geezcodE DSL"],
                            filesToCreate: ["apps/web/src/app/page.tsx", "apps/web/src/lib/geezcode-monaco.ts"],
                            definitionsOfDone: ["Zero type errors", "Side-by-side diff review functional"],
                          },
                        ]
                      ).map((m, mIdx) => (
                        <div key={m.id || mIdx} className="rounded-lg border border-surface-800 bg-surface-950 p-2.5 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-surface-200">
                              {m.id}: {m.name}
                            </span>
                            <span className="font-mono text-[10px] text-brand-400">{m.filesToCreate?.length || 0} files</span>
                          </div>
                          <p className="text-[11px] text-surface-400 leading-snug">{m.objective}</p>

                          <div className="space-y-1.5 pt-1 border-t border-surface-850">
                            {m.tasks?.map((t, tIdx) => {
                              const key = `task-${m.id}-${tIdx}`;
                              const isChecked = !!completedTasks[key];
                              return (
                                <label
                                  key={key}
                                  className="flex items-start gap-2 cursor-pointer select-none text-[11px] group"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCompletedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    readOnly
                                    className="mt-0.5 rounded border-surface-700 bg-surface-900 text-brand-500 focus:ring-0 cursor-pointer"
                                  />
                                  <span className={`leading-tight transition-colors ${isChecked ? "text-surface-500 line-through" : "text-surface-300 group-hover:text-surface-100"
                                    }`}>
                                    {t}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeActivity === "architect" && (
                  <div className="flex flex-col p-3 gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-1">Zero-Question Intake</div>
                      <p className="text-xs text-surface-400 leading-relaxed">
                        Translate a high-level idea into a complete architecture — no questions asked.
                      </p>
                    </div>
                    <button onClick={() => setShowIntakeModal(true)} className="flex items-center justify-center gap-1.5 rounded border border-surface-700 py-1.5 text-xs text-surface-200 hover:bg-surface-800">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Open Intake Form
                    </button>
                    <button
                      onClick={() => handleGenerateBlueprint(false)}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-1.5 rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
                      Generate Blueprint
                    </button>
                    {blueprintData && (
                      <div className="rounded border border-surface-750 bg-surface-950 p-3">
                        <div className="text-xs font-medium text-surface-200">{blueprintData.projectName}</div>
                        <div className="mt-1 text-[11px] text-surface-500">Completeness: {blueprintData.completeness}%</div>
                        <div className="mt-1 text-[11px] text-surface-400 line-clamp-3">{blueprintData.summary}</div>
                        <button onClick={() => setShowBlueprintModal(true)} className="mt-2 text-[11px] text-brand-400 hover:text-brand-300">
                          View blueprint →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeActivity === "swarm" && (
                  <div className="flex flex-col gap-2 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Sub-Agent Swarm</div>
                    {(swarmAgents.length > 0
                      ? swarmAgents
                      : [
                        { name: "Architect", status: "completed" },
                        { name: "CodeGen Worker 1", status: isBuilding ? "running" : "idle" },
                        { name: "CodeGen Worker 2", status: "idle" },
                        { name: "QA & AST Runner", status: "idle" },
                        { name: "RegTech Auditor", status: "idle" },
                      ]
                    ).map((a: any) => (
                      <div key={a.name} className="flex items-center justify-between rounded border border-surface-750 bg-surface-950 px-2.5 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-surface-200">{a.name}</span>
                          {a.current_task && <span className="text-[10px] text-surface-500">{a.current_task}</span>}
                        </div>
                        <span className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide ${a.status === "completed" || a.status === "complete" ? "text-emerald-400" : a.status === "running" ? "text-brand-400" : "text-surface-500"
                          }`}>
                          {a.status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeActivity === "certify" && (
                  <div className="flex flex-col gap-3 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Compliance Audit</div>
                    <select value={certifyCountry} onChange={(e) => setCertifyCountry(e.target.value)} className="rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs outline-none">
                      <option value="nigeria">Nigeria</option>
                      <option value="kenya">Kenya</option>
                      <option value="ethiopia">Ethiopia</option>
                      <option value="au">African Union</option>
                    </select>
                    <button onClick={handleRunCertifyAudit} disabled={certifying} className="flex items-center justify-center gap-1.5 rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50">
                      {certifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      Run Audit
                    </button>
                    {certifyResult?.error && (
                      <div className="rounded border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">{certifyResult.error}</div>
                    )}
                    {certifyResult?.results && (
                      <div className="space-y-2">
                        {certifyResult.results.map((r: any) => (
                          <div key={r.jurisdiction} className={`rounded border p-3 ${r.status === "passed" ? "border-emerald-500/30 bg-emerald-500/5" : r.status === "failed" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium uppercase text-surface-200">{r.jurisdiction}</span>
                              <span className={`flex items-center gap-1 text-xs font-medium ${r.status === "passed" ? "text-emerald-400" : r.status === "failed" ? "text-red-400" : "text-amber-400"}`}>
                                {r.status === "passed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                {r.status.toUpperCase()} · {r.score}
                              </span>
                            </div>
                            {r.rules && r.rules.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {r.rules.map((rule: any) => (
                                  <div key={rule.rule_id} className="flex items-start justify-between gap-2 text-[11px] text-surface-400">
                                    <span>{rule.rule_name}</span>
                                    <span className={rule.status === "passed" ? "text-emerald-400" : rule.status === "failed" ? "text-red-400" : "text-amber-400"}>{rule.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeActivity === "incubate" && (
                  <div className="flex flex-col">
                    <div className="p-2">
                      <div className="flex items-center gap-2 rounded border border-surface-750 bg-surface-950 px-2 py-1.5">
                        <Search className="h-3.5 w-3.5 text-surface-500" />
                        <input value={grantSearch} onChange={(e) => setGrantSearch(e.target.value)} placeholder="Search funding..." className="w-full bg-transparent text-xs outline-none placeholder:text-surface-500" />
                      </div>
                    </div>
                    <div>
                      {grantsLoading && (
                        <div className="px-3 py-2 text-[11px] text-surface-500">Loading funding opportunities...</div>
                      )}
                      {grantsError && (
                        <div className="px-3 py-2 text-[11px] text-red-400">{grantsError}</div>
                      )}
                      {opportunities.filter((g) => !grantSearch || (g.title || "").toLowerCase().includes(grantSearch.toLowerCase()) || (g.funder || "").toLowerCase().includes(grantSearch.toLowerCase())).map((g) => (
                        <button key={g.id} onClick={() => setSelectedGrant(g)} className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-surface-850 ${selectedGrant?.id === g.id ? "bg-surface-800" : ""}`}>
                          <span className="text-xs font-medium text-surface-200 leading-snug">{g.title}</span>
                          <span className="text-[11px] text-surface-500">{g.funder} · {g.currency} {g.amount_min ?? "-"}{g.amount_max ? `-${g.amount_max}` : ""} · {g.funding_type}</span>
                        </button>
                      ))}
                    </div>
                    {selectedGrant && (
                      <div className="m-3 rounded border border-surface-750 bg-surface-950 p-3">
                        <div className="text-xs font-medium text-surface-200">{selectedGrant.title}</div>
                        <div className="mt-1 text-[11px] text-surface-500">{selectedGrant.funder} · {selectedGrant.funding_type}</div>
                        {selectedGrant.description && (
                          <p className="mt-2 text-[11px] leading-relaxed text-surface-400">{selectedGrant.description}</p>
                        )}
                        {Array.isArray(selectedGrant.eligible_regions) && selectedGrant.eligible_regions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedGrant.eligible_regions.slice(0, 4).map((r: string) => (
                              <span key={r} className="rounded bg-surface-800 px-1.5 py-0.5 text-[10px] text-surface-300">{r}</span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            const url = selectedGrant.application_url || selectedGrant.source_url;
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="mt-2 w-full rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-500"
                        >
                          {selectedGrant.application_url || selectedGrant.source_url ? "Start Application" : "View Details"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeActivity === "kyc" && (
                  <div className="flex flex-col gap-3 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Identity Verification</div>
                    <select value={kycCountry} onChange={(e) => setKycCountry(e.target.value)} className="rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs outline-none">
                      <option>Nigeria</option>
                      <option>Kenya</option>
                      <option>Ethiopia</option>
                    </select>
                    <select value={kycIdType} onChange={(e) => setKycIdType(e.target.value)} className="rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs outline-none">
                      <option>National ID / NIN</option>
                      <option>Passport</option>
                      <option>Driver&apos;s License</option>
                    </select>
                    <button onClick={handleCreateKycSession} className="flex items-center justify-center gap-1.5 rounded bg-brand-600 py-1.5 text-xs font-medium text-white hover:bg-brand-500">
                      <Smartphone className="h-3.5 w-3.5" /> Create Session
                    </button>
                    {kycSessionId && (
                      <div className="flex flex-col items-center gap-2 rounded border border-surface-750 bg-surface-950 p-3">
                        <QrCodeView value={kycSessionId} size={160} />
                        <button onClick={handleSimulateKyc} disabled={kycStatus === "verified"} className="w-full rounded border border-surface-700 py-1.5 text-xs text-surface-200 hover:bg-surface-800 disabled:opacity-50">
                          {kycStatus === "verified" ? "Verified" : "Simulate Scan"}
                        </button>
                        {kycAuditHash && (
                          <div className="w-full text-center font-mono text-[10px] text-emerald-400 break-all">{kycAuditHash}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeActivity === "settings" && (
                  <div className="flex flex-col gap-4 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Editor</div>
                    <label className="flex items-center justify-between text-xs text-surface-300">
                      Font size
                      <input type="number" min={10} max={28} value={editorFontSize} onChange={(e) => setEditorFontSize(Number(e.target.value))} className="w-16 rounded border border-surface-750 bg-surface-950 px-2 py-1 text-xs outline-none" />
                    </label>
                    <label className="flex items-center justify-between text-xs text-surface-300">
                      Minimap
                      <button onClick={() => setEditorMinimap(!editorMinimap)} className={`relative h-4 w-7 rounded-full transition-colors ${editorMinimap ? "bg-brand-600" : "bg-surface-700"}`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${editorMinimap ? "left-3.5" : "left-0.5"}`} />
                      </button>
                    </label>
                    <label className="flex items-center justify-between text-xs text-surface-300">
                      Font ligatures
                      <button onClick={() => setFontLigatures(!fontLigatures)} className={`relative h-4 w-7 rounded-full transition-colors ${fontLigatures ? "bg-brand-600" : "bg-surface-700"}`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${fontLigatures ? "left-3.5" : "left-0.5"}`} />
                      </button>
                    </label>
                  </div>
                )}
              </div>
            </aside>
            <div onMouseDown={() => setIsResizingLeft(true)} className="w-px shrink-0 cursor-col-resize bg-surface-800 hover:bg-brand-500" />
          </>
        )}

        {/* Editor column */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b border-surface-800 bg-surface-900 overflow-x-auto">
            {openFiles.map((f) => {
              const dirty = isFileDirty(f);
              const isActive = f.path === activeFilePath;
              return (
                <div
                  key={f.path}
                  onClick={() => {
                    if (f.path !== activeFilePath) {
                      setActiveFilePath(f.path);
                      setEditorContent(f.content || "");
                    }
                  }}
                  className={`group flex h-full items-center gap-2 border-r border-surface-800 px-3 text-xs font-mono cursor-pointer transition-colors ${isActive ? "bg-surface-950 text-surface-100" : "text-surface-500 hover:text-surface-200"
                    }`}
                >
                  <FileTypeIcon name={f.name} />
                  <span className="whitespace-nowrap">{f.name}</span>
                  <div className="flex items-center justify-center w-3.5 h-3.5 ml-0.5">
                    {dirty ? (
                      <>
                        <span
                          className="h-2 w-2 rounded-full bg-brand-400 group-hover:hidden"
                          title="Unsaved changes"
                        />
                        <button
                          onClick={(e) => handleCloseTabRequest(e, f.path)}
                          className="hidden group-hover:flex items-center justify-center rounded p-0.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                          title="Close (Unsaved changes)"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleCloseTabRequest(e, f.path)}
                        className="rounded p-0.5 text-surface-500 opacity-0 group-hover:opacity-100 hover:bg-surface-800 hover:text-surface-200"
                        title="Close"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Breadcrumbs Bar */}
          <div className="flex h-6 shrink-0 items-center gap-1.5 border-b border-surface-800 bg-surface-900/90 px-3 text-[11px] text-surface-400 select-none overflow-x-auto">
            <span
              className="flex items-center gap-1 text-surface-400 hover:text-surface-200 cursor-pointer transition-colors"
              onClick={() => {
                setActiveActivity("explorer");
                setShowLeftSidebar(true);
              }}
              title="workspace root"
            >
              <Folder className="h-3 w-3 text-brand-400" />
              <span>workspace</span>
            </span>
            {activeFilePath.split("/").map((part, idx, arr) => {
              const isLast = idx === arr.length - 1;
              return (
                <React.Fragment key={idx}>
                  <ChevronRight className="h-3 w-3 text-surface-600 shrink-0" />
                  <span
                    className={`flex items-center gap-1 transition-colors ${isLast
                        ? "font-medium text-surface-200"
                        : "text-surface-400 hover:text-surface-200 cursor-pointer"
                      }`}
                  >
                    {isLast ? (
                      <FileTypeIcon name={part} />
                    ) : (
                      <Folder className="h-3 w-3 text-surface-500" />
                    )}
                    <span>{part}</span>
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden bg-surface-950">
            {openFiles.length === 0 ? (
              <WelcomeScreen
                projectName={blueprintData?.projectName || ideaForm.projectName || "Sovereign Agritech"}
                onNewFile={handleNewFile}
                onOpenQuickOpen={() => setShowQuickOpen(true)}
                onOpenIntake={() => setShowIntakeModal(true)}
                onOpenTerminal={() => {
                  setTerminalTab("terminal");
                  setShowBottomTerminal(true);
                }}
                onOpenShortcuts={() => setShowShortcutsModal(true)}
                onOpenFileByPath={(path) => {
                  const found = fileTree.find((f) => f.path === path);
                  if (found) {
                    if (!openFiles.some((f) => f.path === path)) {
                      setOpenFiles((prev) => [...prev, found]);
                    }
                    setActiveFilePath(path);
                    setEditorContent(found.content || "");
                  } else {
                    // Fallback create sample node
                    const sampleNode: FileNode = {
                      name: path.split("/").pop() || "file",
                      path,
                      type: "file",
                      content: path.endsWith(".geez")
                        ? `# geezcodE Domain Definition\nentity AgritechProducer {\n  id: UUID primary_key\n  name: string required\n  sovereignty_score: float default 1.0\n}\n`
                        : `# Sovereign Stack File: ${path}\n`,
                    };
                    setFileTree((prev) => [...prev, sampleNode]);
                    setOpenFiles((prev) => [...prev, sampleNode]);
                    setActiveFilePath(path);
                    setEditorContent(sampleNode.content || "");
                  }
                }}
                onOpenPlanning={() => {
                  setActiveActivity("plan");
                  setShowLeftSidebar(true);
                }}
                onOpenSwarm={() => {
                  setActiveActivity("swarm");
                  setShowLeftSidebar(true);
                }}
                onOpenPreview={() => {
                  setTerminalTab("preview");
                  setShowBottomTerminal(true);
                }}
              />
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
                >
                  <GeezCodeLogo
                    size={150}
                    showWordmark={true}
                    showTagline={true}
                    className="opacity-[0.10]"
                  />
                </div>
                <div className="geezcodE-editor relative z-10 h-full">
                  <MonacoEditor
                    height="100%"
                    language={getLanguage(activeFilePath)}
                    value={editorContent}
                    onChange={(v) => {
                      const val = v || "";
                      setEditorContent(val);
                      setOpenFiles((prev) =>
                        prev.map((f) => (f.path === activeFilePath ? { ...f, content: val } : f))
                      );
                    }}
                    theme="vs-dark"
                    onMount={(editor, monaco) => {
                      editorRef.current = editor;
                      monacoRef.current = monaco;
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                        handleSaveFile();
                      });
                      // Cmd/Ctrl+K — inline AI edit of the selection (or whole file).
                      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
                        const model = editor.getModel();
                        const sel = editor.getSelection();
                        inlineSelRef.current = model && sel ? model.getValueInRange(sel) : "";
                        setInlineEditPrompt("");
                        setInlineEditOpen(true);
                      });
                      editor.onDidChangeCursorPosition((e) => {
                        setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                      });
                      editor.onDidChangeCursorSelection((e) => {
                        const model = editor.getModel();
                        if (model) {
                          const text = model.getValueInRange(e.selection);
                          setSelectionCount(text.length);
                        }
                      });
                      // AI autocomplete (ghost text). Registered once; reads live
                      // config from completionCfgRef. Debounce + cancel-on-keystroke
                      // via Monaco's cancellation token.
                      monaco.languages.registerInlineCompletionsProvider("*", {
                        provideInlineCompletions: async (m: any, position: any, _ctx: any, tokenReq: any) => {
                          if (!completionCfgRef.current.enabled) return { items: [] };
                          const offset = m.getOffsetAt(position);
                          const full = m.getValue();
                          const prefix = full.slice(Math.max(0, offset - 4000), offset);
                          const suffix = full.slice(offset, offset + 1500);
                          await new Promise((r) => setTimeout(r, 350));
                          if (tokenReq?.isCancellationRequested) return { items: [] };
                          const text = await fetchCompletion(prefix, suffix, (m.getLanguageId && m.getLanguageId()) || "plaintext");
                          if (!text || tokenReq?.isCancellationRequested) return { items: [] };
                          return {
                            items: [
                              {
                                insertText: text,
                                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                              },
                            ],
                          };
                        },
                        freeInlineCompletions: () => { },
                      });
                    }}
                    beforeMount={(monaco) => registerGeezCodeLanguage(monaco)}
                    options={{
                      fontSize: editorFontSize,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontLigatures,
                      minimap: { enabled: editorMinimap },
                      wordWrap: wordWrap ? "on" : "off",
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      renderLineHighlight: "all",
                      tabSize: tabSize,
                      inlineSuggest: { enabled: true },
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {showBottomTerminal && (
            <>
              <div onMouseDown={() => setIsResizingBottom(true)} className="h-px shrink-0 cursor-row-resize bg-surface-800 hover:bg-brand-500" />
              <div style={{ height: `${bottomTerminalHeight}px` }} className="flex shrink-0 flex-col bg-[#121214]">
                {/* Antigravity Desktop Terminal Header & Tab bar */}
                <div className="flex h-8 items-center justify-between border-b border-surface-800/80 px-3 bg-surface-900/70 select-none text-xs min-w-0 overflow-hidden">
                  {/* Left: Tab System */}
                  <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto shrink">
                    {[
                      { id: "problems", label: "Problems", badge: problems.length },
                      { id: "output", label: "Output" },
                      { id: "terminal", label: "Terminal" },
                      { id: "preview", label: "Preview" },
                    ].map((t) => {
                      const isActive = terminalTab === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTerminalTab(t.id as any)}
                          className={`flex items-center gap-1.5 rounded-[4px] px-2.5 py-0.5 text-xs transition-colors ${isActive
                              ? "bg-surface-800 text-surface-100 font-medium"
                              : "text-surface-400 hover:text-surface-200 hover:bg-surface-800/40"
                            }`}
                        >
                          <span>{t.label}</span>
                          {t.badge !== undefined && (
                            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600/80 px-1 font-mono text-[10px] font-semibold text-white">
                              {t.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Desktop Shell & Window Action Bar */}
                  <div className="relative flex items-center gap-1 text-surface-400 shrink-0">
                    {/* Active Shell Selector Badge */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setShowShellDropdown((prev) => !prev);
                          setShowNewShellDropdown(false);
                        }}
                        className="flex items-center gap-1.5 rounded bg-surface-800/80 border border-surface-700/60 px-2 py-0.5 text-[11px] font-mono text-surface-200 hover:bg-surface-750 transition-colors"
                        title="Active Terminal Shell (Click to switch)"
                      >
                        <TerminalIcon className="h-3 w-3 text-brand-400" />
                        <span>{terminalSessions.find((s) => s.id === activeSessionId)?.title || "1: powershell"}</span>
                        <ChevronDown className="h-2.5 w-2.5 text-surface-400" />
                      </button>

                      {/* Shell Selector Dropdown */}
                      {showShellDropdown && (
                        <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-surface-750 bg-surface-900/98 backdrop-blur-md p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100 text-xs">
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-surface-500 tracking-wider">
                            Active Terminals
                          </div>
                          {terminalSessions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setActiveSessionId(s.id);
                                setTerminalTab("terminal");
                                setShowShellDropdown(false);
                              }}
                              className={`flex w-full items-center justify-between px-2 py-1.5 rounded text-left text-xs transition-colors ${activeSessionId === s.id
                                  ? "bg-surface-800 text-surface-100 font-medium"
                                  : "text-surface-300 hover:bg-surface-800/60 hover:text-surface-100"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <TerminalIcon className="h-3 w-3 text-brand-400" />
                                <span>{s.title}</span>
                              </div>
                              {activeSessionId === s.id && <Check className="h-3.5 w-3.5 text-primary-400" />}
                            </button>
                          ))}
                          <div className="my-1 border-t border-surface-800" />
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-surface-500 tracking-wider">
                            Switch Shell Profile
                          </div>
                          {(["powershell", "bash", "cmd", "wsl"] as const).map((sh) => (
                            <button
                              key={sh}
                              type="button"
                              onClick={() => {
                                setTerminalSessions((prev) =>
                                  prev.map((s) =>
                                    s.id === activeSessionId ? { ...s, shell: sh, title: `${s.title.split(":")[0]}: ${sh}` } : s
                                  )
                                );
                                setShowShellDropdown(false);
                                showToast(`Switched shell to ${sh}`);
                              }}
                              className="flex w-full items-center gap-2 px-2 py-1 rounded text-left text-xs text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                            >
                              <span className="font-mono text-[11px] lowercase text-surface-400">›</span>
                              <span>{sh === "cmd" ? "Command Prompt" : sh === "wsl" ? "WSL (Ubuntu)" : sh === "powershell" ? "PowerShell" : "Git Bash"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* New Instance (+) with Split Dropdown */}
                    <div className="relative flex items-center">
                      <button
                        onClick={() => {
                          const newNum = terminalSessions.length + 1;
                          const newId = `term-${Date.now()}`;
                          const newTitle = `${newNum}: powershell`;
                          setTerminalSessions((prev) => [...prev, { id: newId, title: newTitle, shell: "powershell" }]);
                          setActiveSessionId(newId);
                          setTerminalTab("terminal");
                          showToast(`Spawned ${newTitle}`);
                        }}
                        className="rounded-l p-1 hover:bg-surface-800 hover:text-surface-200 transition-colors"
                        title="New Terminal Instance (Ctrl+`)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNewShellDropdown((prev) => !prev);
                          setShowShellDropdown(false);
                        }}
                        className="rounded-r p-1 hover:bg-surface-800 hover:text-surface-200 transition-colors -ml-0.5"
                        title="Select Shell to Launch"
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>

                      {/* New Shell Profile Launcher Dropdown */}
                      {showNewShellDropdown && (
                        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-surface-750 bg-surface-900/98 backdrop-blur-md p-1 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-100 text-xs">
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase text-surface-500 tracking-wider">
                            Launch Shell
                          </div>
                          {[
                            { shell: "powershell", label: "PowerShell" },
                            { shell: "bash", label: "Git Bash" },
                            { shell: "cmd", label: "Command Prompt" },
                            { shell: "wsl", label: "WSL (Linux)" },
                          ].map((item) => (
                            <button
                              key={item.shell}
                              type="button"
                              onClick={() => {
                                const newNum = terminalSessions.length + 1;
                                const newId = `term-${Date.now()}`;
                                const newTitle = `${newNum}: ${item.shell}`;
                                setTerminalSessions((prev) => [...prev, { id: newId, title: newTitle, shell: item.shell as any }]);
                                setActiveSessionId(newId);
                                setTerminalTab("terminal");
                                setShowNewShellDropdown(false);
                                showToast(`Spawned ${newTitle}`);
                              }}
                              className="flex w-full items-center gap-2 px-2 py-1.5 rounded text-left text-xs text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                            >
                              <TerminalIcon className="h-3 w-3 text-brand-400" />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Agent Context Reference (@) */}
                    <button
                      onClick={() => {
                        setShowRightDock(true);
                        setDockInput((prev) =>
                          prev
                            ? `${prev} @terminal`
                            : "@terminal Please inspect the current terminal session output for any errors or status updates."
                        );
                        showToast("Referenced Terminal context in geez-agent");
                      }}
                      className="rounded p-1 hover:bg-surface-800 hover:text-brand-400 transition-colors"
                      title="Reference Terminal in AI Assistant (@)"
                    >
                      <AtSign className="h-3.5 w-3.5" />
                    </button>

                    {/* Split Terminal Pane */}
                    <button
                      onClick={() => {
                        setIsSplitTerminal((prev) => {
                          const next = !prev;
                          showToast(next ? "Terminal split view enabled (Dual View)" : "Terminal split view disabled");
                          return next;
                        });
                      }}
                      className={`rounded p-1 transition-colors ${isSplitTerminal
                          ? "bg-surface-800 text-brand-400 font-semibold"
                          : "hover:bg-surface-800 hover:text-surface-200"
                        }`}
                      title={isSplitTerminal ? "Unsplit Terminal" : "Split Terminal View (Side-by-Side)"}
                    >
                      <Columns className="h-3.5 w-3.5" />
                    </button>

                    {/* Kill Terminal / Clear Logs */}
                    <button
                      onClick={() => {
                        if (terminalSessions.length > 1) {
                          const filtered = terminalSessions.filter((s) => s.id !== activeSessionId);
                          setTerminalSessions(filtered);
                          setActiveSessionId(filtered[0]?.id || "term-1");
                          showToast("Killed active terminal session");
                        } else {
                          setTerminalLogs([]);
                          setActiveSessionId(`term-${Date.now()}`);
                          setTerminalSessions([{ id: `term-${Date.now()}`, title: "1: powershell", shell: "powershell" }]);
                          showToast("Terminal buffer cleared and reinitialized");
                        }
                      }}
                      className="rounded p-1 hover:bg-surface-800 hover:text-rose-400 transition-colors"
                      title="Kill Active Terminal Session / Clear Buffer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-3 w-px bg-surface-800 mx-0.5" />

                    {/* Maximize / Restore Panel Size */}
                    <button
                      onClick={() => {
                        setBottomTerminalHeight((prev) => (prev > 300 ? 180 : 420));
                      }}
                      className="rounded p-1 hover:bg-surface-800 hover:text-surface-200 transition-colors"
                      title={bottomTerminalHeight > 300 ? "Restore Panel Size" : "Maximize Terminal Panel"}
                    >
                      {bottomTerminalHeight > 300 ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </button>

                    {/* Close Panel */}
                    <button
                      onClick={() => setShowBottomTerminal(false)}
                      className="rounded p-1 hover:bg-surface-800 hover:text-surface-200 transition-colors"
                      title="Close Panel (Ctrl+J)"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tab body — fills remaining height with Split Terminal Support */}
                <div className="min-h-0 flex-1 overflow-hidden">
                  {/* ── Live xterm.js Terminal with Split Support ── */}
                  {terminalTab === "terminal" && (
                    <div className={`h-full w-full ${isSplitTerminal ? "grid grid-cols-2 divide-x divide-surface-800" : ""}`}>
                      <XTerminalPanel key={activeSessionId} className="h-full w-full" />
                      {isSplitTerminal && (
                        <XTerminalPanel key="term-split-dual" className="h-full w-full" />
                      )}
                    </div>
                  )}

                  {/* ── Sandboxed Preview ── */}
                  {terminalTab === "preview" && (
                    <SandboxPreview
                      initialUrl={previewUrl}
                      className="h-full"
                      onClose={() => setTerminalTab("terminal")}
                    />
                  )}

                  {/* ── Problems ── */}
                  {terminalTab === "problems" && (
                    <div className="overflow-y-auto h-full p-1 text-xs">
                      {runningTests && (
                        <div className="flex items-center gap-2 p-2 text-surface-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" /> Running tests…
                        </div>
                      )}
                      {problems.length === 0 ? (
                        <div className="flex items-center gap-2 p-3 text-surface-400">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> No problems detected. Run a file or the test suite to check.
                        </div>
                      ) : (
                        problems.map((p, i) => (
                          <button
                            key={`${p.file}:${p.line}:${i}`}
                            onClick={() => handleSearchResultClick({ file: p.file, line: p.line, text: p.message })}
                            className="flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-surface-800/60"
                          >
                            <AlertCircle className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${p.severity === "error" ? "text-red-400" : "text-amber-400"}`} />
                            <span className="flex-1">
                              <span className="text-surface-200">{p.message}</span>
                              <span className="ml-2 text-surface-500">
                                {p.file}:{p.line}
                                {p.source ? ` · ${p.source}` : ""}
                              </span>
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Build Output ── */}
                  {terminalTab === "output" && (
                    <div className="overflow-y-auto h-full p-2 font-mono text-xs">
                      {isBuilding ? (
                        <div className="flex items-center gap-2 text-surface-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" /> {activeLiveTask}
                        </div>
                      ) : terminalLogs.length > 0 ? (
                        terminalLogs.map((line, i) => (
                          <div key={i} className="whitespace-pre-wrap text-surface-300">{line}</div>
                        ))
                      ) : (
                        <span className="text-surface-600">Build output will appear here.</span>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </>
          )}
        </main>


        {/* Right dock (AI assistant) */}
        {showRightDock && (
          <>
            <div onMouseDown={() => setIsResizingRight(true)} className="w-px shrink-0 cursor-col-resize bg-surface-800 hover:bg-brand-500" />
            <aside style={{ width: `${rightDockWidth}px` }} className="flex shrink-0 flex-col border-l border-surface-800 bg-[#121214]">
              {/* AI Dock Header */}
              <div className="flex h-9 items-center justify-between border-b border-surface-800/80 px-3 bg-surface-900/60 select-none">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/15 text-brand-400 border border-brand-500/30">
                    <Bot className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-semibold text-surface-200">geez-agent</span>
                  <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-surface-400">{tokensUsed.toLocaleString()} tokens</span>
                  <button
                    type="button"
                    onClick={() => setShowRightDock(false)}
                    className="rounded p-0.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
                    title="Close AI Panel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                {dockMessages.map((m) => (
                  <div key={m.id} className="group space-y-2">
                    {m.sender === "user" ? (
                      /* User Prompt Pill */
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-xl bg-[#27272a] border border-surface-700/60 px-3 py-2 text-xs text-surface-100 shadow-sm leading-relaxed">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      /* Assistant Canvas Flow */
                      <div className="space-y-2 text-surface-200 leading-relaxed">
                        {/* Collapsible Reasoning / Thought */}
                        {m.thought && (
                          <details className="group/thought rounded-md bg-surface-950/60 border border-surface-800/80 text-[11px] text-surface-400">
                            <summary className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer select-none text-surface-400 hover:text-surface-200 transition-colors">
                              <ChevronRight className="h-3 w-3 transition-transform group-open/thought:rotate-90 text-surface-500 shrink-0" />
                              <span className="font-medium text-surface-300">Worked for a moment</span>
                              <span className="ml-auto font-mono text-[10px] text-surface-500">1m</span>
                            </summary>
                            <div className="px-3 pb-2 pt-1 border-t border-surface-800/50 font-mono text-[10.5px] italic text-surface-400/90 whitespace-pre-wrap leading-relaxed">
                              {m.thought}
                            </div>
                          </details>
                        )}

                        {/* Direct Markdown / Response Text */}
                        <div className="text-surface-200 whitespace-pre-wrap leading-relaxed">
                          {m.text}
                        </div>

                        {/* Interactive File Modifications / Diff Cards */}
                        {m.filesModified && m.filesModified.length > 0 && (
                          <div className="rounded-lg border border-surface-800 bg-[#161618] p-2 space-y-1.5 my-2">
                            <div className="flex items-center justify-between text-[11px] text-surface-400 px-1">
                              <span className="font-medium text-surface-300">
                                {m.filesModified.length} {m.filesModified.length === 1 ? "file" : "files"} changed
                              </span>
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="text-emerald-400 font-semibold">+42</span>
                                <span className="text-rose-400 font-semibold">-12</span>
                              </div>
                            </div>
                            {m.filesModified.map((f) => (
                              <div key={f} className="flex items-center justify-between rounded-md bg-surface-900/90 border border-surface-800 px-2.5 py-1.5 text-[11px]">
                                <span className="font-mono text-surface-300 truncate max-w-[180px]" title={f}>{f}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const existing = openFiles.find((x) => x.path === f);
                                    if (!existing) {
                                      const content = findFileContentByPath(fileTree, f) || "";
                                      setOpenFiles((prev) => [...prev, { name: f.split("/").pop() || f, path: f, type: "file", content, savedContent: content }]);
                                    }
                                    setActiveFilePath(f);
                                  }}
                                  className="flex items-center gap-1 rounded border border-surface-700 bg-surface-800 px-2 py-0.5 text-[10px] font-medium text-surface-200 hover:bg-surface-700 transition-colors shrink-0"
                                >
                                  <FileText className="h-2.5 w-2.5" /> Review
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Micro-actions Bar */}
                        <div className="flex items-center gap-3 pt-1 text-surface-500 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(m.text);
                              showToast("Copied response to clipboard");
                            }}
                            className="hover:text-surface-200 transition-colors"
                            title="Copy response"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button type="button" className="hover:text-surface-200 transition-colors" title="Good response">
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button type="button" className="hover:text-surface-200 transition-colors" title="Poor response">
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={dockEndRef} />
              </div>

              {/* Sticky Batch Review & Approval Bar (Antigravity Signature UX) */}
              {pendingReview && (
                <div className="flex items-center justify-between border-t border-surface-800 bg-[#16161a] px-3 py-2 text-xs shadow-lg animate-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center gap-2 text-surface-300 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate text-surface-200 font-medium" title={pendingReview.filePath}>
                      {pendingReview.filePath}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRejectPendingFile()}
                      className="text-xs text-surface-400 hover:text-surface-100 font-medium px-2 py-1 transition-colors"
                    >
                      Reject all
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePendingFile()}
                      className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 shadow transition-colors"
                    >
                      Accept all
                    </button>
                  </div>
                </div>
              )}

              {/* Integrated Modern Input Form */}
              <form onSubmit={handleSendDockMessage} className="border-t border-surface-800 p-2.5 bg-surface-900">
                <div className="rounded-xl border border-surface-750/80 bg-[#151517] p-2.5 shadow-inner focus-within:border-brand-500/60 transition-colors">
                  {/* Card Header Controls */}
                  <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-surface-800/60 select-none">
                    {/* Autopilot Mode Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        setAutopilot(!autopilot);
                        if (!autopilot) setPendingReview(null);
                      }}
                      className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
                      title={autopilot ? "Autopilot active: Autonomous code generation" : "Interactive active: Requires manual approval"}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${autopilot ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                      <span>{autopilot ? "Autopilot" : "Interactive"}</span>
                      <ChevronDown className="h-2.5 w-2.5 text-surface-500" />
                    </button>

                    {/* Codebase-aware retrieval (pgvector) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!codebaseIndexed && !indexingCodebase) handleIndexCodebase();
                        else if (!indexingCodebase) setCodebaseRetrieval((v) => !v);
                      }}
                      disabled={indexingCodebase}
                      className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-60 ${codebaseIndexed && codebaseRetrieval
                          ? "bg-brand-500/15 text-brand-300"
                          : "text-surface-300 hover:bg-surface-800 hover:text-surface-100"
                        }`}
                      title={codebaseIndexed ? "Toggle codebase-aware retrieval (pgvector)" : "Index the workspace for semantic retrieval"}
                    >
                      {indexingCodebase ? <Loader2 className="h-3 w-3 animate-spin text-brand-400" /> : <Sparkles className="h-3 w-3 text-brand-400" />}
                      <span>{indexingCodebase ? "Indexing…" : codebaseIndexed ? (codebaseRetrieval ? "Codebase: on" : "Codebase: off") : "Index codebase"}</span>
                    </button>

                    {/* Model Selector Pill */}
                    <div className="flex items-center gap-1 text-[10px] font-mono text-surface-400">
                      <Cpu className="h-3 w-3 text-brand-400 shrink-0" />
                      <select
                        value={selectedModel}
                        onChange={(e) => {
                          if (e.target.value === "__manage__") { setShowProvidersModal(true); return; }
                          setSelectedModel(e.target.value);
                        }}
                        className="bg-transparent text-[10px] text-surface-300 outline-none cursor-pointer font-mono hover:text-surface-100 max-w-[160px]"
                      >
                        <optgroup label="Google Gemini">
                          {(models.length > 0 ? models : [
                            { id: "gemini-flash-latest", name: "Gemini Flash (latest)" },
                            { id: "gemini-pro-latest", name: "Gemini Pro (latest)" },
                            { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
                          ]).map((m: any) => (
                            <option key={m.id} value={m.id} className="bg-surface-900">{m.name.split(" (")[0]}</option>
                          ))}
                        </optgroup>
                        {customProviders.length > 0 && (
                          <optgroup label="Custom providers (your key)">
                            {customProviders.map((p) => (
                              <option key={p.id} value={`custom:${p.id}`} className="bg-surface-900">
                                {p.label}: {p.model}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <option value="__manage__" className="bg-surface-900">＋ Add / manage providers…</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowProvidersModal(true)}
                        title="Add a free / custom AI provider (your own API key)"
                        className="text-surface-500 hover:text-brand-400 transition-colors"
                      >
                        <Settings className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutocompleteEnabled((v) => !v)}
                        title={autocompleteEnabled ? "AI autocomplete: on (click to disable)" : "AI autocomplete: off (click to enable)"}
                        className={`rounded px-1 text-[10px] font-medium transition-colors ${autocompleteEnabled ? "text-brand-300" : "text-surface-600 hover:text-surface-300"}`}
                      >
                        AC
                      </button>
                    </div>
                  </div>

                  {/* @-mention context: chips + searchable file picker */}
                  <div className="relative mb-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { setMentionOpen((o) => !o); setMentionQuery(""); }}
                        className="flex items-center gap-1 rounded bg-surface-800 px-1.5 py-0.5 text-[10px] text-surface-300 hover:bg-surface-750 hover:text-surface-100 transition-colors"
                        title="Attach a workspace file as context"
                      >
                        <span className="text-brand-400 font-semibold">@</span> Add context
                      </button>
                      {mentionedPaths.map((p) => (
                        <span key={p} className="flex items-center gap-1 rounded bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 text-[10px] text-brand-300">
                          {p.split("/").pop()}
                          <button type="button" onClick={() => setMentionedPaths((prev) => prev.filter((x) => x !== p))} className="text-brand-400 hover:text-white leading-none">×</button>
                        </span>
                      ))}
                    </div>
                    {mentionOpen && (
                      <div className="absolute bottom-full left-0 z-20 mb-1 w-72 overflow-hidden rounded-lg border border-surface-700 bg-[#161618] shadow-xl">
                        <input
                          autoFocus
                          value={mentionQuery}
                          onChange={(e) => setMentionQuery(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setMentionOpen(false); }}
                          placeholder="Search workspace files…"
                          className="w-full border-b border-surface-800 bg-transparent px-2.5 py-1.5 text-[11px] text-surface-100 outline-none placeholder:text-surface-600"
                        />
                        <div className="max-h-44 overflow-y-auto py-1">
                          {(() => {
                            const matches = allWorkspaceFilePaths().filter(
                              (p) => !mentionedPaths.includes(p) && p.toLowerCase().includes(mentionQuery.toLowerCase())
                            );
                            if (matches.length === 0) {
                              return <div className="px-2.5 py-2 text-[11px] text-surface-600">No matching files</div>;
                            }
                            return matches.slice(0, 50).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => { setMentionedPaths((prev) => [...prev, p]); setMentionOpen(false); }}
                                className="flex w-full items-center gap-1.5 px-2.5 py-1 text-left text-[11px] text-surface-300 hover:bg-surface-800"
                              >
                                <FileTypeIcon name={p.split("/").pop() || p} />
                                <span className="truncate">{p}</span>
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-line Prompt Input */}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={dockInput}
                      onChange={(e) => setDockInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendDockMessage(e);
                        }
                      }}
                      rows={2}
                      placeholder="Ask or steer the agent..."
                      className="flex-1 resize-none bg-transparent text-xs text-surface-100 outline-none placeholder:text-surface-500 leading-relaxed max-h-28 overflow-y-auto font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!dockInput.trim()}
                      className="rounded-lg p-1.5 bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-30 disabled:hover:bg-brand-600 transition-all shrink-0 shadow-sm"
                      title="Send message (Enter)"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </aside>
          </>
        )}
      </div>

      {/* ===== Professional Status bar ===== */}
      <footer className="flex h-6 shrink-0 items-center justify-between border-t border-surface-800 bg-surface-900 px-3 text-[11px] text-surface-400 select-none overflow-x-auto">
        {/* Left Status Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveActivity("git");
              setShowLeftSidebar(true);
            }}
            title={`Git branch: ${gitBranch} (Click to open Source Control)`}
            className="flex items-center gap-1 hover:text-surface-200 transition-colors cursor-pointer"
          >
            <GitBranch className="h-3 w-3 text-brand-400" />
            <span>{gitBranch}</span>
            <RefreshCw className="h-2.5 w-2.5 text-surface-500 ml-0.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setTerminalTab("problems");
              setShowBottomTerminal(true);
            }}
            title="0 Errors, 0 Warnings (Click to view Problems panel)"
            className="flex items-center gap-1.5 hover:text-surface-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-0.5 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> 0
            </span>
            <span className="flex items-center gap-0.5 text-surface-500">
              <AlertCircle className="h-3 w-3" /> 0
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveActivity("swarm");
              setShowLeftSidebar(true);
            }}
            title={`Build status: ${isBuilding ? "Executing" : "Idle"}`}
            className="flex items-center gap-1 hover:text-surface-200 transition-colors cursor-pointer"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isBuilding ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-surface-400">{isBuilding ? "Build: Running" : "Build: Ready"}</span>
          </button>

          {/* Save Status / Dirty Indicator */}
          <button
            type="button"
            onClick={() => handleSaveFile()}
            title={dirtyFilesCount > 0 ? `${dirtyFilesCount} unsaved file(s) — Click to Save (Ctrl+S)` : "All changes saved to disk"}
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors cursor-pointer ${dirtyFilesCount > 0
                ? "text-brand-300 hover:bg-surface-800/80 hover:text-brand-200"
                : "text-surface-400 hover:bg-surface-800/60 hover:text-surface-200"
              }`}
          >
            {dirtyFilesCount > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="font-sans font-medium text-[11px]">{dirtyFilesCount} unsaved</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="font-sans text-[11px] text-surface-400">Saved</span>
              </>
            )}
          </button>

          {/* Auto-Save toggle */}
          <button
            type="button"
            onClick={() => setAutoSave(!autoSave)}
            title="Toggle Auto-Save (1.5s debounce)"
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer font-sans text-[11px] ${autoSave ? "text-emerald-400 hover:bg-surface-800/60" : "text-surface-500 hover:text-surface-300"
              }`}
          >
            <span>Auto-Save:</span>
            <span className="font-medium">{autoSave ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center gap-3 shrink-0 font-mono text-[10.5px]">
          {/* Cursor Position (Click to Go to Line) */}
          <button
            type="button"
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.getAction("editor.action.gotoLine")?.run();
              }
            }}
            title="Go to Line/Column (Ctrl+G)"
            className="hover:text-surface-200 hover:bg-surface-800/60 px-1 py-0.5 rounded transition-colors cursor-pointer"
          >
            Ln {cursorPos.line}, Col {cursorPos.col}
            {selectionCount > 0 && ` (${selectionCount} selected)`}
          </button>

          {/* Tab Size */}
          <button
            type="button"
            onClick={() => {
              const nextSize = tabSize === 4 ? 2 : 4;
              setTabSize(nextSize);
              if (editorRef.current) {
                editorRef.current.updateOptions({ tabSize: nextSize });
              }
            }}
            title="Click to toggle indentation (Spaces: 2 / 4)"
            className="hover:text-surface-200 hover:bg-surface-800/60 px-1 py-0.5 rounded transition-colors cursor-pointer"
          >
            Spaces: {tabSize}
          </button>

          {/* Encoding & EOL */}
          <span className="text-surface-500">UTF-8</span>
          <span className="text-surface-500">LF</span>

          {/* Language Mode */}
          <button
            type="button"
            onClick={() => {
              if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.getAction("editor.action.quickCommand")?.run();
              }
            }}
            title="Select Language Mode"
            className="hover:text-surface-200 hover:bg-surface-800/60 px-1 py-0.5 rounded transition-colors cursor-pointer text-brand-400 font-medium capitalize"
          >
            {getLanguage(activeFilePath)}
          </button>

          {/* AI Model Badge */}
          <span className="flex items-center gap-1 text-surface-400 font-sans text-[11px]">
            <Cpu className="h-3 w-3 text-surface-500" />
            <span>{selectedModel}</span>
          </span>

          {/* Prettier / Formatting Status */}
          <span className="flex items-center gap-1 text-surface-500 font-sans text-[11px]" title="Prettier Formatter Active">
            <Check className="h-3 w-3 text-emerald-400" />
            <span>Prettier</span>
          </span>
        </div>
      </footer>

      {/* ===== Intake modal ===== */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-surface-750 bg-surface-900 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-400" />
                <span className="text-sm font-medium text-surface-100">Architect Intake</span>
              </div>
              <button onClick={() => setShowIntakeModal(false)} className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-0 border-b border-surface-800 px-4">
              {(["concept", "tech", "features"] as const).map((t) => (
                <button key={t} onClick={() => setIntakeTab(t)} className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${intakeTab === t ? "border-brand-500 text-surface-100" : "border-transparent text-surface-500 hover:text-surface-300"}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {intakeTab === "concept" && (
                <>
                  <Field label="Project name">
                    <input value={ideaForm.projectName} onChange={(e) => setIdeaForm({ ...ideaForm, projectName: e.target.value })} className="input" />
                  </Field>
                  <Field label="One-liner">
                    <input value={ideaForm.oneLiner} onChange={(e) => setIdeaForm({ ...ideaForm, oneLiner: e.target.value })} className="input" />
                  </Field>
                  <Field label="Problem">
                    <textarea rows={2} value={ideaForm.problem} onChange={(e) => setIdeaForm({ ...ideaForm, problem: e.target.value })} className="input resize-none" />
                  </Field>
                  <Field label="Target users">
                    <textarea rows={2} value={ideaForm.targetUsers} onChange={(e) => setIdeaForm({ ...ideaForm, targetUsers: e.target.value })} className="input resize-none" />
                  </Field>
                  <Field label="Business model">
                    <input value={ideaForm.businessModel} onChange={(e) => setIdeaForm({ ...ideaForm, businessModel: e.target.value })} className="input" />
                  </Field>
                  <Field label="Monetization">
                    <input value={ideaForm.monetization} onChange={(e) => setIdeaForm({ ...ideaForm, monetization: e.target.value })} className="input" />
                  </Field>
                </>
              )}

              {intakeTab === "tech" && (
                <>
                  <Field label="Platform">
                    <input value={ideaForm.platform} onChange={(e) => setIdeaForm({ ...ideaForm, platform: e.target.value })} className="input" />
                  </Field>
                  <Field label="Tech preferences">
                    <input value={ideaForm.techPreferences} onChange={(e) => setIdeaForm({ ...ideaForm, techPreferences: e.target.value })} className="input" />
                  </Field>
                  <Field label="Team skill">
                    <input value={ideaForm.teamSkill} onChange={(e) => setIdeaForm({ ...ideaForm, teamSkill: e.target.value })} className="input" />
                  </Field>
                  <Field label="Timeline">
                    <input value={ideaForm.timeline} onChange={(e) => setIdeaForm({ ...ideaForm, timeline: e.target.value })} className="input" />
                  </Field>
                  <Field label="Success criteria">
                    <textarea rows={2} value={ideaForm.successCriteria} onChange={(e) => setIdeaForm({ ...ideaForm, successCriteria: e.target.value })} className="input resize-none" />
                  </Field>
                </>
              )}

              {intakeTab === "features" && (
                <>
                  <Field label="Core features">
                    <div className="space-y-1.5">
                      {ideaForm.coreFeatures.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs text-surface-200">
                          <span className="flex-1">{f}</span>
                          <button onClick={() => setIdeaForm({ ...ideaForm, coreFeatures: ideaForm.coreFeatures.filter((_, j) => j !== i) })} className="text-surface-500 hover:text-red-400">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={newFeatureInput} onChange={(e) => setNewFeatureInput(e.target.value)} placeholder="Add feature" className="input" />
                        <button onClick={() => { if (newFeatureInput.trim()) { setIdeaForm({ ...ideaForm, coreFeatures: [...ideaForm.coreFeatures, newFeatureInput.trim()] }); setNewFeatureInput(""); } }} className="btn-secondary shrink-0 px-3"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </Field>
                  <Field label="Integrations">
                    <div className="space-y-1.5">
                      {ideaForm.integrations.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 rounded border border-surface-750 bg-surface-950 px-2 py-1.5 text-xs text-surface-200">
                          <span className="flex-1">{f}</span>
                          <button onClick={() => setIdeaForm({ ...ideaForm, integrations: ideaForm.integrations.filter((_, j) => j !== i) })} className="text-surface-500 hover:text-red-400">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={newIntegrationInput} onChange={(e) => setNewIntegrationInput(e.target.value)} placeholder="Add integration" className="input" />
                        <button onClick={() => { if (newIntegrationInput.trim()) { setIdeaForm({ ...ideaForm, integrations: [...ideaForm.integrations, newIntegrationInput.trim()] }); setNewIntegrationInput(""); } }} className="btn-secondary shrink-0 px-3"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </Field>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-surface-800 px-4 py-3">
              <button onClick={() => setShowIntakeModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleGenerateBlueprint(true)} disabled={isGenerating} className="btn-primary">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                Generate Blueprint
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Blueprint modal ===== */}
      {showBlueprintModal && blueprintData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-surface-750 bg-surface-900 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-surface-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-brand-400" />
                  <span className="text-sm font-semibold text-surface-100">Architect Blueprint Preview</span>
                </div>
                <span className="rounded bg-surface-800 px-2 py-0.5 font-mono text-xs text-brand-400">{blueprintData.projectName}</span>
                <span className="rounded bg-surface-800 px-1.5 py-0.5 text-[10px] text-surface-400">{blueprintData.completeness}% complete</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowBlueprintModal(false);
                    setShowIntakeModal(true);
                  }}
                  className="rounded px-2.5 py-1 text-xs font-medium bg-surface-800 text-brand-400 hover:bg-surface-750 transition-colors flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Edit (Architect Intake)
                </button>
                <button onClick={() => setShowBlueprintModal(false)} className="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-0 border-b border-surface-800 px-4">
              {(["overview", "arch", "data", "modules", "milestones", "json"] as const).map((t) => (
                <button key={t} onClick={() => setBlueprintTab(t)} className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${blueprintTab === t ? "border-brand-500 text-surface-100" : "border-transparent text-surface-500 hover:text-surface-300"}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {blueprintTab === "overview" && (
                <div className="space-y-3 text-sm text-surface-300">
                  <p className="text-surface-200">{blueprintData.summary}</p>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-surface-500">Tech stack</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[...(blueprintData.techStack.languages || []), ...(blueprintData.techStack.frameworks || []), ...(blueprintData.techStack.databases || []), ...(blueprintData.techStack.infra || [])].map((t) => (
                        <span key={t} className="rounded border border-surface-750 bg-surface-950 px-2 py-0.5 font-mono text-[11px] text-surface-300">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-surface-500">Directory structure</div>
                    <pre className="rounded border border-surface-750 bg-surface-950 p-3 font-mono text-[11px] text-surface-300 overflow-x-auto">{blueprintData.directoryStructure}</pre>
                  </div>
                </div>
              )}
              {blueprintTab === "arch" && (
                <pre className="rounded border border-surface-750 bg-surface-950 p-3 font-mono text-[11px] text-surface-300 overflow-x-auto whitespace-pre">{blueprintData.systemArchitecture}</pre>
              )}
              {blueprintTab === "data" && (
                <div className="space-y-3">
                  {Array.isArray(blueprintData.databaseSchema) ? (
                    <pre className="text-sm text-surface-300">{blueprintData.databaseSchema.join("\n")}</pre>
                  ) : (
                    Object.entries(blueprintData.databaseSchema).map(([table, cols]) => (
                      <div key={table} className="rounded border border-surface-750 bg-surface-950 p-3">
                        <div className="mb-1.5 font-mono text-xs font-semibold text-brand-400">{table}</div>
                        <div className="space-y-0.5">
                          {(cols as string[]).map((c) => <div key={c} className="font-mono text-[11px] text-surface-400">{c}</div>)}
                        </div>
                      </div>
                    ))
                  )}
                  <div className="rounded border border-surface-750 bg-surface-950 p-3">
                    <div className="mb-1 text-xs font-semibold text-surface-300">API design</div>
                    {Array.isArray(blueprintData.apiDesign) && blueprintData.apiDesign.map((ep) => (
                      <div key={ep.path} className="flex items-center gap-2 font-mono text-[11px] text-surface-400">
                        <span className="text-brand-400">{ep.method}</span> {ep.path} <span className="text-surface-600">— {ep.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {blueprintTab === "modules" && (
                <div className="space-y-3">
                  {blueprintData.coreModules.map((m) => (
                    <div key={m.id} className="rounded border border-surface-750 bg-surface-950 p-3">
                      <div className="text-xs font-medium text-surface-200">{m.id} · {m.name}</div>
                      <p className="mt-1 text-xs text-surface-400">{m.purpose}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.files.map((f) => <span key={f} className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-300">{f}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {blueprintTab === "milestones" && (
                <div className="space-y-3">
                  {blueprintData.milestones.map((m) => (
                    <div key={m.id} className="rounded border border-surface-750 bg-surface-950 p-3">
                      <div className="text-xs font-medium text-surface-200">{m.id} · {m.name}</div>
                      <p className="mt-1 text-xs text-surface-400">{m.objective}</p>
                    </div>
                  ))}
                </div>
              )}
              {blueprintTab === "json" && (
                <pre className="rounded border border-surface-750 bg-surface-950 p-3 font-mono text-[11px] text-surface-300 overflow-x-auto whitespace-pre">{jsonText}</pre>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-surface-800 px-4 py-3">
              <span className="text-xs text-surface-500">Generated by {blueprintData.generatedBy}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBlueprintModal(false)} className="btn-secondary">Close</button>
                <button
                  onClick={handleSyncProject}
                  disabled={syncStatus === "syncing" || syncStatus === "synced"}
                  className="btn-primary flex items-center gap-2"
                >
                  {syncStatus === "syncing" && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                  {syncStatus === "synced" && <Check className="h-4 w-4 text-emerald-400" />}
                  {syncStatus === "syncing" && "Project Syncing..."}
                  {syncStatus === "synced" && "Synced ✓"}
                  {syncStatus === "idle" && "Sync this project →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Pending review overlay with Visual Monaco Diff Editor ===== */}
      {pendingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="flex flex-col h-[82vh] w-full max-w-5xl rounded-xl border border-surface-750 bg-surface-900 shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-800 bg-surface-950/70 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-surface-100">Visual Diff Review</span>
                    <span className="rounded bg-brand-500/15 border border-brand-500/30 px-2 py-0.5 font-mono text-[11px] text-brand-400 font-medium">
                      {pendingReview.filePath}
                    </span>
                    {pendingEditQueue.length > 0 && (
                      <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        +{pendingEditQueue.length} more file{pendingEditQueue.length === 1 ? "" : "s"} queued
                      </span>
                    )}
                    <span className="flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      <Activity className="h-3 w-3 animate-pulse" /> Diff Review
                    </span>
                  </div>
                  <div className="text-[11px] text-surface-400">
                    Generated by <span className="text-surface-200 font-medium">{pendingReview.agentName}</span> · Milestone {pendingReview.milestoneId}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-surface-750 bg-surface-950 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDiffSideBySide(true)}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium ${diffSideBySide ? "bg-brand-600 text-white shadow" : "text-surface-400 hover:text-surface-200"
                      }`}
                  >
                    Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiffSideBySide(false)}
                    className={`px-2.5 py-1 rounded-md transition-colors font-medium ${!diffSideBySide ? "bg-brand-600 text-white shadow" : "text-surface-400 hover:text-surface-200"
                      }`}
                  >
                    Inline Diff
                  </button>
                </div>
              </div>
            </div>

            {/* Monaco Diff Editor Body */}
            <div className="flex-1 min-h-0 bg-surface-950">
              <MonacoDiffEditor
                height="100%"
                language={getLanguage(pendingReview.filePath)}
                original={pendingReview.originalContent ?? findFileContentByPath(fileTree, pendingReview.filePath) ?? ""}
                modified={pendingReview.newContent}
                theme="vs-dark"
                beforeMount={(monaco) => registerGeezCodeLanguage(monaco)}
                options={{
                  renderSideBySide: diffSideBySide,
                  readOnly: true,
                  automaticLayout: true,
                  fontSize: editorFontSize,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  diffWordWrap: "on",
                }}
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-surface-800 bg-surface-950/70 px-4 py-3">
              <div className="text-xs text-surface-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>Interactive mode: founder verification required before workspace persistence.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRejectPendingFile()}
                  className="rounded-lg border border-surface-700 bg-surface-800 px-3.5 py-1.5 text-xs font-medium text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                >
                  Reject & Steer
                </button>
                <button
                  type="button"
                  onClick={handleApprovePendingFile}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Check className="h-4 w-4" /> Approve & Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Generating Blueprint Transition Overlay ===== */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-950/85 backdrop-blur-md animate-fade-in p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-16 w-16 animate-ping rounded-full bg-brand-500/20" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/40 bg-surface-900 shadow-2xl">
                <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-surface-100">
                Generating <span className="text-brand-400">{ideaForm.projectName || "Sovereign"}</span> Blueprint...
              </h2>
              <p className="mt-1 text-xs text-surface-400">
                Chief Architect agent is formulating the zero-question architectural specification and directory structure.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== IDE Native Prompt Modal ===== */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-surface-750 bg-surface-900 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-sm font-semibold text-surface-100">{promptTitle}</h3>
            <p className="mt-1 text-xs text-surface-400">Enter target relative path in the workspace:</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (promptCallback && promptInputValue.trim()) {
                  promptCallback(promptInputValue);
                }
                setShowPromptModal(false);
              }}
              className="mt-4 space-y-4"
            >
              <input
                autoFocus
                type="text"
                className="input w-full font-mono text-xs"
                placeholder={promptPlaceholder}
                value={promptInputValue}
                onChange={(e) => setPromptInputValue(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== IDE Native Alert Modal ===== */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg border border-surface-750 bg-surface-900 p-6 shadow-2xl animate-scale-in text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3">
              <Check className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-surface-100">Notification</h3>
            <p className="mt-2 text-xs text-surface-300">{alertMessage}</p>
            <div className="mt-5">
              <button
                onClick={() => setShowAlertModal(false)}
                className="btn-primary w-full text-xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== Quick Open File Modal (Ctrl+P) ===== */}
      <QuickOpenModal
        isOpen={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
        files={fileTree as any}
        onSelectFile={(path) => {
          const found = fileTree.find((f) => f.path === path);
          if (found) {
            if (!openFiles.some((f) => f.path === path)) {
              setOpenFiles((prev) => [...prev, found]);
            }
            setActiveFilePath(path);
            setEditorContent(found.content || "");
          }
        }}
      />

      {/* ===== Cmd+K Inline Edit prompt ===== */}
      {inlineEditOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[18vh]" onClick={() => !inlineEditBusy && setInlineEditOpen(false)}>
          <div className="w-full max-w-xl rounded-lg border border-brand-500/40 bg-[#161618] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-surface-800 px-3 py-2 text-xs text-surface-300">
              <Zap className="h-3.5 w-3.5 text-brand-400" />
              <span className="font-medium">Inline edit</span>
              <span className="text-surface-500">
                {inlineSelRef.current ? `${inlineSelRef.current.length} chars selected` : "whole file"}
                {activeFilePath ? ` · ${activeFilePath.split("/").pop()}` : ""}
              </span>
              <span className="ml-auto text-surface-600">Enter to run · Esc to cancel</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runInlineEdit();
              }}
              className="p-3"
            >
              <input
                autoFocus
                value={inlineEditPrompt}
                onChange={(e) => setInlineEditPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && !inlineEditBusy) setInlineEditOpen(false);
                }}
                placeholder="Describe the change… e.g. add error handling, convert to async, write a docstring"
                disabled={inlineEditBusy}
                className="w-full rounded border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:border-brand-500 focus:outline-none disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setInlineEditOpen(false)} disabled={inlineEditBusy} className="rounded px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={inlineEditBusy || !inlineEditPrompt.trim()} className="flex items-center gap-1.5 rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50">
                  {inlineEditBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  {inlineEditBusy ? "Generating…" : "Generate edit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Custom AI Providers (Bring-Your-Own-Key) ===== */}
      {showProvidersModal && (
        <ProvidersModal
          providers={customProviders}
          onClose={() => setShowProvidersModal(false)}
          onChange={persistProviders}
          onSelect={(id) => { setSelectedModel(`custom:${id}`); setShowProvidersModal(false); }}
        />
      )}

      {/* ===== Command Palette (Ctrl+Shift+P / F1) ===== */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={ideCommands}
      />

      {/* ===== Settings Modal (Ctrl+,) ===== */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={ideSettings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* ===== Keyboard Shortcuts Modal (Ctrl+K Ctrl+S) ===== */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* ===== About geezcodE Modal ===== */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* ===== Unsaved Changes Confirmation Modal ===== */}
      {dirtyCloseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-100">
          <div className="w-full max-w-sm rounded-xl border border-surface-750 bg-surface-900 p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-semibold text-surface-100">Unsaved Changes</h3>
            </div>
            <p className="text-xs text-surface-300 mb-5 leading-relaxed">
              Do you want to save the changes you made to{" "}
              <span className="font-mono text-brand-400 font-semibold">{dirtyCloseTarget}</span>?
              Your changes will be lost if you don&apos;t save them.
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDirtyCloseTarget(null)}
                className="rounded px-3 py-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeCloseTab(dirtyCloseTarget)}
                className="rounded border border-surface-700 bg-surface-800 px-3 py-1.5 text-surface-200 hover:bg-surface-750 transition-colors cursor-pointer"
              >
                Don&apos;t Save
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveFile(dirtyCloseTarget);
                  executeCloseTab(dirtyCloseTarget);
                }}
                className="rounded bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-500 transition-colors shadow-sm cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Non-intrusive Save Toast ===== */}
      {toastMessage && (
        <div className="fixed bottom-8 right-6 z-50 flex items-center gap-2 rounded-md border border-brand-500/40 bg-surface-900/95 px-3 py-2 text-xs text-surface-200 shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-brand-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-surface-400">{label}</span>
      {children}
    </label>
  );
}

export default function GeezCodeIDE() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-surface-950 text-brand-400 font-mono text-sm">Loading geezcodE IDE...</div>}>
      <GeezCodeIDEContent />
    </Suspense>
  );
}
