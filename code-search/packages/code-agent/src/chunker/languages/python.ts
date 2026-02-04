import { LanguageConfig } from "./types";
import Python from "tree-sitter-python";
import { Language } from "tree-sitter";

export const pythonConfig: LanguageConfig = {
  language: () => Python as unknown as Language,
  name: "python",
  targetNodes: new Set<string>([
    "function_definition",
    "class_definition",
    "decorated_definition",
    "expression_statement",
    "global_statement",
    "if_statement",
  ]),
};
