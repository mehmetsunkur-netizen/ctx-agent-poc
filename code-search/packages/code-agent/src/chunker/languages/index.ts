import { LanguageConfig } from "./types";
import { tsxConfig, typescriptConfig } from "./typescript";
import { pythonConfig } from "./python";

export type { LanguageConfig } from "./types";

export const languageConfigs: Record<string, LanguageConfig> = {
  ".ts": typescriptConfig,
  ".tsx": tsxConfig,
  ".py": pythonConfig,
};
