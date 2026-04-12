/**
 * Configuración de entorno para desarrollo
 * MindVoice - Conexión al backend Flask
 */
export const environment = {
  production: false,
  apiUrl: 'http://18.223.30.63:5000',
  socketUrl: 'ws://18.223.30.63:5000',
  // La API key de Gemini se inyecta en build time via cross-env
  geminiApiKey: '',
};
