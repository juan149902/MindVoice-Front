/**
 * Contratos de Socket.IO para colaboración en mapas mentales
 * Basado en eventos backend: join_session, leave_session, edit_mindmap, mindmap_updated.
 */

export interface SocketJoinSessionPayload {
  session_id: string;
  username?: string;
}

export interface SocketLeaveSessionPayload {
  session_id: string;
  username?: string;
}

export interface SocketEditMindmapPayload {
  session_id: string;
  action: string;
  node_data: Record<string, unknown>;
  username?: string;
}

export interface SocketShareMindmapPayload {
  document_id: string;
  target_user_id?: string;
}

export interface SocketMindmapUpdatedEvent {
  session_id: string;
  action: string;
  node_data: Record<string, unknown>;
  username?: string;
}

export interface SocketPresenceEvent {
  username?: string;
  session_id?: string;
  message?: string;
}
