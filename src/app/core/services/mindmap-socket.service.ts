import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  SocketEditMindmapPayload,
  SocketJoinSessionPayload,
  SocketLeaveSessionPayload,
  SocketMindmapUpdatedEvent,
  SocketPresenceEvent,
  SocketShareMindmapPayload,
} from '../models/socket.models';

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

@Injectable({ providedIn: 'root' })
export class MindmapSocketService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  private socket: Socket | null = null;
  private currentSessionId: string | null = null;
  private pendingSessionPayload: SocketJoinSessionPayload | null = null;

  private readonly connectionStatusSubject = new BehaviorSubject<SocketConnectionStatus>('disconnected');
  private readonly mindmapUpdatedSubject = new Subject<SocketMindmapUpdatedEvent>();
  private readonly userJoinedSubject = new Subject<SocketPresenceEvent>();
  private readonly userLeftSubject = new Subject<SocketPresenceEvent>();
  private readonly invitationSubject = new Subject<Record<string, unknown>>();

  readonly connectionStatus$ = this.connectionStatusSubject.asObservable();

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.socket?.connected || this.connectionStatusSubject.value === 'connecting') {
      return;
    }

    this.connectionStatusSubject.next('connecting');
    const socketUrl = this.resolveSocketUrl();

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.currentSessionId) {
      this.leaveSession(this.currentSessionId);
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.pendingSessionPayload = null;
    this.connectionStatusSubject.next('disconnected');
  }

  joinSession(sessionId: string, username?: string): void {
    const normalizedSession = sessionId.trim();
    if (!normalizedSession || !isPlatformBrowser(this.platformId)) {
      return;
    }

    const payload: SocketJoinSessionPayload = {
      session_id: normalizedSession,
      username: username?.trim() || 'Usuario',
    };

    this.pendingSessionPayload = payload;

    if (!this.socket?.connected) {
      this.connect();
      return;
    }

    if (this.currentSessionId && this.currentSessionId !== normalizedSession) {
      this.leaveSession(this.currentSessionId, payload.username);
    }

    this.socket.emit('join_session', payload);
    this.currentSessionId = normalizedSession;
  }

  leaveSession(sessionId: string, username?: string): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      return;
    }

    const normalizedSession = sessionId.trim();
    if (!normalizedSession) {
      return;
    }

    const payload: SocketLeaveSessionPayload = {
      session_id: normalizedSession,
      username: username?.trim() || 'Usuario',
    };

    this.socket.emit('leave_session', payload);
    if (this.currentSessionId === normalizedSession) {
      this.currentSessionId = null;
    }
  }

  emitMindmapEdit(payload: SocketEditMindmapPayload): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      return;
    }

    const sessionId = payload.session_id.trim();
    const action = payload.action.trim();
    if (!sessionId || !action) {
      return;
    }

    this.socket.emit('edit_mindmap', {
      session_id: sessionId,
      action,
      node_data: payload.node_data,
      ...(payload.username ? { username: payload.username } : {}),
    });
  }

  shareMindmap(payload: SocketShareMindmapPayload): void {
    if (!isPlatformBrowser(this.platformId) || !this.socket?.connected) {
      return;
    }

    const documentId = payload.document_id.trim();
    if (!documentId) {
      return;
    }

    this.socket.emit('share_mindmap', {
      document_id: documentId,
      ...(payload.target_user_id ? { target_user_id: payload.target_user_id } : {}),
    });
  }

  onMindmapUpdated(): Observable<SocketMindmapUpdatedEvent> {
    return this.mindmapUpdatedSubject.asObservable();
  }

  onUserJoined(): Observable<SocketPresenceEvent> {
    return this.userJoinedSubject.asObservable();
  }

  onUserLeft(): Observable<SocketPresenceEvent> {
    return this.userLeftSubject.asObservable();
  }

  onInvitationReceived(): Observable<Record<string, unknown>> {
    return this.invitationSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.connectionStatusSubject.complete();
    this.mindmapUpdatedSubject.complete();
    this.userJoinedSubject.complete();
    this.userLeftSubject.complete();
    this.invitationSubject.complete();
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      this.connectionStatusSubject.next('connected');

      if (this.pendingSessionPayload) {
        this.joinSession(this.pendingSessionPayload.session_id, this.pendingSessionPayload.username);
      }
    });

    this.socket.on('disconnect', () => {
      this.connectionStatusSubject.next('disconnected');
    });

    this.socket.on('connect_error', () => {
      this.connectionStatusSubject.next('error');
    });

    this.socket.on('mindmap_updated', (event: SocketMindmapUpdatedEvent) => {
      this.mindmapUpdatedSubject.next(event);
    });

    this.socket.on('user_joined', (event: SocketPresenceEvent) => {
      this.userJoinedSubject.next(event);
    });

    this.socket.on('user_left', (event: SocketPresenceEvent) => {
      this.userLeftSubject.next(event);
    });

    this.socket.on('invitation_received', (event: Record<string, unknown>) => {
      this.invitationSubject.next(event);
    });
  }

  private resolveSocketUrl(): string {
    const socketUrl = environment.socketUrl?.trim();
    if (socketUrl) {
      return socketUrl;
    }

    return environment.apiUrl?.trim() || 'http://18.223.30.63:5000';
  }
}
