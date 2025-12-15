import { Component, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { RelayService, RelayMessage } from './services/relay.service';
import { CommonModule } from '@angular/common';

interface Asiento {
  fila: string;
  numero: string;
  tipo: 'ventana' | 'pasillo' | 'centro';
  disponible: boolean;
  seleccionado: boolean;
  ocupadoPor?: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  // Estado de conexión
  connected = signal(false);
  identificado = signal(false);
  
  // Asientos del avión
  asientos = signal<Asiento[]>([]);
  seleccionados = signal<number[]>([]);
  
  // Estado del vuelo
  vuelo = signal({ origen: 'BOG', destino: 'MDE', fecha: '2025-12-20' });
  
  // Mensajes del sistema
  mensajes = signal<string[]>([]);
  
  constructor(private relay: RelayService) {
    // Inicializar asientos del avión (configuración típica: 30 filas, 6 asientos por fila)
    this.inicializarAsientos();
    
    // Escuchar mensajes de Relay
    this.relay.messages$.subscribe((msg: RelayMessage) => {
      this.manejarMensaje(msg);
    });
    
    // Sincronizar estado de conexión
    effect(() => {
      this.connected.set(this.relay.connected());
      this.identificado.set(this.relay.identified());
    });
  }
  
  ngOnInit() {
    this.conectar();
  }
  
  ngOnDestroy() {
    this.relay.disconnect();
  }
  
  async conectar() {
    try {
      await this.relay.connect();
      this.agregarMensaje('Conectado a Relay Gateway');
      
      // Solicitar sincronización de estado
      this.relay.enviarATodos({ 
        tipo: 'sync_request',
        sessionId: this.relay.sessionId()
      });
    } catch (error) {
      this.agregarMensaje('Error al conectar: ' + (error as Error).message);
    }
  }
  
  inicializarAsientos() {
    const asientosArray: Asiento[] = [];
    const filas = ['A', 'B', 'C', 'D', 'E', 'F'];
    const tipos: ('ventana' | 'pasillo' | 'centro')[] = ['ventana', 'centro', 'centro', 'centro', 'centro', 'ventana'];
    
    // 30 filas numeradas del 1 al 30
    for (let filaNum = 1; filaNum <= 30; filaNum++) {
      filas.forEach((letra, index) => {
        asientosArray.push({
          fila: filaNum.toString(),
          numero: `${filaNum}${letra}`,
          tipo: tipos[index],
          disponible: Math.random() > 0.3, // 70% disponibles
          seleccionado: false
        });
      });
    }
    
    this.asientos.set(asientosArray);
  }
  
  toggleAsiento(index: number) {
    const asientosList = this.asientos();
    const asiento = asientosList[index];
    if (!asiento || !asiento.disponible || asiento.ocupadoPor) return;
    
    const nuevosAsientos = [...asientosList];
    nuevosAsientos[index].seleccionado = !nuevosAsientos[index].seleccionado;
    this.asientos.set(nuevosAsientos);
    
    // Actualizar seleccionados
    const seleccionados = nuevosAsientos
      .map((a, i) => a.seleccionado ? i : -1)
      .filter(i => i !== -1);
    this.seleccionados.set(seleccionados);
    
    // Notificar a otros usuarios
    this.relay.enviarATodos({
      tipo: 'asiento_toggle',
      asientoIndex: index,
      numero: asiento.numero,
      seleccionado: nuevosAsientos[index].seleccionado,
      sessionId: this.relay.sessionId()
    } as RelayMessage);
  }
  
  manejarMensaje(msg: RelayMessage) {
    switch (msg.tipo) {
      case 'asiento_toggle':
        if (msg['sessionId'] !== this.relay.sessionId()) {
          const nuevosAsientos = [...this.asientos()];
          const index = msg['asientoIndex'] as number;
          if (nuevosAsientos[index]) {
            nuevosAsientos[index].seleccionado = msg['seleccionado'] as boolean;
            this.asientos.set(nuevosAsientos);
          }
        }
        break;
      case 'asiento_reservado':
        const asientos = [...this.asientos()];
        const asiento = asientos.find(a => a.numero === msg['numero']);
        if (asiento) {
          asiento.disponible = false;
          asiento.ocupadoPor = msg['usuario'];
          asiento.seleccionado = false;
          this.asientos.set(asientos);
        }
        break;
      case 'sync_response':
        // Sincronizar estado de asientos ocupados
        if (msg['asientosOcupados']) {
          const nuevosAsientos = [...this.asientos()];
          msg['asientosOcupados'].forEach((ocupado: { numero: string; usuario: string }) => {
            const asiento = nuevosAsientos.find(a => a.numero === ocupado.numero);
            if (asiento) {
              asiento.disponible = false;
              asiento.ocupadoPor = ocupado.usuario;
            }
          });
          this.asientos.set(nuevosAsientos);
        }
        break;
    }
  }
  
  reservarAsientos() {
    const seleccionados = this.seleccionados();
    if (seleccionados.length === 0) {
      alert('Selecciona al menos un asiento');
      return;
    }
    
    const numerosAsientos = seleccionados.map(i => this.asientos()[i].numero);
    
    // Notificar reserva
    this.relay.enviarATodos({
      tipo: 'asiento_reservado',
      asientos: numerosAsientos,
      usuario: this.relay.sessionId()
    } as RelayMessage);
    
    // Actualizar estado local
    const nuevosAsientos = [...this.asientos()];
    seleccionados.forEach(index => {
      nuevosAsientos[index].disponible = false;
      nuevosAsientos[index].ocupadoPor = this.relay.sessionId();
      nuevosAsientos[index].seleccionado = false;
    });
    this.asientos.set(nuevosAsientos);
    this.seleccionados.set([]);
    
    this.agregarMensaje(`Reservados: ${numerosAsientos.join(', ')}`);
  }
  
  getAsientoLabel(index: number): string {
    return this.asientos()[index]?.numero || '';
  }
  
  getAsientosSeleccionadosTexto(): string {
    const seleccionados = this.seleccionados();
    if (seleccionados.length === 0) return 'Ninguno';
    return seleccionados.map(i => this.getAsientoLabel(i)).join(', ');
  }
  
  agregarMensaje(mensaje: string) {
    this.mensajes.set([...this.mensajes(), mensaje]);
    if (this.mensajes().length > 10) {
      this.mensajes.set(this.mensajes().slice(-10));
    }
  }
  
  limpiarSeleccion() {
    const nuevosAsientos = this.asientos().map(a => ({ ...a, seleccionado: false }));
    this.asientos.set(nuevosAsientos);
    this.seleccionados.set([]);
  }
}
