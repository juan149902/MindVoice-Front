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
  openRouterApiKey: '',
  openRouterModel: 'google/gemini-2.5-flash',
};
