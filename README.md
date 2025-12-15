# ✈️ SkyBooker - Reserva de Vuelos en Tiempo Real

Sistema de reserva de vuelos con disponibilidad en tiempo real construido con **Angular** y **[Relay Gateway](https://github.com/Coderic/Relay)**.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Relay](https://img.shields.io/badge/Relay-Gateway-blueviolet)

## 📖 Sobre este Ejemplo

**SkyBooker** es un ejemplo funcional que demuestra cómo construir un sistema de reserva de vuelos con actualización de disponibilidad en tiempo real. Este ejemplo muestra:

- ✈️ **Búsqueda de vuelos** - Selección de origen, destino y fechas
- 🎫 **Reserva en tiempo real** - Los asientos disponibles se actualizan instantáneamente
- ⚠️ **Prevención de overbooking** - Múltiples usuarios no pueden reservar el mismo asiento
- 📊 **Dashboard de reservas** - Vista administrativa de todas las reservas activas
- 🔔 **Notificaciones** - Alertas cuando se realizan nuevas reservas

Este ejemplo pertenece a la colección de ejemplos de **[Relay Gateway](https://github.com/Coderic/Relay)**, un gateway de comunicación en tiempo real diseñado para ser inmutable y agnóstico.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Angular CLI: `npm install -g @angular/cli`
- Relay Gateway ejecutándose (ver [documentación de Relay](https://relay.coderic.net))

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/Coderic/aerolinea.git
cd aerolinea

# Instalar dependencias
npm install
```

### Configuración

Asegúrate de tener Relay Gateway ejecutándose. Puedes usar el endpoint público para pruebas:

```typescript
// En tu código, el conector se conecta a:
const relay = new RelayConector('http://demo.relay.coderic.net');
```

O ejecuta Relay localmente:

```bash
# Opción 1: Con npx (recomendado para pruebas)
npx @coderic/relay

# Opción 2: Con Docker Compose
docker compose up -d
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
ng serve
```

Abre tu navegador en `http://localhost:4200`.

### Producción

```bash
# Construir para producción
ng build --configuration production

# Los archivos estarán en la carpeta dist/
```

## 🎯 Uso

1. **Abrir múltiples pestañas** para simular diferentes usuarios
2. **Buscar vuelos** seleccionando origen, destino y fecha
3. **Seleccionar asientos** - Observa cómo la disponibilidad se actualiza en tiempo real
4. **Realizar reservas** - Los asientos se bloquean automáticamente para otros usuarios
5. **Ver el dashboard** - Monitorea todas las reservas en tiempo real

## 🔗 Enlaces

- 📦 [Repositorio](https://github.com/Coderic/aerolinea)
- 🐛 [Issues](https://github.com/Coderic/aerolinea/issues)
- 🌐 [Demo en línea](https://coderic.org/aerolinea/)
- 📚 [Documentación de Relay](https://relay.coderic.net)
- ⚡ [Relay Gateway](https://github.com/Coderic/Relay)

## 🛠️ Tecnologías

- **Angular** - Framework de aplicaciones web
- **TypeScript** - Superset tipado de JavaScript
- **Ionic** - Framework UI para aplicaciones móviles y web
- **Relay Gateway** - Gateway de comunicación en tiempo real
- **Socket.io** - Comunicación WebSocket

## 📝 Licencia

MIT
