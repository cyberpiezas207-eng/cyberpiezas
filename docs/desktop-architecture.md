# Arquitectura propuesta para Boutique POS Desktop

## Objetivo

La versión de escritorio de **Boutique POS** para **Windows** se construirá como una aplicación instalable que reutilice la interfaz actual en React, el backend local en Express/tRPC y la base offline ya existente en IndexedDB como primera capa de persistencia local. La meta de la primera entrega no será reemplazar todo el sistema web, sino **envolverlo de forma segura como programa de escritorio**, mantener operación local cuando falte internet y preparar la sincronización progresiva con el servidor remoto.

## Decisión técnica inicial

La ruta más conveniente para una primera versión comercial es usar un **contenedor de escritorio con Electron** alrededor del proyecto actual. Esta decisión permite reutilizar la mayor parte del frontend, conservar el comportamiento offline que hoy ya existe en Chromium/IndexedDB y ejecutar el servidor Node localmente dentro de la aplicación instalada.

| Componente | Reutilización propuesta | Observación |
|---|---|---|
| Frontend React + Vite | Reutilización alta | Ya funciona como interfaz principal del POS |
| Backend Express + tRPC | Reutilización alta | Puede iniciar localmente dentro de la app de escritorio |
| Módulo `offlineSync.ts` | Reutilización media-alta | Sirve como base local inicial mientras llega una capa más robusta |
| Pantalla `OfflineSyncSettings.tsx` | Reutilización alta | Puede convertirse en centro de respaldo y estado de sincronización |
| Empaquetado Windows | Nuevo | Se agregará configuración específica de escritorio |

## Estado actual auditado

La auditoría confirma que el proyecto ya cuenta con una base offline funcional para productos, variantes, ventas, detalles de venta y categorías, usando `idb` sobre IndexedDB en el cliente. También existe una pantalla de sincronización y respaldo que ya muestra conectividad, pendientes de sincronización, exportación e importación de datos. Esto reduce el riesgo del proyecto porque la lógica offline no empieza desde cero.

Sin embargo, la sincronización actual todavía es una **base local de navegador**, no una solución completa de escritorio con cola robusta, identificación de conflictos por entidad y empaquetado nativo. Por eso la transición debe hacerse por etapas.

## Arquitectura por fases

### Fase 1: App instalable mínima para Windows

Se agregará una capa de Electron con proceso principal, preload seguro y scripts de desarrollo/compilación. La app abrirá la interfaz del POS como programa de escritorio y levantará localmente el backend necesario para servir la aplicación.

### Fase 2: Persistencia local operativa

En la primera iteración se mantendrá IndexedDB por compatibilidad y rapidez de entrega. Después, si el uso real lo exige, podrá migrarse a SQLite local sin romper la interfaz. Esta transición debe hacerse cuando la cola offline y la reconciliación estén más maduras.

### Fase 3: Sincronización diferida

La sincronización deberá priorizar las entidades críticas: ventas, inventario, productos y catálogo. Cada operación local necesitará marca de sincronización, fecha de modificación y estrategia de resolución de conflicto.

### Fase 4: Respaldo y restauración

La app debe conservar exportación e importación manual como mecanismo de emergencia, incluso si después existe sincronización automática. Esto protege al negocio cuando una sucursal trabaja con cortes largos de internet.

## Reglas de sincronización recomendadas

| Entidad | Modo local | Prioridad de subida | Regla inicial sugerida |
|---|---|---|---|
| Ventas | Escritura local inmediata | Muy alta | Subir primero al volver internet |
| Inventario | Escritura local inmediata | Muy alta | Reconciliar con marca temporal y origen |
| Productos | Escritura local inmediata | Alta | Última edición gana, con bitácora |
| Categorías | Escritura local inmediata | Media | Última edición gana |
| Configuración | Escritura local inmediata | Media | Sincronización bajo sesión admin |

## Riesgos que debemos controlar

La principal dificultad no será instalar la app, sino evitar inconsistencias cuando el mismo negocio use más de un equipo. Por eso la primera versión debe enfocarse en una experiencia de escritorio sólida para un punto de venta por computadora, antes de escalar a sincronización multi-equipo más agresiva.

| Riesgo | Impacto | Mitigación inicial |
|---|---|---|
| Conflictos entre equipos | Alto | Empezar con reglas simples y cola priorizada |
| Datos incompletos offline | Alto | Auditar qué módulos escriben realmente en local |
| Empaquetado Windows inestable | Medio | Construir primero una versión ejecutable interna |
| Dependencia del navegador actual | Medio | Encapsular la UI dentro de escritorio |

## Siguiente implementación recomendada

La siguiente etapa práctica será crear la **estructura base de escritorio** dentro del proyecto: scripts de Electron, proceso principal, preload, apertura de ventana principal y modo desarrollo para cargar el POS actual. Después se validará que la base offline sobreviva correctamente al cierre y reapertura del programa.
