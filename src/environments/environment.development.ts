/**
 * Configuración de entorno para desarrollo
 * MindVoice - Conexión al backend Flask
 * OpenRouter es el proveedor principal
 */
export const environment = {
  production: false,
  apiUrl: 'http://18.223.30.63:5000',
  socketUrl: 'ws://18.223.30.63:5000',
  // API key de OpenRouter
  geminiApiKey: '',
  openRouterApiKey: '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',
  openRouterModel: 'google/gemini-2.5-flash',
};
