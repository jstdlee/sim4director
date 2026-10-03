export interface Env {
  AI: Ai
  DB: D1Database
  TutorAgent: DurableObjectNamespace
  ASSETS: Fetcher
  LLM_MODEL: string
  CLEF_MODEL: string
  CLEF_FLASH_MODEL: string
  AI_GATEWAY_ID: string
  CF_ACCOUNT_ID: string
  /** Secret. One or more login tokens, comma-separated. */
  ACCESS_TOKEN?: string
  /** Secret. Backup web search when Cloudflare Web Search API fails. */
  EXA_API_KEY?: string
}

export interface Byok {
  provider: 'openai' | 'anthropic' | 'google-ai-studio' | 'workers-ai' | 'openai-compatible'
  model: string
  key: string
  /** Only for openai-compatible, e.g. https://openrouter.ai/api/v1 */
  baseUrl?: string
}

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }
