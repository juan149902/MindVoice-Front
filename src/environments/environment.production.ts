/**
 * Configuración de entorno para producción
 * MindVoice - Conexión al backend Flask
 * OpenRouter es el proveedor principal
 */
export const environment = {
  production: true,
  apiUrl: 'http://18.223.30.63:5000',
  socketUrl: 'ws://18.223.30.63:5000',
  // API keys inyectadas desde variables de entorno en build time
  geminiApiKey: '',
  openRouterApiKey: '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',
  openRouterModel: 'qwen/qwen3.6-plus',
};