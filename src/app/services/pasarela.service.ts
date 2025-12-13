import { Injectable, signal, computed } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Subject } from 'rxjs';

export interface PasarelaMessage {
  tipo: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class PasarelaService {
  private socket: Socket | null = null;
  private readonly PASARELA_URL = 'http://localhost:5000';
  
  // Signals para estado reactivo
  connected = signal(false);
  identified = signal(false);
  sessionId = signal(this.getSessionId());
  
  // Observable para mensajes
  private messageSubject = new Subject<PasarelaMessage>();
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
      this.socket = io(`${this.PASARELA_URL}/pasarela`, {
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('[Pasarela] Conectado:', this.socket?.id);
        this.connected.set(true);
        
        // Identificarse automáticamente
        this.socket?.emit('identificar', this.sessionId(), (ok: boolean) => {
          this.identified.set(ok);
          console.log('[Pasarela] Identificado:', this.sessionId());
        });
        
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Pasarela] Desconectado:', reason);
        this.connected.set(false);
        this.identified.set(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Pasarela] Error:', error.message);
        reject(error);
      });

      this.socket.on('pasarela', (data: PasarelaMessage) => {
        this.messageSubject.next(data);
      });

      this.socket.on('notificar', (data: PasarelaMessage) => {
        this.messageSubject.next({ ...data, _channel: 'notificar' });
      });
    });
  }

  enviar(data: PasarelaMessage, destino: 'yo' | 'ustedes' | 'nosotros' = 'nosotros'): void {
    this.socket?.emit('pasarela', { ...data, destino });
  }

  enviarATodos(data: PasarelaMessage): void {
    this.enviar(data, 'nosotros');
  }

  enviarAOtros(data: PasarelaMessage): void {
    this.enviar(data, 'ustedes');
  }

  enviarAMi(data: PasarelaMessage): void {
    this.enviar(data, 'yo');
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.connected.set(false);
  }
}

