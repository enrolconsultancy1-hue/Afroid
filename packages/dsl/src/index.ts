/**
 * @afroid/dsl entry point.
 */

export * from "./types";
export * from "./parser";

import { DSLParser } from "./parser";
import { StartupBlueprintAST } from "./types";

export function parseAfroidDSL(source: string): StartupBlueprintAST {
  const parser = new DSLParser();
  return parser.parse(source);
}
