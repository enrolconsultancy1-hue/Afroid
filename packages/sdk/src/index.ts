/**
 * @afroid/sdk — Shared TypeScript types and utilities for the Afroid platform.
 *
 * This package contains:
 * - Type definitions shared between frontend and backend
 * - Zod validation schemas
 * - Constants and enums
 */

// --- Enums ---

export const UserRole = {
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
} as const;

export const OrgMemberRole = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export const ProjectStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export const StartupStage = {
  IDEA: "idea",
  MVP: "mvp",
  SEED: "seed",
  EARLY: "early",
  GROWTH: "growth",
  SCALE: "scale",
} as const;

export const CertificationStatus = {
  PENDING: "pending",
  RUNNING: "running",
  PASSED: "passed",
  FAILED: "failed",
  CONDITIONAL: "conditional",
  EXPIRED: "expired",
} as const;

export const ApplicationStatus = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  SUBMITTED: "submitted",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

// --- Type Helpers ---

export type ValueOf<T> = T[keyof T];
export type UserRoleType = ValueOf<typeof UserRole>;
export type OrgMemberRoleType = ValueOf<typeof OrgMemberRole>;
export type ProjectStatusType = ValueOf<typeof ProjectStatus>;
export type StartupStageType = ValueOf<typeof StartupStage>;
export type CertificationStatusType = ValueOf<typeof CertificationStatus>;
export type ApplicationStatusType = ValueOf<typeof ApplicationStatus>;

// --- WebSocket Message Types ---

export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

export interface AgentThinkingPayload {
  agentName: string;
  title: string;
}

export interface AgentActionPayload {
  agentName: string;
  title: string;
  detail: string;
}

export interface CodeChunkPayload {
  filePath: string;
  chunk: string;
}

export interface CodeCompletePayload {
  totalFiles: number;
  totalLines: number;
}

export interface BlueprintApprovalPayload {
  architecture: Record<string, unknown>;
}
