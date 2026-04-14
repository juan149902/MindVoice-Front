declare const GEMINI_API_KEY: string;
declare const OPENROUTER_API_KEY: string;
declare const OPENROUTER_MODEL: string;

interface Window {
  __MINDVOICE_LOCAL_CONFIG__?: {
    openRouterApiKey?: string;
    openRouterModel?: string;
    geminiApiKey?: string;
  };
}
