/**
 * Configuración de entorno para producción
 * MindVoice - Conexión al backend Flask
 */
export const environment = {
  production: true,
  apiUrl: 'http://18.223.30.63:5000',
  socketUrl: 'ws://18.223.30.63:5000',
  // La API key de Gemini se inyecta en build time via cross-env
  geminiApiKey: (globalThis as Record<string, unknown>)['AIzaSyCYEfPbFOILm4FXmcypIBVe3yesHlkM3cw'] as string ?? ''
};
