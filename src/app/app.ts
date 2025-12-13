import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasarelaService, PasarelaMessage } from './services/pasarela.service';
import { Subscription } from 'rxjs';

interface Vuelo {
  id: string;
  origen: string;
  destino: string;
  hora: string;
  precio: number;
  asientos: number;
  clase: 'economy' | 'business' | 'first';
}

interface AsientosState {
  [vueloId: string]: ('disponible' | 'reservado' | 'vendido')[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private subscription: Subscription | null = null;

  // Vuelos disponibles
  vuelos: Vuelo[] = [
    { id: 'mad-nyc', origen: 'Madrid (MAD)', destino: 'New York (JFK)', hora: '08:30', precio: 450, asientos: 30, clase: 'economy' },
    { id: 'mad-lon', origen: 'Madrid (MAD)', destino: 'Londres (LHR)', hora: '10:15', precio: 180, asientos: 30, clase: 'economy' },
    { id: 'bcn-par', origen: 'Barcelona (BCN)', destino: 'París (CDG)', hora: '12:00', precio: 120, asientos: 30, clase: 'economy' },
    { id: 'mad-tok', origen: 'Madrid (MAD)', destino: 'Tokyo (NRT)', hora: '14:45', precio: 890, asientos: 24, clase: 'business' },
  ];

  // Estado reactivo con signals
  vueloSeleccionado = signal<Vuelo | null>(null);
  asientos = signal<AsientosState>({});
  seleccionados = signal<number[]>([]);
  logs = signal<{ time: string; msg: string }[]>([]);

  // Computed
  disponibles = computed(() => {
    const vuelo = this.vueloSeleccionado();
    if (!vuelo) return 0;
    const asientosVuelo = this.asientos()[vuelo.id];
    return asientosVuelo?.filter(a => a === 'disponible').length || 0;
  });

  total = computed(() => {
    const vuelo = this.vueloSeleccionado();
    return this.seleccionados().length * (vuelo?.precio || 0);
  });

  constructor(public pasarela: PasarelaService) {}

  async ngOnInit() {
    // Inicializar asientos
    const inicial: AsientosState = {};
    this.vuelos.forEach(v => {
      inicial[v.id] = Array(v.asientos).fill('disponible');
    });
    this.asientos.set(inicial);

    // Conectar a Pasarela
    try {
      await this.pasarela.connect();
      this.addLog('🟢 Conectado al sistema de reservas');
      
      // Solicitar sincronización
      this.pasarela.enviarATodos({ 
        tipo: 'sync_request', 
        sessionId: this.pasarela.sessionId() 
      });
    } catch (error) {
      this.addLog('🔴 Error de conexión');
    }

    // Escuchar mensajes
    this.subscription = this.pasarela.messages$.subscribe((data) => {
      this.handleMessage(data);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.pasarela.disconnect();
  }

  private handleMessage(data: PasarelaMessage) {
    switch (data['tipo']) {
      case 'asiento_reservado':
        this.asientos.update(prev => {
          const nuevo = { ...prev };
          if (nuevo[data['vueloId']]) {
            nuevo[data['vueloId']] = [...nuevo[data['vueloId']]];
            nuevo[data['vueloId']][data['asiento']] = 'reservado';
          }
          return nuevo;
        });
        if (data['sessionId'] !== this.pasarela.sessionId()) {
          this.addLog(`✈️ Asiento ${data['asiento'] + 1} reservado por otro pasajero`);
        }
        break;

      case 'compra_confirmada':
        this.asientos.update(prev => {
          const nuevo = { ...prev };
          if (nuevo[data['vueloId']]) {
            nuevo[data['vueloId']] = [...nuevo[data['vueloId']]];
            data['asientos'].forEach((a: number) => {
              nuevo[data['vueloId']][a] = 'vendido';
            });
          }
          return nuevo;
        });
        this.addLog(`✅ Reserva confirmada: ${data['asientos'].length} asiento(s)`);
        break;

      case 'sync_response':
        if (data['asientos']) {
          this.asientos.update(prev => ({ ...prev, ...data['asientos'] }));
        }
        break;

      case 'sync_request':
        if (data['sessionId'] !== this.pasarela.sessionId()) {
          this.pasarela.enviarAOtros({ 
            tipo: 'sync_response', 
            asientos: this.asientos() 
          });
        }
        break;
    }
  }

  seleccionarVuelo(vuelo: Vuelo) {
    this.vueloSeleccionado.set(vuelo);
    this.seleccionados.set([]);
  }

  toggleAsiento(idx: number) {
    const vuelo = this.vueloSeleccionado();
    if (!vuelo) return;

    const estado = this.asientos()[vuelo.id]?.[idx];
    if (estado !== 'disponible') return;

    this.seleccionados.update(prev => {
      if (prev.includes(idx)) {
        return prev.filter(i => i !== idx);
      }
      if (prev.length >= 6) {
        this.addLog('⚠️ Máximo 6 asientos por reserva');
        return prev;
      }
      return [...prev, idx];
    });
  }

  reservar() {
    const vuelo = this.vueloSeleccionado();
    const selected = this.seleccionados();
    
    if (!vuelo || selected.length === 0) return;

    // Notificar reserva
    selected.forEach(idx => {
      this.pasarela.enviarATodos({
        tipo: 'asiento_reservado',
        vueloId: vuelo.id,
        asiento: idx,
        sessionId: this.pasarela.sessionId()
      });
    });

    this.addLog(`🎫 Reservando ${selected.length} asiento(s)...`);

    // Simular confirmación
    const asientosCompra = [...selected];
    setTimeout(() => {
      this.pasarela.enviarATodos({
        tipo: 'compra_confirmada',
        vueloId: vuelo.id,
        asientos: asientosCompra,
        sessionId: this.pasarela.sessionId()
      });
    }, 2500);

    this.seleccionados.set([]);
  }

  getAsientosVuelo(vueloId: string): string[] {
    return this.asientos()[vueloId] || [];
  }

  getDisponiblesVuelo(vueloId: string): number {
    return this.getAsientosVuelo(vueloId).filter(a => a === 'disponible').length;
  }

  private addLog(msg: string) {
    this.logs.update(prev => [{
      time: new Date().toLocaleTimeString('es'),
      msg
    }, ...prev].slice(0, 15));
  }

  getFilas(): number[][] {
    const vuelo = this.vueloSeleccionado();
    if (!vuelo) return [];
    
    const asientosPorFila = vuelo.clase === 'first' ? 4 : (vuelo.clase === 'business' ? 6 : 6);
    const filas: number[][] = [];
    
    for (let i = 0; i < vuelo.asientos; i += asientosPorFila) {
      filas.push(Array.from({ length: Math.min(asientosPorFila, vuelo.asientos - i) }, (_, j) => i + j));
    }
    
    return filas;
  }

  getAsientoLabel(idx: number): string {
    const fila = Math.floor(idx / 6) + 1;
    const columnas = ['A', 'B', 'C', 'D', 'E', 'F'];
    return `${fila}${columnas[idx % 6]}`;
  }

  getAsientosSeleccionadosTexto(): string {
    const selected = this.seleccionados();
    if (selected.length === 0) return 'Ninguno';
    return selected.map(i => this.getAsientoLabel(i)).join(', ');
  }
}
