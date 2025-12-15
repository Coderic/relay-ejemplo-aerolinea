import { Injectable, signal, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';

export interface RelayMessage {
  tipo: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class RelayService {
  private socket: Socket | null = null;
  private readonly RELAY_URL = this.getRelayUrl();
  
  private getRelayUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:5000';
    }
    if (window.location.hostname === 'localhost' && window.location.port === '8000') {
      return 'http://localhost:5000';
    }
    if (window.location.hostname === 'coderic.org') {
      return 'wss://demo.relay.coderic.net';
    }
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  
  // Signals para estado reactivo
  connected = signal(false);
  identified = signal(false);
  sessionId = signal(this.getSessionId());
  
  // Observable para mensajes
  private messageSubject = new Subject<RelayMessage>();
  messages$ = this.messageSubject.asObservable();

  private getSessionId(): string {
    let id = localStorage.getItem('aerolineaSession');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('aerolineaSession', id);
    }
    return id;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(`${this.RELAY_URL}/relay`, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[Relay] Conectado:', this.socket?.id);
        this.connected.set(true);
        
        // Identificarse automáticamente
        this.socket?.emit('identificar', this.sessionId(), (ok: boolean) => {
          this.identified.set(ok);
          console.log('[Relay] Identificado:', this.sessionId());
        });
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Relay] Desconectado:', reason);
        this.connected.set(false);
        this.identified.set(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Relay] Error:', error.message);
        reject(error);
      });

      this.socket.on('relay', (data: RelayMessage) => {
        this.messageSubject.next(data);
      });

      this.socket.on('notificar', (data: RelayMessage) => {
        this.messageSubject.next({ ...data, _channel: 'notificar' });
      });
    });
  }

  enviar(data: RelayMessage, destino: 'yo' | 'ustedes' | 'nosotros' = 'nosotros'): void {
    this.socket?.emit('relay', { ...data, destino });
  }

  enviarATodos(data: RelayMessage): void {
    this.enviar(data, 'nosotros');
  }

  enviarAOtros(data: RelayMessage): void {
    this.enviar(data, 'ustedes');
  }

  enviarAMi(data: RelayMessage): void {
    this.enviar(data, 'yo');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connected.set(false);
  }
}

