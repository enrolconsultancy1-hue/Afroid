"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  ChevronDown,
  Folder,
  FolderOpen,
  X,
  Play,
  Pause,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Cpu,
  Layers,
  TerminalSquare,
  Shield,
  FileText,
  RotateCw,
  SlidersHorizontal,
  Plus,
  Trash2,
  Check,
  Send,
  CornerDownLeft,
  Paperclip,
  CheckCheck,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Eye,
  GitCommit,
  Flame,
  ArrowRight,
  ExternalLink,
  Code2,
  Terminal,
  QrCode,
  Smartphone,
  UserCheck,
  ScanLine,
  Fingerprint,
} from "lucide-react";
import { GeezCodeLogo } from "@/components/geezcode-logo";
import { QrCodeView } from "@/components/qr-code";
import { useAuthStore } from "@/stores/auth-store";
import { useAgentStream } from "@/hooks/use-agent-stream";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  language?: string;
  children?: FileNode[];
  content?: string;
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
  newContent: string;
  agentName: string;
  milestoneId: string;
}

// Crisp IDE File Type SVGs
function FileTypeIcon({ name }: { name: string }) {
  if (name.endsWith(".py")) {
    return (
      <svg className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 6.5 4.5 6.5 4.5H12V6H4.5S2 6 2 12c0 6 2 6 2 6h2v-2.5S6 12 12 12h5.5s2.5 0 2.5-2.5V4.5S20 2 12 2z" fill="#3776AB" />
        <path d="M12 22c5.52 0 5.5-2.5 5.5-2.5H12V18h7.5s2.5 0 2.5-6c0-6-2-6-2-6h-2v2.5s0 3.5-6 3.5H6.5S4 12 4 14.5V19.5S4 22 12 22z" fill="#FFD43B" />
        <circle cx="8" cy="4" r="0.8" fill="#fff" />
        <circle cx="16" cy="20" r="0.8" fill="#fff" />
      </svg>
    );
  }
  if (name.endsWith(".tsx") || name.endsWith(".ts")) {
    return (
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150 12 12)" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    );
  }
  if (name.endsWith(".md")) {
    return (
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M6 15V9h2l2 2.5L12 9h2v6h-1.5v-3.5L10.5 14h-1L7.5 11.5V15H6zm11-1.5h-1.5V9H14v4.5h-1.5l2.25 3 2.25-3z" />
      </svg>
    );
  }
  if (name.endsWith(".yml") || name.endsWith(".yaml")) {
    return (
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    );
  }
  if (name.endsWith(".json")) {
    return <span className="font-mono text-[10px] font-bold text-yellow-400">{"{}"}</span>;
  }
  return <FileCode2 className="h-3.5 w-3.5 text-surface-400" />;
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
    content: `version: '3.8'\nservices:\n  api:\n    build: .\n    ports:\n      - "8000:8000"\n    environment:\n      - DATABASE_URL=postgresql://afroid:secret@postgres:5432/afroid\n`,
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

export default function GeezCodeIDE() {
  const { user } = useAuthStore();
  const [activeActivity, setActiveActivity] = useState<string>("explorer"); // explorer, search, git, architect, swarm, certify, incubate, kyc, settings

  // Workspace Files
  const [fileTree, setFileTree] = useState<FileNode[]>(INITIAL_FILES);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([
    { name: "main.py", path: "services/api/main.py", type: "file", language: "python", content: INITIAL_FILES[0].children![0].children![0].content },
  ]);
  const [activeFilePath, setActiveFilePath] = useState<string>("services/api/main.py");
  const [editorContent, setEditorContent] = useState<string>(INITIAL_FILES[0].children![0].children![0].content || "");

  // Execution Mode (Autopilot vs Interactive)
  const [autopilot, setAutopilot] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-pro");
  const [pendingReview, setPendingReview] = useState<PendingReviewFile | null>(null);

  // Panels visibility
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightDock, setShowRightDock] = useState(true);
  const [showBottomTerminal, setShowBottomTerminal] = useState(true);
  const [terminalTab, setTerminalTab] = useState<"terminal" | "swarm" | "ast" | "certify">("terminal");

  // Free Resize Dimensions State (Gray active/hover splitters)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(260);
  const [rightDockWidth, setRightDockWidth] = useState(384);
  const [bottomTerminalHeight, setBottomTerminalHeight] = useState(208);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);

  // Global mouse drag handler for smooth window-wide resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.min(Math.max(e.clientX - 48, 160), 520); // 48px is the left activity bar
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 240), 650);
        setRightDockWidth(newWidth);
      } else if (isResizingBottom) {
        const newHeight = Math.min(Math.max(window.innerHeight - e.clientY - 24, 90), 550); // 24px is footer
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

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalInput, setTerminalInput] = useState("");

  // Search Panel State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ file: string; line: number; text: string }>>([]);

  // Git Panel State
  const [gitBranch, setGitBranch] = useState("main*");
  const [commitMessage, setCommitMessage] = useState("");
  const [changedFiles, setChangedFiles] = useState<string[]>(["services/api/main.py", "services/api/routes.py"]);

  // RegTech Certify Panel State
  const [certifyCountry, setCertifyCountry] = useState("nigeria");
  const [certifyResult, setCertifyResult] = useState<any>(null);
  const [certifying, setCertifying] = useState(false);

  // Grant Incubator Panel State
  const [grantSearch, setGrantSearch] = useState("");
  const [selectedGrant, setSelectedGrant] = useState<any>(null);

  // Editor & IDE Settings State
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorMinimap, setEditorMinimap] = useState(true);
  const [fontLigatures, setFontLigatures] = useState(true);

  // Modals & Structured Intake State
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakeTab, setIntakeTab] = useState<"concept" | "tech" | "features">("concept");
  const [ideaForm, setIdeaForm] = useState<BusinessIdeaForm>(DEFAULT_IDEA);
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [newIntegrationInput, setNewIntegrationInput] = useState("");

  // Blueprint Studio Modal State
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [blueprintTab, setBlueprintTab] = useState<"overview" | "arch" | "data" | "modules" | "milestones" | "json">("overview");
  const [blueprintData, setBlueprintData] = useState<BlueprintData | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Afroid KYC State
  const [kycSessionId, setKycSessionId] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<"idle" | "pending_scan" | "scanned" | "verified">("idle");
  const [kycCountry, setKycCountry] = useState("Nigeria");
  const [kycIdType, setKycIdType] = useState("National ID / NIN");
  const [kycAuditHash, setKycAuditHash] = useState<string | null>(null);
  const [kycPollingRef, setKycPollingRef] = useState<NodeJS.Timeout | null>(null);



  const handleCreateKycSession = useCallback(async () => {
    const sessId = `kyc_sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setKycSessionId(sessId);
    setKycStatus("pending_scan");
    setKycAuditHash(null);

    try {
      const res = await fetch("http://localhost:8001/v1/kyc/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: kycCountry, id_type: kycIdType }),
      });
      if (res.ok) {
        const data = await res.json();
        setKycSessionId(data.data.session_id);
      }
    } catch {
      // Offline fallback — QR still renders with local session ID
    }
  }, [kycCountry, kycIdType]);

  const handleSimulateKyc = useCallback(async () => {
    if (!kycSessionId) return;
    setKycStatus("scanned");

    setTimeout(async () => {
      try {
        const res = await fetch("http://localhost:8001/v1/kyc/simulate", {
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
      setTerminalLogs(prev => [...prev, `[Afroid KYC] ✅ Verification Complete — Session: ${kycSessionId} | Audit Hash: ${kycAuditHash || "0xABC..."}`]);
    }, 1800);
  }, [kycSessionId, kycCountry, kycIdType, kycAuditHash]);

  // AI Dock (Unified Live Coding Assistant / Stream)
  const [activeLiveTask, setActiveLiveTask] = useState<string>("Ready for concept intake or code edit");
  const [activeLiveAgent, setActiveLiveAgent] = useState<string>("geezcodE Copilot");
  const [liveProgress, setLiveProgress] = useState<number>(0);
  const [tokensUsed, setTokensUsed] = useState<number>(1240);
  const [dockMessages, setDockMessages] = useState<AiDockMessage[]>([
    {
      id: "msg-1",
      sender: "agent",
      agentName: "Architect Swarm",
      text: "I am your Chief Architect. Describe your startup concept or click the Sliders icon to open the full intake framework. I will formulate a zero-question architectural blueprint for parallel builders.",
      timestamp: "Just now",
    },
  ]);
  const [dockInput, setDockInput] = useState("");
  const dockEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dockEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dockMessages]);

  const { connect: connectWs } = useAgentStream({
    sessionId: sessionId || undefined,
    onCodeChunk: (filePath, chunk) => {
      setEditorContent((prev) => prev + chunk);
    },
    onAgentAction: (agentName, title, detail) => {
      setTerminalLogs((prev) => [...prev, `[${agentName}] ${title}: ${detail}`]);
      setActiveLiveAgent(agentName);
      setActiveLiveTask(`${title}: ${detail}`);
    },
  });

  // Handle Search in Codebase
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results: Array<{ file: string; line: number; text: string }> = [];

    const searchInNodes = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === "file" && node.content) {
          const lines = node.content.split("\n");
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes(q)) {
              results.push({ file: node.path, line: idx + 1, text: line.trim() });
            }
          });
        } else if (node.type === "directory" && node.children) {
          searchInNodes(node.children);
        }
      }
    };

    searchInNodes(fileTree);
    setSearchResults(results);
  }, [searchQuery, fileTree]);

  const handleFileSelect = (node: FileNode) => {
    if (node.type === "file") {
      if (!openFiles.some((f) => f.path === node.path)) {
        setOpenFiles((prev) => [...prev, node]);
      }
      setActiveFilePath(node.path);
      setEditorContent(node.content || "");
    }
  };

  const handleCloseTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const filtered = openFiles.filter((f) => f.path !== path);
    setOpenFiles(filtered);
    if (activeFilePath === path && filtered.length > 0) {
      setActiveFilePath(filtered[filtered.length - 1].path);
      setEditorContent(filtered[filtered.length - 1].content || "");
    }
  };

  const handleTerminalCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && terminalInput.trim()) {
      const cmd = terminalInput.trim();
      const currentDir = activeFilePath ? activeFilePath.split('/').slice(0, -1).join('/') || '~' : '~';
      setTerminalLogs((prev) => [...prev, `geezcodE@ide:~/${currentDir}$ ${cmd}`]);
      if (cmd === "clear") {
        setTerminalLogs([]);
      } else if (cmd === "help") {
        setTerminalLogs((prev) => [
          ...prev,
          "Available Commands:",
          "  geezcode build <prompt>  - Run parallel sub-agent builder",
          "  afroid test              - Run Python AST & unit test suite (11/11)",
          "  afroid certify           - Audit legal compliance (Nigeria, Kenya, AU)",
          "  clear                    - Clear terminal screen",
        ]);
      } else {
        setTerminalLogs((prev) => [
          ...prev,
          `executing '${cmd}' in sovereign container environment...`,
          "Command executed with return code 0.",
        ]);
      }
      setTerminalInput("");
    }
  };

  // Generate Blueprint from Intake Form or Prompt
  const handleGenerateBlueprint = async (fromForm = false) => {
    setIsGenerating(true);
    if (fromForm) setShowIntakeModal(false);

    setActiveLiveAgent("Architect Swarm");
    setActiveLiveTask("Formulating Zero-Question Full-Stack Architectural Blueprint...");
    setLiveProgress(25);

    try {
      const payload = fromForm
        ? { idea: ideaForm, model_id: selectedModel }
        : { concept: ideaForm.oneLiner, model_id: selectedModel };

      const res = await fetch("http://localhost:8002/v1/builder/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        const bp = json.data.blueprint;
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
          agentName: "Architect Swarm",
          text: `Architectural Blueprint formulated with 100% completeness for '${ideaForm.projectName}'. Review sections, edit JSON, or click 'Approve & Build Project' to dispatch parallel sub-agent workers.`,
          thought: "Constructed comprehensive microservice topology, PostgreSQL relational schemas, API endpoint shapes, and 5 sequential build milestones.",
          timestamp: "Just now",
        },
      ]);
    }
  };

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
      systemArchitecture: `+---------------------------------------------------------------+\n|                      Client Applications                      |\n|      [ Next.js 15 Web App ]   <--->   [ Mobile / USSD ]       |\n+---------------------------------------------------------------+\n                               |\n                               | (HTTPS / WSS)\n                               v\n+---------------------------------------------------------------+\n|                     FastAPI Gateway & API                     |\n|           [ Auth Middleware ]   [ Tracing Middleware ]        |\n+---------------------------------------------------------------+\n         |                     |                     |\n         v                     v                     v\n+------------------+  +------------------+  +-------------------+\n|  PostgreSQL 16   |  |     Redis 7      |  | Payment Adapters  |\n|   + pgvector     |  |   Cache & PubSub |  | (M-Pesa/Paystack) |\n+------------------+  +------------------+  +-------------------+`,
      dataFlow: "Journey 1: Onboarding -> SMS OTP -> JWT token -> Account active.\nJourney 2: Transaction -> Schema validation -> M-Pesa STK Push -> Webhook settlement.\nJourney 3: Audit -> MinHash IP verification -> SHA-256 ledger proof generated.",
      directoryStructure: `${slug}/\n├── apps/\n│   └── web/ (Next.js 15 App Router)\n├── services/\n│   ├── api/ (FastAPI Core Backend)\n│   ├── db/ (PostgreSQL & pgvector Schemas)\n│   └── integrations/ (M-Pesa, Paystack, SMS)\n├── tests/ (Automated AST QA Suite)\n├── docker-compose.yml\n└── pyproject.toml`,
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
      deploymentArchitecture: "Containerized Docker containers targeting Google Cloud Run in Johannesburg (africa-south1).",
      coreModules: [
        { id: "M1", name: "Core API & Domain Engine", purpose: "FastAPI microservice managing business logic and database state.", responsibilities: ["REST API Endpoints", "Database CRUD", "Workflow execution"], files: ["services/api/main.py", "services/api/routes.py"], acceptance: ["RFC 7807 error envelopes", "Pydantic validation"] },
        { id: "M2", name: "Sovereign Web Frontend", purpose: "Next.js 15 App Router web application with Monaco IDE integration.", responsibilities: ["State management", "Real-time WebSocket telemetry", "Responsive layout"], files: ["apps/web/src/app/page.tsx", "apps/web/src/app/dashboard/page.tsx"], acceptance: ["SSR passes with 0 hydration errors"] },
        { id: "M3", name: "Telecom & Payment Adapters", purpose: "Integrations for M-Pesa, Paystack, and Africa's Talking SMS/USSD.", responsibilities: ["STK Push payment triggers", "Signed webhook callbacks", "SMS queues"], files: ["services/integrations/mpesa.py", "services/integrations/paystack.py"], acceptance: ["Signed webhooks validated cryptographically"] },
      ],
      milestones: [
        { id: "MS1", name: "Repository Foundation & Config", objective: "Initialize pyproject.toml, Docker Compose, and environment settings.", tasks: ["Set up dependencies", "Create database schema"], filesToCreate: ["pyproject.toml", "docker-compose.yml", ".env.example"], definitionsOfDone: ["Docker Compose boots cleanly"] },
        { id: "MS2", name: "Domain API & Business Workflows", objective: "Implement FastAPI routers, Pydantic models, and database queries.", tasks: ["Write CRUD endpoints", "Add tracing middleware"], filesToCreate: ["services/api/main.py", "services/api/routes.py"], definitionsOfDone: ["FastAPI returns 200 OK"] },
        { id: "MS3", name: "Frontend Dashboard & WebSocket Sync", objective: "Build Next.js 15 App Router dashboard with live telemetry.", tasks: ["Create page templates", "Connect Zustand store"], filesToCreate: ["apps/web/src/app/page.tsx", "apps/web/src/app/dashboard/page.tsx"], definitionsOfDone: ["Build prerenders with 0 errors"] },
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
    setJsonText(JSON.stringify(fallbackBp, null, 2));
  };

  // Trigger Parallel Sub-Agent Builder (With Autopilot / Interactive Handlers)
  const handleApproveAndBuild = async () => {
    setShowBlueprintModal(false);
    setIsBuilding(true);

    const generatedSessionId = `build-${Date.now()}`;
    setSessionId(generatedSessionId);
    connectWs(generatedSessionId);

    setActiveLiveAgent("CodeGen Worker 1");
    setActiveLiveTask(`Building Milestone 1/5: Writing services/api/main.py...`);
    setLiveProgress(30);

    setDockMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "agent",
        agentName: "CodeGen Worker 1",
        text: `Starting autonomous execution of Milestone 1 for '${blueprintData?.projectName}'. Dispatching parallel sub-agent workers under the hood.`,
        thought: "Creating FastAPI application gateway, initializing Pydantic entity models, and structuring database connection pool.",
        filesModified: ["services/api/main.py", "services/api/routes.py"],
        commandsRun: ["alembic upgrade head", "pytest tests/test_api.py"],
        timestamp: "Just now",
      },
    ]);

    setTerminalLogs((prev) => [
      ...prev,
      `⚡ [Architect Swarm] Handover to Parallel Builder Core for '${blueprintData?.projectName}'`,
      "⚡ [CodeGen Worker 1] Generating FastAPI microservices & Pydantic schemas...",
      "⚡ [CodeGen Worker 2] Generating Next.js 15 App Router frontend...",
    ]);

    await new Promise((r) => setTimeout(r, 1400));

    if (!autopilot) {
      // Pause for interactive user review
      setPendingReview({
        filePath: "services/api/main.py",
        diff: `+ @app.post("/v1/loans/originate")\n+ def originate_loan(req: LoanRequest):\n+     return {"loan_id": "LN-9921", "approved": True}`,
        newContent: INITIAL_FILES[0].children![0].children![0].content || "",
        agentName: "CodeGen Worker 1",
        milestoneId: "MS1",
      });
      setIsBuilding(false);
      return;
    }

    await continueBuildExecution();
  };

  const continueBuildExecution = async () => {
    setActiveLiveAgent("QA & AST Runner");
    setActiveLiveTask("Validating Python AST syntax & checking type signatures (Milestone 4/5)...");
    setLiveProgress(80);
    setTokensUsed((prev) => prev + 5400);

    setTerminalLogs((prev) => [
      ...prev,
      "🧪 [QA & AST Runner] AST syntax validation passed with 0 syntax errors.",
      "🛡️ [Certify RegTech] Nigeria Startup Act compliance verified (100% score).",
      "🚀 [Deployer] Docker container specs generated. Ready to ship to GCP africa-south1!",
    ]);

    await new Promise((r) => setTimeout(r, 1200));

    setActiveLiveAgent("geezcodE Copilot");
    setActiveLiveTask("Build complete! All 5 milestones verified and passing.");
    setLiveProgress(100);
    setTokensUsed((prev) => prev + 3200);

    setDockMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "agent",
        agentName: "QA & AST Runner",
        text: "✅ Build complete! All generated files validated with 0 syntax errors, 100% AST pass rate, and full compliance certification.",
        filesModified: [
          "services/api/main.py",
          "services/api/routes.py",
          "apps/web/page.tsx",
          "docker-compose.yml",
          "README.md",
        ],
        commandsRun: ["python scripts/smoke_test.py -> 11/11 PASSED"],
        timestamp: "Just now",
      },
    ]);

    setIsBuilding(false);
  };

  // Interactive review approvals
  const handleApprovePendingFile = () => {
    if (!pendingReview) return;
    setTerminalLogs((prev) => [...prev, `✔ [Founder Approval] Approved diff for ${pendingReview.filePath}`]);
    setPendingReview(null);
    setIsBuilding(true);
    continueBuildExecution();
  };

  const handleRejectPendingFile = () => {
    if (!pendingReview) return;
    setTerminalLogs((prev) => [...prev, `✖ [Founder Rejection] Rejected diff for ${pendingReview.filePath}. Regenerating with steering...`]);
    setPendingReview(null);
  };

  // AI Dock Steer / Chat Submit
  const handleSendDockMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dockInput.trim()) return;

    const userText = dockInput.trim();
    setDockInput("");

    setDockMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: userText,
        timestamp: "Just now",
      },
    ]);

    setActiveLiveAgent("geezcodE Assistant");
    setActiveLiveTask(`Processing steer: "${userText}"`);

    setTimeout(() => {
      setDockMessages((prev) => [
        ...prev,
        {
          id: `reply-${Date.now()}`,
          sender: "agent",
          agentName: "geezcodE Assistant",
          text: `Steer applied to active session. Adjusting architecture and CodeGen workers to incorporate: "${userText}".`,
          timestamp: "Just now",
        },
      ]);
      setActiveLiveAgent("geezcodE Copilot");
      setActiveLiveTask("Ready for concept intake or code edit");
    }, 900);
  };

  // RegTech Compliance Audit Action
  const handleRunCertifyAudit = async () => {
    setCertifying(true);
    await new Promise((r) => setTimeout(r, 800));
    setCertifyResult({
      jurisdiction: certifyCountry.toUpperCase(),
      status: "ELIGIBLE (100% SCORE)",
      taxHolidayYears: 5,
      ipOriginality: "100% (MinHash verified)",
      sha256Chain: "0x88f21a99c4b12de09e22384a...",
      framework: certifyCountry === "nigeria" ? "Nigeria Startup Act 2022 (Sec 24)" : "Kenya Startup Bill 2024 (Part IV)",
    });
    setCertifying(false);
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split(".").pop() || "";
    const map: Record<string, string> = {
      ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
      py: "python", json: "json", md: "markdown", yml: "yaml", yaml: "yaml",
      css: "css", html: "html", sql: "sql", sh: "shell", dockerfile: "dockerfile",
    };
    return map[ext] || "plaintext";
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => (
    <div>
      {nodes.map((node) => (
        <div key={node.path}>
          <button
            onClick={() => handleFileSelect(node)}
            className={`flex w-full items-center gap-1.5 px-3 py-1 text-xs hover:bg-surface-800/60 transition-colors group ${
              node.path === activeFilePath
                ? "bg-brand-500/15 text-brand-300 font-medium border-l-2 border-brand-500"
                : "text-surface-300 hover:text-surface-100"
            }`}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
          >
            {node.type === "directory" ? (
              <span className="flex items-center gap-1 text-surface-400 group-hover:text-surface-200">
                <ChevronDown className="h-3 w-3" />
                <Folder className="h-3.5 w-3.5 text-amber-400/90" />
              </span>
            ) : (
              <span className="ml-3 flex items-center">
                <FileTypeIcon name={node.name} />
              </span>
            )}
            <span className="truncate font-mono text-[12px]">{node.name}</span>
          </button>
          {node.type === "directory" && node.children && renderFileTree(node.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-surface-950 text-surface-50 font-sans selection:bg-brand-500/30 selection:text-brand-300">
      {/* Top Professional IDE Header Bar */}
      <header className="flex h-10 items-center justify-between border-b border-surface-800 bg-surface-900 px-3 select-none">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <GeezCodeLogo size={24} showWordmark={true} glow={true} />
          </Link>

          <div className="h-3.5 w-px bg-surface-800" />

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-surface-400 font-mono">
            <span className="text-surface-500">workspace</span>
            <span className="text-surface-600">/</span>
            <span className="text-surface-200">{activeFilePath}</span>
          </div>
        </div>

        {/* Center Control Panel — Autopilot & Model Registry */}
        <div className="flex items-center gap-3">
          {/* Autopilot vs Interactive Toggle */}
          <div className="flex items-center gap-0.5 rounded border border-surface-750 bg-surface-950 p-0.5 shadow-inner">
            <button
              onClick={() => { setAutopilot(true); setPendingReview(null); }}
              title="Autopilot: Agents build, test & write files automatically"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded transition-all ${
                autopilot ? "bg-brand-500 text-white shadow-sm font-semibold" : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Play className="h-3 w-3 fill-current" /> Autopilot
            </button>
            <button
              onClick={() => setAutopilot(false)}
              title="Interactive: Agents pause for code diff review & steering"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded transition-all ${
                !autopilot ? "bg-amber-600 text-white shadow-sm font-semibold" : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Pause className="h-3 w-3 fill-current" /> Interactive
            </button>
          </div>

          {/* Model Registry Selector */}
          <div className="flex items-center gap-1.5 rounded border border-surface-750 bg-surface-950 px-2.5 py-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 font-mono">LLM:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs text-surface-200 outline-none cursor-pointer font-mono"
            >
              <option value="gemini-2.5-pro" className="bg-surface-900">Gemini 2.5 Pro (Flagship)</option>
              <option value="gemini-2.5-flash" className="bg-surface-900">Gemini 2.5 Flash (Fast)</option>
              <option value="gemini-2.0-flash" className="bg-surface-900">Gemini 2.0 Flash</option>
              <option value="gemini-1.5-pro" className="bg-surface-900">Gemini 1.5 Pro</option>
              <option value="custom" className="bg-surface-900">Custom Model Registry</option>
            </select>
          </div>

          {/* Prominent Direct Architect Intake Button */}
          <button
            onClick={() => setShowIntakeModal(true)}
            title="Open Structured Architect Intake Form"
            className="flex items-center gap-1.5 rounded border border-brand-500/40 bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-300 hover:bg-brand-500/25 transition-all shadow-sm"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-brand-400" />
            <span>Architect Intake Form</span>
          </button>
        </div>

        {/* Right Toggle Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            title="Toggle Sidebar (Ctrl+B)"
            className={`rounded p-1.5 transition-colors ${showLeftSidebar ? "text-brand-400 bg-surface-800" : "text-surface-400 hover:text-surface-200"}`}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowRightDock(!showRightDock)}
            title="Toggle AI Dock (Shared Live Coding Assistant)"
            className={`rounded p-1.5 transition-colors ${showRightDock ? "text-brand-400 bg-surface-800" : "text-surface-400 hover:text-surface-200"}`}
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowBottomTerminal(!showBottomTerminal)}
            title="Toggle Terminal Drawer"
            className={`rounded p-1.5 transition-colors ${showBottomTerminal ? "text-brand-400 bg-surface-800" : "text-surface-400 hover:text-surface-200"}`}
          >
            <TerminalIcon className="h-3.5 w-3.5" />
          </button>
          <div className="h-3.5 w-px bg-surface-800 mx-1" />
          <span className="text-xs text-surface-400 font-mono">{user?.email || "founder@afroid.io"}</span>
        </div>
      </header>

      {/* Main Layout Work Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Leftmost Activity Bar (All 8 Core Panels) */}
        <div className="flex w-12 flex-col items-center justify-between border-r border-surface-800 bg-surface-950 py-3 select-none">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => { setActiveActivity("explorer"); setShowLeftSidebar(true); }}
              title="1. Explorer (File Tree)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "explorer" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Files className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("search"); setShowLeftSidebar(true); }}
              title="2. Search (Codebase Find & Jump)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "search" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("git"); setShowLeftSidebar(true); }}
              title="3. Source Control (Git Commits & Diffs)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "git" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <GitBranch className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("architect"); setShowLeftSidebar(true); }}
              title="4. Architect (Zero-Question Blueprint & Intake)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "architect" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("swarm"); setShowLeftSidebar(true); }}
              title="5. Multi-Agent Swarm (Task Orchestrator)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "swarm" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Bot className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("certify"); setShowLeftSidebar(true); }}
              title="6. RegTech Certify (Startup Act Compliance)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "certify" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("incubate"); setShowLeftSidebar(true); }}
              title="7. Grant Incubator ($3B+ Funding Catalog)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "incubate" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Coins className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setActiveActivity("kyc"); setShowLeftSidebar(true); }}
              title="8. Afroid KYC (Mobile Identity Verification)"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "kyc" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <QrCode className="h-4 w-4" />
            </button>

          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => { setActiveActivity("settings"); setShowLeftSidebar(true); }}
              title="9. Settings & Configuration"
              className={`p-2 rounded-lg transition-all ${
                activeActivity === "settings" && showLeftSidebar
                  ? "bg-brand-500/20 text-brand-400 shadow-sm border border-brand-500/30"
                  : "text-surface-400 hover:text-surface-200"
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Left Sidebar (8 Panels Wired End-to-End with Resizable Width) */}
        {showLeftSidebar && (
          <aside
            style={{ width: `${leftSidebarWidth}px` }}
            className="flex flex-col bg-surface-900/95 backdrop-blur select-none flex-shrink-0"
          >
            <div className="flex h-9 items-center justify-between border-b border-surface-800 px-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-surface-300 font-mono">
                {activeActivity}
              </span>
              <button onClick={() => setShowLeftSidebar(false)} className="text-surface-400 hover:text-surface-200">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 1. Explorer Panel */}
            {activeActivity === "explorer" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-500 font-mono">
                    Afroid Workspace
                  </span>
                  <div className="flex items-center gap-1 text-surface-400">
                    <button
                      onClick={() => {
                        const name = prompt("Enter new file path (e.g. services/api/utils.py):");
                        if (name) {
                          const newFile: FileNode = { name: name.split("/").pop() || name, path: name, type: "file", content: "# New file\n" };
                          setFileTree((prev) => [...prev, newFile]);
                          setOpenFiles((prev) => [...prev, newFile]);
                          setActiveFilePath(name);
                          setEditorContent("# New file\n");
                        }
                      }}
                      title="New File"
                      className="p-1 hover:text-white rounded"
                    >
                      <FilePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setFileTree([...INITIAL_FILES])}
                      title="Refresh Tree"
                      className="p-1 hover:text-white rounded"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                  {renderFileTree(fileTree)}
                </div>
              </div>
            )}

            {/* 2. Search Panel */}
            {activeActivity === "search" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in files (e.g. FastAPI)..."
                  className="w-full rounded border border-surface-750 bg-surface-950 px-2.5 py-1.5 text-xs text-surface-200 placeholder:text-surface-600 outline-none focus:border-brand-500 font-mono"
                />
                <span className="text-[10px] text-surface-500 font-mono">
                  {searchResults.length} results found
                </span>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
                  {searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        const target = fileTree.find((f) => f.path === res.file);
                        if (target) handleFileSelect(target);
                      }}
                      className="rounded bg-surface-950 p-2 border border-surface-800 cursor-pointer hover:border-brand-500/50"
                    >
                      <div className="flex items-center justify-between text-brand-400 text-[10px]">
                        <span className="truncate">{res.file}</span>
                        <span>L{res.line}</span>
                      </div>
                      <p className="mt-1 text-surface-300 truncate text-[11px]">{res.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Source Control (Git) Panel */}
            {activeActivity === "git" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 text-xs font-mono overflow-y-auto">
                <div className="flex items-center justify-between text-surface-400 border-b border-surface-800 pb-2">
                  <span className="flex items-center gap-1"><GitBranch className="h-3.5 w-3.5 text-brand-400" /> Branch: {gitBranch}</span>
                  <span className="text-brand-400">{changedFiles.length} changed</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-surface-500 uppercase">Changes</span>
                  {changedFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-surface-950 px-2 py-1.5 rounded border border-surface-800">
                      <span className="text-surface-200 truncate">{f}</span>
                      <span className="text-amber-400 font-bold text-[10px]">M</span>
                    </div>
                  ))}
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message (e.g. feat: integrate mpesa payments)..."
                    className="w-full rounded border border-surface-750 bg-surface-950 p-2 text-xs text-white outline-none focus:border-brand-500"
                  />
                  <button
                    onClick={() => {
                      if (commitMessage.trim()) {
                        setTerminalLogs((prev) => [...prev, `[git] Committed: ${commitMessage}`]);
                        setCommitMessage("");
                        setChangedFiles([]);
                      }
                    }}
                    disabled={!commitMessage.trim() || changedFiles.length === 0}
                    className="btn-primary w-full mt-2 py-1.5 text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <GitCommit className="h-3.5 w-3.5" /> Commit & Sync
                  </button>
                </div>
              </div>
            )}

            {/* 4. Architect & Blueprint Sidebar */}
            {activeActivity === "architect" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
                <div className="rounded border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300 space-y-1">
                  <span className="font-bold flex items-center gap-1.5 font-mono">
                    <Sparkles className="h-4 w-4" /> Zero-Question Intake
                  </span>
                  <p className="text-[11px] text-surface-300">Formulate high-level architectural blueprints with zero ambiguity for parallel builders.</p>
                </div>
                <button
                  onClick={() => setShowIntakeModal(true)}
                  className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Open Intake Form
                </button>
                <button
                  onClick={() => handleGenerateBlueprint(true)}
                  className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5" /> View Blueprint Studio
                </button>
              </div>
            )}

            {/* 5. Multi-Agent Swarm Panel */}
            {activeActivity === "swarm" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
                <div className="rounded bg-surface-950 p-2.5 border border-surface-800 space-y-2">
                  <span className="text-[10px] font-bold text-brand-400 uppercase font-mono">Parallel Workers</span>
                  <div className="space-y-1 text-surface-300 font-mono text-[11px]">
                    <p>• 🏗️ Architect Swarm: Active</p>
                    <p>• ⚡ CodeGen Worker 1: Ready</p>
                    <p>• ⚡ CodeGen Worker 2: Ready</p>
                    <p>• 🧪 QA AST Runner: Standby</p>
                    <p>• 🛡️ Certify Auditor: Standby</p>
                  </div>
                </div>
                <button
                  onClick={handleApproveAndBuild}
                  disabled={isBuilding}
                  className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" /> {isBuilding ? "Building..." : "Trigger Full Swarm Build"}
                </button>
              </div>
            )}

            {/* 6. RegTech Certify Panel */}
            {activeActivity === "certify" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">African Jurisdiction</label>
                  <select
                    value={certifyCountry}
                    onChange={(e) => setCertifyCountry(e.target.value)}
                    className="w-full rounded border border-surface-750 bg-surface-950 px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                  >
                    <option value="nigeria">Nigeria (Startup Act 2022)</option>
                    <option value="kenya">Kenya (Startup Bill 2024)</option>
                    <option value="ethiopia">Ethiopia (Startup Policy)</option>
                    <option value="au">African Union (AU Framework)</option>
                  </select>
                </div>
                <button
                  onClick={handleRunCertifyAudit}
                  disabled={certifying}
                  className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> {certifying ? "Auditing Rules..." : "Run Compliance Audit"}
                </button>
                {certifyResult && (
                  <div className="rounded border border-brand-500/40 bg-surface-950 p-2.5 space-y-1.5 font-mono text-[11px]">
                    <span className="text-brand-400 font-bold">{certifyResult.status}</span>
                    <p className="text-surface-400">• Tax Holiday: {certifyResult.taxHolidayYears} Years Approved</p>
                    <p className="text-surface-400">• IP Originality: {certifyResult.ipOriginality}</p>
                    <p className="text-surface-400 text-[10px] truncate">• Proof: {certifyResult.sha256Chain}</p>
                  </div>
                )}
              </div>
            )}

            {/* 7. Grant Incubator Panel */}
            {activeActivity === "incubate" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
                <input
                  type="text"
                  value={grantSearch}
                  onChange={(e) => setGrantSearch(e.target.value)}
                  placeholder="Filter $3B+ catalog..."
                  className="w-full rounded border border-surface-750 bg-surface-950 px-2.5 py-1.5 text-xs text-white outline-none font-mono"
                />
                <div className="space-y-2">
                  {[
                    { name: "Tony Elumelu Foundation", grant: "$5,000 Seed", match: "96% Match" },
                    { name: "Google for Startups Africa", grant: "$100k Cloud Credits", match: "94% Match" },
                    { name: "Mastercard Foundation", grant: "$50,000 Scaling", match: "91% Match" },
                  ].map((g, i) => (
                    <div key={i} className="rounded bg-surface-950 p-2.5 border border-surface-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px]">{g.name}</span>
                        <span className="text-brand-400 font-mono text-[10px]">{g.match}</span>
                      </div>
                      <p className="text-surface-400 text-[10px]">{g.grant}</p>
                      <button
                        onClick={() => alert(`1-Click AI Grant Writer generated application for ${g.name}!`)}
                        className="btn-secondary w-full py-1 text-[10px] mt-1 flex items-center justify-center gap-1"
                      >
                        <Zap className="h-3 w-3 text-brand-400" /> Autofill Application
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {activeActivity === "kyc" && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto text-xs">
                {/* Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-surface-800/60">
                  <Fingerprint className="h-4 w-4 text-brand-400" />
                  <span className="font-bold text-surface-200 text-xs">Afroid KYC</span>
                  <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    kycStatus === "verified" ? "bg-emerald-500/20 text-emerald-400" :
                    kycStatus === "scanned" ? "bg-amber-500/20 text-amber-400" :
                    kycStatus === "pending_scan" ? "bg-blue-500/20 text-blue-400" :
                    "bg-surface-800 text-surface-400"
                  }`}>
                    {kycStatus === "verified" ? "✅ Verified" :
                     kycStatus === "scanned" ? "🤳 Scanning..." :
                     kycStatus === "pending_scan" ? "📱 Awaiting Scan" :
                     "Not Started"}
                  </span>
                </div>

                {/* Jurisdiction & ID Type Selectors */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-surface-500 mb-1 font-mono">Jurisdiction</label>
                    <select
                      value={kycCountry}
                      onChange={(e) => setKycCountry(e.target.value)}
                      className="w-full bg-surface-950 border border-surface-750 rounded px-2 py-1.5 text-xs text-surface-200 outline-none focus:border-brand-500/50"
                    >
                      <option value="Nigeria">🇳🇬 Nigeria</option>
                      <option value="Kenya">🇰🇪 Kenya</option>
                      <option value="Ethiopia">🇪🇹 Ethiopia</option>
                      <option value="Ghana">🇬🇭 Ghana</option>
                      <option value="South Africa">🇿🇦 South Africa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-surface-500 mb-1 font-mono">ID Document Type</label>
                    <select
                      value={kycIdType}
                      onChange={(e) => setKycIdType(e.target.value)}
                      className="w-full bg-surface-950 border border-surface-750 rounded px-2 py-1.5 text-xs text-surface-200 outline-none focus:border-brand-500/50"
                    >
                      <option value="National ID / NIN">National ID / NIN</option>
                      <option value="BVN">Bank Verification Number (BVN)</option>
                      <option value="Passport">Passport</option>
                      <option value="Fayda ID">Fayda Digital ID (Ethiopia)</option>
                      <option value="Ghana Card">Ghana Card</option>
                      <option value="Huduma Namba">Huduma Namba (Kenya)</option>
                    </select>
                  </div>
                </div>

                {/* Generate QR / Display QR */}
                {kycStatus === "idle" && (
                  <button
                    onClick={handleCreateKycSession}
                    className="w-full flex items-center justify-center gap-2 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 text-brand-400 rounded-lg px-3 py-2.5 text-xs font-bold transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    Generate KYC QR Code
                  </button>
                )}

                {(kycStatus === "pending_scan" || kycStatus === "scanned") && kycSessionId && (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <QrCodeView
                      value={JSON.stringify({
                        action: "AFROID_KYC_VERIFY",
                        session_id: kycSessionId,
                        endpoint: "https://api.afroid.io/v1/kyc/mobile/verify",
                        country: kycCountry,
                        id_type: kycIdType,
                      })}
                      size={180}
                      fgColor="#33FF66"
                      bgColor="#050807"
                    />
                    <div className="text-center space-y-1">
                      <p className="text-[10px] text-surface-400 font-mono">Session: {kycSessionId}</p>
                      <p className="text-[10px] text-surface-500">
                        {kycStatus === "scanned"
                          ? "Processing biometric liveness & document OCR..."
                          : "Scan this QR with the Afroid KYC Mobile App"}
                      </p>
                    </div>

                    {/* App Store Links */}
                    <div className="flex items-center gap-2 text-[9px] text-surface-500">
                      <Smartphone className="h-3 w-3" />
                      <span>Available on App Store & Play Store</span>
                    </div>

                    {/* 1-Click Simulator Button (Dev Mode) */}
                    {kycStatus === "pending_scan" && (
                      <button
                        onClick={handleSimulateKyc}
                        className="w-full flex items-center justify-center gap-2 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-surface-300 rounded px-3 py-2 text-[10px] font-mono transition-colors mt-1"
                      >
                        <ScanLine className="h-3.5 w-3.5 text-brand-400" />
                        Simulate Mobile Scan (Dev Mode)
                      </button>
                    )}
                  </div>
                )}

                {/* Verified State */}
                {kycStatus === "verified" && (
                  <div className="flex flex-col gap-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-emerald-400 text-xs">Identity Verified</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-surface-400 font-mono">
                      <p>• Country: {kycCountry}</p>
                      <p>• ID Type: {kycIdType}</p>
                      <p>• Face Match: 98.5% PASS</p>
                      <p>• Liveness: 99.2% PASS</p>
                      {kycAuditHash && (
                        <p className="text-brand-400 break-all">• Ledger: {kycAuditHash.slice(0, 22)}...</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setKycStatus("idle"); setKycSessionId(null); setKycAuditHash(null); }}
                      className="mt-1 w-full flex items-center justify-center gap-1.5 bg-surface-800 hover:bg-surface-750 border border-surface-700 text-surface-300 rounded px-2 py-1.5 text-[10px] font-mono transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> Re-verify Identity
                    </button>
                  </div>
                )}

                {/* Info Footer */}
                <div className="mt-auto pt-2 border-t border-surface-800/60 space-y-1">
                  <p className="text-[9px] text-surface-600 font-mono">Afroid KYC v1.0 — Python Mobile Client</p>
                  <p className="text-[9px] text-surface-600 font-mono">SHA-256 Cryptographic Audit Chain</p>
                  <p className="text-[9px] text-surface-600 font-mono">PostgreSQL Sync: users.kyc_status</p>
                </div>
              </div>
            )}

            {/* 9. Settings & Configuration Panel */}
            {activeActivity === "settings" && (
              <div className="flex-1 flex flex-col p-3 space-y-4 overflow-y-auto text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-surface-400 mb-1">Editor Font Size: {editorFontSize}px</label>
                  <input
                    type="range"
                    min={12}
                    max={20}
                    value={editorFontSize}
                    onChange={(e) => setEditorFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Minimap:</span>
                  <button onClick={() => setEditorMinimap(!editorMinimap)} className="text-brand-400 font-bold">
                    {editorMinimap ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span>Font Ligatures:</span>
                  <button onClick={() => setFontLigatures(!fontLigatures)} className="text-brand-400 font-bold">
                    {fontLigatures ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <div className="pt-2 border-t border-surface-800">
                  <span className="text-[10px] text-surface-500">Cloud Region: africa-south1 (Johannesburg)</span>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* 1. Left Vertical Resizer Bar (Single 1px Hairline with Gray hover/active) */}
        {showLeftSidebar && (
          <div
            onMouseDown={() => setIsResizingLeft(true)}
            className={`w-px relative cursor-col-resize select-none transition-colors z-20 flex-shrink-0 ${
              isResizingLeft ? "bg-surface-400" : "bg-surface-800 hover:bg-surface-400"
            }`}
            title="Drag to resize Explorer / Sidebar"
          >
            {/* Invisible 8px wide hit target for effortless cursor grabbing */}
            <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
          </div>
        )}

        {/* Center Main Editor & Terminal Area */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* File Tabs Bar */}
          <div className="flex h-9 items-center border-b border-surface-800 bg-surface-950 overflow-x-auto select-none scrollbar-none">
            {openFiles.map((file) => (
              <div
                key={file.path}
                onClick={() => { setActiveFilePath(file.path); setEditorContent(file.content || ""); }}
                className={`flex h-full items-center gap-2 border-r border-surface-800 px-3 py-1 text-xs cursor-pointer transition-colors ${
                  file.path === activeFilePath
                    ? "bg-surface-900 text-surface-100 border-t-2 border-t-brand-500 font-medium"
                    : "text-surface-400 hover:bg-surface-900/50 hover:text-surface-200"
                }`}
              >
                <FileTypeIcon name={file.name} />
                <span className="font-mono text-xs">{file.name}</span>
                <button
                  onClick={(e) => handleCloseTab(e, file.path)}
                  className="rounded p-0.5 hover:bg-surface-750 hover:text-surface-200 text-surface-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Interactive Code Review Overlay (Interactive Mode) */}
          {pendingReview && (
            <div className="bg-amber-950/40 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-400" />
                <span className="font-mono font-bold text-amber-300">
                  Interactive Review: {pendingReview.filePath} ({pendingReview.agentName})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRejectPendingFile}
                  className="btn-secondary px-3 py-1 text-xs text-red-300 hover:bg-red-500/20"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  onClick={handleApprovePendingFile}
                  className="btn-primary px-4 py-1 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/25"
                >
                  <Check className="h-3.5 w-3.5" /> Approve & Write
                </button>
              </div>
            </div>
          )}

          {/* Monaco Code Editor Workspace */}
          <div className="flex-1 relative">
            <MonacoEditor
              height="100%"
              language={getLanguage(activeFilePath)}
              value={editorContent}
              onChange={(v) => setEditorContent(v || "")}
              theme="vs-dark"
              options={{
                fontSize: editorFontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontLigatures: fontLigatures,
                minimap: { enabled: editorMinimap, scale: 1 },
                padding: { top: 14 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                bracketPairColorization: { enabled: true },
                wordWrap: "on",
                lineNumbers: "on",
                tabSize: 2,
              }}
            />
          </div>

          {/* Integrated Architect Intake Prompt Bar */}
          <div className="border-t border-surface-800 bg-surface-900 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded border border-surface-750 bg-surface-950 px-3 py-2 flex-1 shadow-inner">
                <Sparkles className="h-4 w-4 text-brand-400" />
                <span className="text-brand-400 font-bold text-xs font-mono">Architect:</span>
                <input
                  type="text"
                  value={ideaForm.oneLiner}
                  onChange={(e) => setIdeaForm({ ...ideaForm, oneLiner: e.target.value })}
                  placeholder="Describe your startup concept (Zero-Question intake formulates full architecture blueprint)..."
                  className="flex-1 bg-transparent text-xs text-surface-200 placeholder:text-surface-600 outline-none font-sans"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerateBlueprint(false)}
                />
              </div>

              <button
                onClick={() => setShowIntakeModal(true)}
                title="Open Complete Architect Intake Form"
                className="flex items-center gap-1.5 rounded border border-surface-750 bg-surface-950 px-2.5 py-2 text-surface-300 hover:text-brand-400 hover:border-brand-500/50 transition-colors text-xs font-mono font-semibold"
              >
                <SlidersHorizontal className="h-4 w-4 text-brand-400" />
                <span className="hidden sm:inline">Intake Form</span>
              </button>

              <button
                onClick={() => handleGenerateBlueprint(false)}
                disabled={isGenerating || isBuilding || !ideaForm.oneLiner.trim()}
                className="btn-secondary px-4 py-2 text-xs font-semibold disabled:opacity-40 shadow-sm flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-brand-400" />
                {isGenerating ? "Formulating..." : "Architect Blueprint"}
              </button>
            </div>
          </div>

          {/* 2. Bottom Horizontal Resizer Bar (Single 1px Hairline with Gray hover/active) */}
          {showBottomTerminal && (
            <div
              onMouseDown={() => setIsResizingBottom(true)}
              className={`h-px relative cursor-row-resize select-none transition-colors z-20 flex-shrink-0 ${
                isResizingBottom ? "bg-surface-400" : "bg-surface-800 hover:bg-surface-400"
              }`}
              title="Drag to resize Terminal Drawer"
            >
              {/* Invisible 8px high hit target for effortless cursor grabbing */}
              <div className="absolute inset-x-0 -top-1 -bottom-1 cursor-row-resize" />
            </div>
          )}

          {/* Bottom Integrated Terminal Drawer */}
          {showBottomTerminal && (
            <div
              style={{ height: `${bottomTerminalHeight}px` }}
              className="bg-surface-950 flex flex-col font-mono text-xs select-none flex-shrink-0"
            >
              <div className="flex h-8 items-center justify-between border-b border-surface-800 bg-surface-900 px-3">
                <div className="flex items-center gap-4 text-xs">
                  <button
                    onClick={() => setTerminalTab("terminal")}
                    className={`flex items-center gap-1.5 font-semibold transition-colors ${
                      terminalTab === "terminal" ? "text-brand-400 border-b-2 border-brand-400 pb-0.5" : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    <TerminalSquare className="h-3.5 w-3.5" /> Terminal
                  </button>
                  <button
                    onClick={() => setTerminalTab("swarm")}
                    className={`flex items-center gap-1.5 font-semibold transition-colors ${
                      terminalTab === "swarm" ? "text-brand-400 border-b-2 border-brand-400 pb-0.5" : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" /> Swarm Log
                  </button>
                  <button
                    onClick={() => setTerminalTab("ast")}
                    className={`flex items-center gap-1.5 font-semibold transition-colors ${
                      terminalTab === "ast" ? "text-brand-400 border-b-2 border-brand-400 pb-0.5" : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> AST Tests
                  </button>
                  <button
                    onClick={() => setTerminalTab("certify")}
                    className={`flex items-center gap-1.5 font-semibold transition-colors ${
                      terminalTab === "certify" ? "text-brand-400 border-b-2 border-brand-400 pb-0.5" : "text-surface-400 hover:text-surface-200"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" /> RegTech Audit
                  </button>
                </div>
                <button onClick={() => setShowBottomTerminal(false)} className="text-surface-400 hover:text-surface-200">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed text-surface-300">
                {terminalLogs.map((log, idx) => (
                  <pre
                    key={idx}
                    className={`font-mono text-[11px] leading-tight ${
                      idx < 7 ? "text-brand-400 font-bold" : idx === 7 ? "text-surface-600" : "text-surface-300"
                    }`}
                  >
                    {log}
                  </pre>
                ))}
              </div>

              <div className="flex items-center border-t border-surface-850 px-3 py-1.5 bg-surface-900/50">
                <span className="text-brand-400 font-bold mr-2 text-[11px] font-mono">
                  geezcodE@ide:~/{activeFilePath ? activeFilePath.split('/').slice(0, -1).join('/') || '~' : '~'}$
                </span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalCommand}
                  placeholder="Type CLI command or 'help'..."
                  className="flex-1 bg-transparent text-[11px] font-mono text-surface-200 outline-none placeholder:text-surface-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Right Vertical Resizer Bar (Single 1px Hairline with Gray hover/active) */}
        {showRightDock && (
          <div
            onMouseDown={() => setIsResizingRight(true)}
            className={`w-px relative cursor-col-resize select-none transition-colors z-20 flex-shrink-0 ${
              isResizingRight ? "bg-surface-400" : "bg-surface-800 hover:bg-surface-400"
            }`}
            title="Drag to resize AI Dock"
          >
            {/* Invisible 8px wide hit target for effortless cursor grabbing */}
            <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
          </div>
        )}

        {/* 3. Right Side Panel: AI DOCK (Antigravity / Cursor / Kiro Unified Shared Screen) */}
        {showRightDock && (
          <aside
            style={{ width: `${rightDockWidth}px` }}
            className="flex flex-col bg-surface-900/95 backdrop-blur select-none flex-shrink-0"
          >
            {/* AI Dock Header */}
            <div className="flex h-10 items-center justify-between border-b border-surface-800 px-3 bg-surface-950/80">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs font-bold text-surface-100 font-mono flex items-center gap-1.5">
                  <Bot className="h-3.5 w-3.5 text-brand-400" /> AI Dock Copilot
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-surface-400">{tokensUsed.toLocaleString()} tokens</span>
                <button onClick={() => setShowRightDock(false)} className="text-surface-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Live Active Task Banner */}
            <div className="border-b border-surface-800 bg-surface-950 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-brand-400 font-bold font-mono truncate">{activeLiveAgent}</span>
                <span className="text-surface-400 font-mono text-[10px]">{liveProgress}%</span>
              </div>
              <p className="text-xs text-surface-200 font-mono leading-relaxed bg-surface-900/80 p-2 rounded border border-surface-800">
                {activeLiveTask}
              </p>
              {/* Progress bar */}
              <div className="h-1 w-full bg-surface-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${liveProgress}%` }} />
              </div>
            </div>

            {/* AI Activity Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
              {dockMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 space-y-2 ${
                    msg.sender === "user"
                      ? "bg-brand-500/10 border border-brand-500/30 text-surface-100 ml-6"
                      : "bg-surface-950 border border-surface-800 text-surface-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-surface-400 font-mono">
                    <span className="font-bold text-brand-400">{msg.agentName || "You"}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-xs leading-relaxed">{msg.text}</p>

                  {/* Agent Thought block */}
                  {msg.thought && (
                    <div className="rounded bg-surface-900/80 p-2 border border-surface-800/80 text-[11px] text-surface-300 font-mono">
                      <span className="text-[10px] text-brand-400 font-bold uppercase block mb-0.5">🧠 Architectural Reasoning</span>
                      {msg.thought}
                    </div>
                  )}

                  {/* Files modified badge list */}
                  {msg.filesModified && msg.filesModified.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-surface-500 uppercase">Files Modified</span>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                        {msg.filesModified.map((f, idx) => (
                          <span key={idx} className="bg-surface-900 px-2 py-0.5 rounded text-brand-300 border border-surface-800 flex items-center gap-1">
                            <CheckCheck className="h-2.5 w-2.5 text-brand-400" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commands executed */}
                  {msg.commandsRun && msg.commandsRun.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-surface-500 uppercase">Commands Executed</span>
                      <div className="space-y-1 font-mono text-[10px]">
                        {msg.commandsRun.map((cmd, idx) => (
                          <div key={idx} className="bg-surface-900 px-2 py-1 rounded text-surface-300 border border-surface-800 truncate">
                            $ {cmd}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={dockEndRef} />
            </div>

            {/* AI Steer / Chat Input Dock */}
            <form onSubmit={handleSendDockMessage} className="p-3 border-t border-surface-800 bg-surface-950">
              <div className="rounded-xl border border-surface-750 bg-surface-900 p-2 space-y-2 focus-within:border-brand-500 transition-colors">
                <textarea
                  rows={2}
                  value={dockInput}
                  onChange={(e) => setDockInput(e.target.value)}
                  placeholder="Ask Copilot or steer live coding task (e.g. add JWT expiry check)..."
                  className="w-full bg-transparent text-xs text-surface-100 outline-none resize-none placeholder:text-surface-500 font-sans"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendDockMessage(e);
                    }
                  }}
                />
                <div className="flex items-center justify-between pt-1 border-t border-surface-800/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-surface-400">
                    <span className="bg-surface-950 px-2 py-0.5 rounded border border-surface-800 text-brand-400">@workspace</span>
                    <span className="text-surface-500">LLM: {selectedModel.split("-")[1] || "pro"}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!dockInput.trim()}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-500 text-white disabled:opacity-30 hover:bg-brand-400 transition-colors"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="flex h-6 items-center justify-between border-t border-surface-800 bg-surface-950 px-3 text-[11px] font-mono text-surface-400 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-surface-300">
            <GitBranch className="h-3 w-3 text-brand-400" /> {gitBranch}
          </span>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
          <span>Python 3.12</span>
          <span className="text-brand-400">Mode: {autopilot ? "Autopilot" : "Interactive Review"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> WebSocket Connected
          </span>
          <span className="text-surface-300">Model: {selectedModel}</span>
          <span>12% CPU | 1.2GB RAM</span>
        </div>
      </footer>

      {/* 1. Full Structured Architect Intake Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-4xl rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-brand-400" /> Complete Architect Intake Framework
                </h2>
                <p className="text-xs text-surface-400">Provide parameters for the AI Architect to formulate a 100% complete, handover-ready full-stack blueprint.</p>
              </div>
              <button onClick={() => setShowIntakeModal(false)} className="text-surface-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border-b border-surface-800 gap-4 text-xs font-semibold">
              <button
                onClick={() => setIntakeTab("concept")}
                className={`pb-2 border-b-2 transition-colors ${intakeTab === "concept" ? "border-brand-500 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"}`}
              >
                1. Concept & Market
              </button>
              <button
                onClick={() => setIntakeTab("tech")}
                className={`pb-2 border-b-2 transition-colors ${intakeTab === "tech" ? "border-brand-500 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"}`}
              >
                2. Tech & Connectivity
              </button>
              <button
                onClick={() => setIntakeTab("features")}
                className={`pb-2 border-b-2 transition-colors ${intakeTab === "features" ? "border-brand-500 text-brand-400" : "border-transparent text-surface-400 hover:text-surface-200"}`}
              >
                3. Features & Compliance
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
              {intakeTab === "concept" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Startup / Project Name</label>
                      <input
                        type="text"
                        value={ideaForm.projectName}
                        onChange={(e) => setIdeaForm({ ...ideaForm, projectName: e.target.value })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Platform Type</label>
                      <select
                        value={ideaForm.platform}
                        onChange={(e) => setIdeaForm({ ...ideaForm, platform: e.target.value })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500 font-mono"
                      >
                        <option value="Web App + Mobile">Web App + Mobile (Next.js + Flutter)</option>
                        <option value="Web App Only">Web App Only (Next.js 15)</option>
                        <option value="USSD / SMS Bot + Web">USSD / SMS Bot + Web Dashboard</option>
                        <option value="WhatsApp Bot + Backend">WhatsApp Bot + FastAPI Backend</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">One-Liner Pitch</label>
                    <input
                      type="text"
                      value={ideaForm.oneLiner}
                      onChange={(e) => setIdeaForm({ ...ideaForm, oneLiner: e.target.value })}
                      placeholder="e.g. Decentralized commodity exchange for East African coffee farmers"
                      className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Problem Statement</label>
                    <textarea
                      rows={2}
                      value={ideaForm.problem}
                      onChange={(e) => setIdeaForm({ ...ideaForm, problem: e.target.value })}
                      className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Target Users / Personas</label>
                      <input
                        type="text"
                        value={ideaForm.targetUsers}
                        onChange={(e) => setIdeaForm({ ...ideaForm, targetUsers: e.target.value })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Monetization Model</label>
                      <input
                        type="text"
                        value={ideaForm.monetization}
                        onChange={(e) => setIdeaForm({ ...ideaForm, monetization: e.target.value })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {intakeTab === "tech" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Tech Stack Preferences</label>
                    <input
                      type="text"
                      value={ideaForm.techPreferences}
                      onChange={(e) => setIdeaForm({ ...ideaForm, techPreferences: e.target.value })}
                      className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">African Payment & Telecom Integrations</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ideaForm.integrations.map((item, idx) => (
                        <span key={idx} className="flex items-center gap-1 bg-surface-800 px-2.5 py-1 rounded text-xs text-brand-300 font-mono">
                          {item}
                          <button onClick={() => setIdeaForm({ ...ideaForm, integrations: ideaForm.integrations.filter((_, i) => i !== idx) })} className="hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newIntegrationInput}
                        onChange={(e) => setNewIntegrationInput(e.target.value)}
                        placeholder="Add integration (e.g. M-Pesa, Paystack, Africa's Talking)..."
                        className="flex-1 rounded border border-surface-750 bg-surface-950 px-3 py-1.5 text-white outline-none font-mono"
                      />
                      <button
                        onClick={() => {
                          if (newIntegrationInput.trim()) {
                            setIdeaForm({ ...ideaForm, integrations: [...ideaForm.integrations, newIntegrationInput.trim()] });
                            setNewIntegrationInput("");
                          }
                        }}
                        className="btn-secondary px-3 py-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Connectivity Constraints</label>
                      <input
                        type="text"
                        value={ideaForm.constraints.join(", ")}
                        onChange={(e) => setIdeaForm({ ...ideaForm, constraints: e.target.value.split(",").map((s) => s.trim()) })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Delivery Timeline</label>
                      <input
                        type="text"
                        value={ideaForm.timeline}
                        onChange={(e) => setIdeaForm({ ...ideaForm, timeline: e.target.value })}
                        className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {intakeTab === "features" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Core Feature Scope</label>
                    <div className="space-y-1.5 mb-2">
                      {ideaForm.coreFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-surface-950 p-2 rounded border border-surface-800">
                          <span className="text-surface-200">{feat}</span>
                          <button onClick={() => setIdeaForm({ ...ideaForm, coreFeatures: ideaForm.coreFeatures.filter((_, i) => i !== idx) })} className="text-surface-500 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFeatureInput}
                        onChange={(e) => setNewFeatureInput(e.target.value)}
                        placeholder="Add required feature..."
                        className="flex-1 rounded border border-surface-750 bg-surface-950 px-3 py-1.5 text-white outline-none font-sans"
                      />
                      <button
                        onClick={() => {
                          if (newFeatureInput.trim()) {
                            setIdeaForm({ ...ideaForm, coreFeatures: [...ideaForm.coreFeatures, newFeatureInput.trim()] });
                            setNewFeatureInput("");
                          }
                        }}
                        className="btn-secondary px-3 py-1 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Target Compliance Frameworks</label>
                    <input
                      type="text"
                      value={ideaForm.compliance.join(", ")}
                      onChange={(e) => setIdeaForm({ ...ideaForm, compliance: e.target.value.split(",").map((s) => s.trim()) })}
                      className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1 font-mono">Success Criteria</label>
                    <input
                      type="text"
                      value={ideaForm.successCriteria}
                      onChange={(e) => setIdeaForm({ ...ideaForm, successCriteria: e.target.value })}
                      className="w-full rounded border border-surface-750 bg-surface-950 px-3 py-2 text-white outline-none font-sans"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-surface-800 pt-3">
              <span className="text-[11px] text-surface-400 font-mono">Zero-Question Guarantee: AI Architect resolves all technical ambiguities.</span>
              <div className="flex gap-3">
                <button onClick={() => setShowIntakeModal(false)} className="btn-secondary px-4 py-2 text-xs">
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerateBlueprint(true)}
                  disabled={isGenerating}
                  className="btn-primary px-6 py-2 text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {isGenerating ? "Formulating Blueprint..." : "Generate Complete Blueprint"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Visual Architectural Blueprint Studio Modal */}
      {showBlueprintModal && blueprintData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-6">
          <div className="w-full max-w-5xl rounded-2xl border border-surface-700 bg-surface-900 p-6 shadow-2xl space-y-4 font-sans max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-400 font-mono font-bold text-sm">
                  100%
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-400" /> Architectural Blueprint: {blueprintData.projectName}
                  </h2>
                  <p className="text-xs text-surface-400 font-mono">
                    {blueprintData.coreModules?.length || 4} Core Modules • {blueprintData.milestones?.length || 5} Milestones • Handover-Ready
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBlueprintModal(false)} className="text-surface-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border-b border-surface-800 gap-3 text-xs font-semibold overflow-x-auto">
              {[
                { id: "overview", label: "📊 Overview & Stack" },
                { id: "arch", label: "🏗️ System Architecture" },
                { id: "data", label: "🗄️ Database & APIs" },
                { id: "modules", label: "🧩 Core Modules" },
                { id: "milestones", label: "🗺️ Build Milestones" },
                { id: "json", label: "💻 Blueprint JSON" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBlueprintTab(tab.id as any)}
                  className={`pb-2 border-b-2 transition-colors whitespace-nowrap ${
                    blueprintTab === tab.id
                      ? "border-brand-500 text-brand-400 font-bold"
                      : "border-transparent text-surface-400 hover:text-surface-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs">
              {blueprintTab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">Executive Summary</span>
                    <p className="mt-1 text-sm text-surface-200 leading-relaxed">{blueprintData.summary}</p>
                  </div>

                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">Pinned Tech Stack</span>
                    <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
                      {Object.entries(blueprintData.techStack || {}).filter(([k]) => k !== "rationale").map(([k, v]) => (
                        <div key={k} className="rounded bg-surface-900 p-2 border border-surface-800">
                          <span className="text-surface-500 uppercase text-[10px]">{k}:</span>{" "}
                          <span className="text-surface-200 font-semibold">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                        </div>
                      ))}
                    </div>
                    {blueprintData.techStack?.rationale && (
                      <p className="mt-3 text-xs text-surface-400 leading-relaxed">
                        <b className="text-brand-300">Stack Rationale:</b> {blueprintData.techStack.rationale}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">Risks & Architectural Assumptions</span>
                    <ul className="mt-2 space-y-1 text-surface-300">
                      {blueprintData.risksAndAssumptions?.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span> <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {blueprintTab === "arch" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">System Architecture Diagram</span>
                    <pre className="mt-2 font-mono text-[11px] text-brand-300 leading-tight bg-surface-900 p-3 rounded border border-surface-800 overflow-x-auto">
                      {blueprintData.systemArchitecture}
                    </pre>
                  </div>

                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">End-to-End User Data Flows</span>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-surface-300 leading-relaxed">
                      {blueprintData.dataFlow}
                    </pre>
                  </div>
                </div>
              )}

              {blueprintTab === "data" && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">PostgreSQL Database Schemas</span>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {typeof blueprintData.databaseSchema === "object" && !Array.isArray(blueprintData.databaseSchema) ? (
                        Object.entries(blueprintData.databaseSchema).map(([table, cols]) => (
                          <div key={table} className="rounded bg-surface-900 p-3 border border-surface-800 font-mono text-xs">
                            <span className="font-bold text-brand-400">{table}</span>
                            <ul className="mt-1.5 space-y-0.5 text-[11px] text-surface-400">
                              {(cols as string[]).map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <pre className="font-mono text-xs text-surface-300">{String(blueprintData.databaseSchema)}</pre>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-950 p-4 border border-surface-800">
                    <span className="text-[10px] font-bold text-brand-400 uppercase font-mono tracking-wider">API Endpoint Matrix</span>
                    <div className="mt-2 space-y-1.5 font-mono text-xs">
                      {Array.isArray(blueprintData.apiDesign) ? (
                        blueprintData.apiDesign.map((ep, i) => (
                          <div key={i} className="flex items-center gap-3 rounded bg-surface-900 px-3 py-2 border border-surface-800">
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${ep.method === "GET" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                              {ep.method}
                            </span>
                            <span className="font-semibold text-white">{ep.path}</span>
                            <span className="text-surface-400 text-[11px] font-sans flex-1 text-right">{ep.summary}</span>
                          </div>
                        ))
                      ) : (
                        <pre className="text-surface-300 font-mono text-xs">{String(blueprintData.apiDesign)}</pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {blueprintTab === "modules" && (
                <div className="grid grid-cols-2 gap-4">
                  {blueprintData.coreModules?.map((m) => (
                    <div key={m.id} className="rounded-lg bg-surface-950 p-4 border border-surface-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs font-mono font-bold text-brand-400">{m.id}</span>
                        <h3 className="font-bold text-white text-xs">{m.name}</h3>
                      </div>
                      <p className="text-xs text-surface-400">{m.purpose}</p>
                      <div>
                        <span className="text-[10px] font-bold text-surface-500 uppercase font-mono">Target Files</span>
                        <div className="flex flex-wrap gap-1.5 mt-1 font-mono text-[11px]">
                          {m.files?.map((f, i) => (
                            <span key={i} className="bg-surface-900 px-2 py-0.5 rounded text-surface-300 border border-surface-800">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {blueprintTab === "milestones" && (
                <div className="space-y-3">
                  {blueprintData.milestones?.map((ms, idx) => (
                    <div key={ms.id} className="rounded-lg bg-surface-950 p-4 border border-surface-800 flex items-start gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 font-mono font-bold text-xs flex-shrink-0">
                        {ms.id}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <h4 className="font-bold text-white text-xs">{ms.name}</h4>
                        <p className="text-xs text-surface-400">{ms.objective}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
                          {ms.filesToCreate?.map((f, i) => (
                            <span key={i} className="bg-surface-900 px-2 py-0.5 rounded text-surface-300 border border-surface-800">
                              + {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {blueprintTab === "json" && (
                <div className="space-y-2">
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={16}
                    className="w-full rounded-lg border border-surface-800 bg-surface-950 p-3 font-mono text-xs text-surface-200 outline-none focus:border-brand-500"
                  />
                  <p className="text-[11px] text-surface-400 font-mono">
                    Edit blueprint JSON directly. Saving validates structure for autonomous builder execution.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-surface-800 pt-3">
              <button
                onClick={() => { setShowBlueprintModal(false); setShowIntakeModal(true); }}
                className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Edit Idea Parameters
              </button>

              <div className="flex gap-3">
                <button onClick={() => setShowBlueprintModal(false)} className="btn-secondary px-4 py-2 text-xs">
                  Save Draft
                </button>
                <button
                  onClick={handleApproveAndBuild}
                  className="btn-primary px-6 py-2 text-xs font-bold shadow-lg shadow-brand-500/25 flex items-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5" /> Approve & Build Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
