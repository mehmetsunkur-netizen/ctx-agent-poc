import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
  CHROMA_HOST: z.string().default("localhost"),
  CHROMA_PORT: z.string().default("8000"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required in .env"),
  OPENAI_BASE_URL: z.string().optional(),
  CHROMA_AUTH_TOKEN: z.string().optional(),
});

export const configResult = envSchema.safeParse(process.env);
export const config = configResult.success ? configResult.data : null;
