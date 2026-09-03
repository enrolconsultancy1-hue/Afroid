import type { Monaco } from "@monaco-editor/react";

export const GEEZCODE_LANGUAGE_ID = "geezcode";

/**
 * Registers the geezcodE Domain-Specific Language (DSL) in a Monaco Editor instance.
 * Enables syntax highlighting, bracket matching, annotations, and intelligent autocomplete.
 */
export function registerGeezCodeLanguage(monaco: Monaco) {
  if (!monaco?.languages) return;

  const existingLanguages = monaco.languages.getLanguages();
  if (existingLanguages.some((lang: any) => lang.id === GEEZCODE_LANGUAGE_ID)) {
    return;
  }

  // 1. Register Language
  monaco.languages.register({
    id: GEEZCODE_LANGUAGE_ID,
    extensions: [".geez", ".geezcode"],
    aliases: ["geezcode", "GeezCode", "geez"],
    mimetypes: ["text/x-geezcode"],
  });

  // 2. Language Configuration (brackets, comments)
  monaco.languages.setLanguageConfiguration(GEEZCODE_LANGUAGE_ID, {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"', notIn: ["string"] },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });

  // 3. Monarch Tokenizer for Syntax Highlighting
  monaco.languages.setMonarchTokensProvider(GEEZCODE_LANGUAGE_ID, {
    keywords: [
      "domain",
      "entity",
      "flow",
      "rule",
      "api",
      "import",
      "from",
      "describe",
      "step",
      "action",
      "input",
      "output",
      "condition",
      "on_error",
      "when",
      "then",
      "auth",
      "public",
      "authenticated",
      "admin",
      "owner",
    ],
    typeKeywords: [
      "string",
      "number",
      "boolean",
      "date",
      "money",
      "email",
      "phone",
      "url",
      "file",
      "void",
    ],
    httpMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    tokenizer: {
      root: [
        [/@\w+/, "annotation"],
        [/[A-Z]\w*/, "type.identifier"],
        [/\b(GET|POST|PUT|DELETE|PATCH)\b/, "keyword.http"],
        [/"[^"]*"/, "string"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [
          /[a-z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@default": "identifier",
            },
          },
        ],
        [/[{}()\[\]]/, "@brackets"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [
        [/[^\/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[\/*]/, "comment"],
      ],
    },
  });

  // 4. Autocomplete / Snippet Provider
  monaco.languages.registerCompletionItemProvider(GEEZCODE_LANGUAGE_ID, {
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        {
          label: "domain",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'domain ${1:DomainName} {\n  describe "${2:Domain description}"\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a sovereign business domain",
          range,
        },
        {
          label: "entity",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText:
            'entity ${1:EntityName} {\n  name: string @required;\n  email: email @unique;\n  createdAt: date @default(now);\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define an entity model with typed fields and constraints",
          range,
        },
        {
          label: "flow",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText:
            'flow ${1:FlowName} {\n  step ${2:StepName} {\n    action "${3:Action description}"\n    input ${4:InputType}\n    output ${5:OutputType}\n  }\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define a multi-step business flow",
          range,
        },
        {
          label: "api",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText:
            'api ${1:ApiName} {\n  GET    "/${2:resource}"       -> ${3:Type}[]    auth public\n  POST   "/${2:resource}"       -> ${3:Type}      auth authenticated\n  GET    "/${2:resource}/:id"   -> ${3:Type}      auth authenticated\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define REST endpoints with auth level",
          range,
        },
        {
          label: "rule",
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: "rule ${1:RuleName} when ${2:condition} then ${3:action}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Define business logic trigger rule",
          range,
        },
      ];

      return { suggestions };
    },
  });
}
