/**
 * @afroid/dsl — Lexer & Parser for .afroid specification scripts.
 *
 * Example Syntax:
 * ```
 * project AgriPay {
 *   description: "Agricultural micro-payments in East Africa"
 *   jurisdiction: [Kenya, Rwanda]
 *
 *   entity Farmer {
 *     id: uuid
 *     phoneNumber: string unique
 *     fullName: string
 *     acres: int optional
 *   }
 *
 *   service PaymentService {
 *     type: fastapi
 *     port: 8001
 *     use Farmer
 *     endpoint POST /v1/charge {
 *       auth: true
 *       summary: "Initiate M-Pesa push charge"
 *     }
 *   }
 * }
 * ```
 */

import { StartupBlueprintAST, EntityDef, FieldDef, ServiceDef, EndpointDef } from "./types";

export class DSLParser {
  private pos = 0;
  private input = "";
  private line = 1;
  private col = 1;

  public parse(source: string): StartupBlueprintAST {
    this.input = source;
    this.pos = 0;
    this.line = 1;
    this.col = 1;

    const ast: StartupBlueprintAST = {
      projectName: "UntitledProject",
      description: "",
      version: "1.0.0",
      targetJurisdictions: [],
      entities: [],
      services: [],
    };

    this.skipWhitespace();

    // Parse 'project <Name> { ... }'
    if (this.matchKeyword("project")) {
      ast.projectName = this.consumeIdentifier();
      this.consumeChar("{");

      while (!this.isEOF() && !this.peekChar("}")) {
        this.skipWhitespace();
        if (this.matchKeyword("description:")) {
          ast.description = this.consumeStringLiteral();
        } else if (this.matchKeyword("entity")) {
          ast.entities.push(this.parseEntity());
        } else if (this.matchKeyword("service")) {
          ast.services.push(this.parseService());
        } else {
          // Skip unrecognized token
          this.advance();
        }
      }

      this.consumeChar("}");
    }

    return ast;
  }

  private parseEntity(): EntityDef {
    const name = this.consumeIdentifier();
    this.consumeChar("{");
    const fields: FieldDef[] = [];

    while (!this.isEOF() && !this.peekChar("}")) {
      this.skipWhitespace();
      if (this.peekChar("}")) break;

      const fieldName = this.consumeIdentifier();
      this.consumeChar(":");
      const fieldType = this.consumeIdentifier();

      let isOptional = false;
      let isUnique = false;

      while (!this.isEOF() && !this.peekChar("\n") && !this.peekChar("}")) {
        this.skipWhitespace();
        if (this.matchKeyword("optional")) isOptional = true;
        else if (this.matchKeyword("unique")) isUnique = true;
        else break;
      }

      fields.push({
        name: fieldName,
        type: fieldType,
        isOptional,
        isUnique,
      });
    }

    this.consumeChar("}");
    return {
      name,
      tableName: name.toLowerCase() + "s",
      fields,
    };
  }

  private parseService(): ServiceDef {
    const name = this.consumeIdentifier();
    this.consumeChar("{");
    let serviceType: "fastapi" | "nextjs" | "node" = "fastapi";
    let port = 8000;
    const entities: string[] = [];
    const endpoints: EndpointDef[] = [];

    while (!this.isEOF() && !this.peekChar("}")) {
      this.skipWhitespace();
      if (this.peekChar("}")) break;

      if (this.matchKeyword("type:")) {
        const t = this.consumeIdentifier();
        if (t === "fastapi" || t === "nextjs" || t === "node") serviceType = t;
      } else if (this.matchKeyword("port:")) {
        port = parseInt(this.consumeIdentifier(), 10) || 8000;
      } else if (this.matchKeyword("use")) {
        entities.push(this.consumeIdentifier());
      } else if (this.matchKeyword("endpoint")) {
        const method = this.consumeIdentifier().toUpperCase() as any;
        const path = this.consumeIdentifier();
        this.consumeChar("{");
        let summary = "";
        let auth = false;

        while (!this.isEOF() && !this.peekChar("}")) {
          this.skipWhitespace();
          if (this.matchKeyword("summary:")) summary = this.consumeStringLiteral();
          else if (this.matchKeyword("auth:")) auth = this.consumeIdentifier() === "true";
          else this.advance();
        }
        this.consumeChar("}");

        endpoints.push({
          method,
          path,
          summary,
          requiresAuth: auth,
        });
      } else {
        this.advance();
      }
    }

    this.consumeChar("}");
    return {
      name,
      type: serviceType,
      port,
      entities,
      endpoints,
    };
  }

  // --- Lexer Helpers ---

  private isEOF(): boolean {
    return this.pos >= this.input.length;
  }

  private advance(): string {
    const ch = this.input[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private peekChar(expected: string): boolean {
    this.skipWhitespace();
    return this.input[this.pos] === expected;
  }

  private skipWhitespace(): void {
    while (!this.isEOF()) {
      const ch = this.input[this.pos];
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
      } else if (ch === "/" && this.input[this.pos + 1] === "/") {
        while (!this.isEOF() && this.input[this.pos] !== "\n") this.advance();
      } else {
        break;
      }
    }
  }

  private matchKeyword(kw: string): boolean {
    this.skipWhitespace();
    if (this.input.startsWith(kw, this.pos)) {
      this.pos += kw.length;
      this.col += kw.length;
      return true;
    }
    return false;
  }

  private consumeChar(expected: string): void {
    this.skipWhitespace();
    if (this.input[this.pos] === expected) {
      this.advance();
    }
  }

  private consumeIdentifier(): string {
    this.skipWhitespace();
    let res = "";
    while (!this.isEOF()) {
      const ch = this.input[this.pos];
      if (/[a-zA-Z0-9_\-\/]/.test(ch)) {
        res += this.advance();
      } else {
        break;
      }
    }
    return res;
  }

  private consumeStringLiteral(): string {
    this.skipWhitespace();
    let res = "";
    if (this.input[this.pos] === '"') {
      this.advance();
      while (!this.isEOF() && this.input[this.pos] !== '"') {
        res += this.advance();
      }
      if (this.input[this.pos] === '"') this.advance();
    }
    return res;
  }
}
