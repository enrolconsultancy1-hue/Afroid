/**
 * @afroid/dsl — AST Node Definitions.
 */

export interface SourceLocation {
  line: number;
  column: number;
}

export interface FieldDef {
  name: string;
  type: string;
  isOptional: boolean;
  isUnique?: boolean;
  isIndex?: boolean;
  defaultValue?: string | number | boolean;
}

export interface EntityDef {
  name: string;
  tableName: string;
  fields: FieldDef[];
  loc?: SourceLocation;
}

export interface EndpointDef {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  requestBodyEntity?: string;
  responseEntity?: string;
  requiresAuth: boolean;
}

export interface ServiceDef {
  name: string;
  type: "fastapi" | "nextjs" | "node";
  port: number;
  entities: string[];
  endpoints: EndpointDef[];
  loc?: SourceLocation;
}

export interface StartupBlueprintAST {
  projectName: string;
  description: string;
  version: string;
  targetJurisdictions: string[];
  entities: EntityDef[];
  services: ServiceDef[];
}
