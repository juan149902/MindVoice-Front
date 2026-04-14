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
  openRouterApiKey: '',
  openRouterModel: 'qwen/qwen3.6-plus',
};
