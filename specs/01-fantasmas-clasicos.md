# SPEC 01 — Fantasmas clásicos con personalidades propias

> **Estado:** Approved
> **Depende de:** —
> **Fecha:** 2026-08-24
> **Objetivo:** Reemplazar los dos fantasmas actuales por los cuatro clásicos (Blinky, Pinky, Inky, Clyde), cada uno con su IA propia, alternancia global dispersión/persecución y salida escalonada de la pen.

## Alcance

**In:**

- 4 fantasmas con kinds `blinky`, `pinky`, `inky`, `clyde` en `maze.js`.
- IA por personalidad en `decideGhost` (`src/js/game.js`):
  - **Blinky (agresivo):** objetivo = celda de Pac-Man siempre.
  - **Pinky (emboscador):** objetivo = 4 celdas delante de Pac-Man según su dirección.
  - **Inky (flanqueador):** objetivo = punto doble del vector Blinky → (2 celdas delante de Pac-Man).
  - **Clyde (tímido):** persigue a Pac-Man si está a >8 celdas; si no, apunta a su esquina.
- Modo global compartido: ciclo 7s scatter / 20s chase (420/1200 frames). En scatter los 4 apuntan a su esquina: Blinky arriba-derecha, Pinky arriba-izquierda, Inky abajo-derecha, Clyde abajo-izquierda.
- Elección de dirección: minimizar distancia Manhattan al objetivo sin revertir marcha (180° solo en callejón); desempate `up > left > down > right`.
- Salida escalonada de la pen: retrasos 0s / 2s / 4s / 6s desde `createGame` y reutilizado en `resetPositions`; mientras esperan quedan inmóviles; al soltarse suben forzando `up` hasta la fila 11.

**Fuera de alcance (para specs futuras):**

- Power pellets y modo frightened.
- Velocidades distintas por fantasma o por nivel.
- Rebote visual de espera en la pen.
- Tabla arcade completa de fases (7,20,7,20,5,20,5,∞).

## Modelo de datos

```js
// maze.js
const GHOST_STARTS = [
  { x: 12, y: 14, kind: 'blinky', releaseFrame: 0 },
  { x: 15, y: 14, kind: 'pinky', releaseFrame: 120 }, // 2s a 60fps
  { x: 12, y: 15, kind: 'inky', releaseFrame: 240 }, // 4s
  { x: 15, y: 15, kind: 'clyde', releaseFrame: 360 }, // 6s
];
```

```js
// game.js — estado añadido en createGame()
modeTimer: 0, // frames transcurridos en el modo actual
mode: 'scatter', // 'scatter' | 'chase'
// cada fantasma gana:
state: 'pen', // 'pen' | 'exiting' | 'active'
releaseFrame: <de GHOST_STARTS>,
```

## Plan de implementación

1. `maze.js`: ampliar `GHOST_STARTS` a los 4 fantasmas (kind + releaseFrame). Los dos nuevos heredan la IA `random` actual → el juego sigue jugable con 4 fantasmas visibles.
2. `game.js`: máquina de modos global (`scatter`/`chase` con 420/1200 frames) + esquinas scatter; `decideGhost` pasa a elegir por objetivo del modo actual. Prueba manual: se ven virajes hacia esquinas cada ~7s.
3. Personalidades en chase (blinky/pinky/inky/clyde según reglas del alcance). Prueba manual: cada fantasma se comporta de forma distinguible.
4. Salida escalonada: estados `pen`/`exiting`/`active`, movimiento forzado `up` hasta fila 11; `resetPositions` reinicia timers y re-escaloniza. Prueba manual: perder una vida repite la salida escalonada.

## Criterios de aceptación

- [ ] Se ven 4 fantasmas con los colores ya definidos en `GHOST_COLORS` (rojo/cyan/rosa/naranja).
- [ ] En chase, Blinky reduce distancia a Pac-Man desde cualquier posición.
- [ ] Pinky se sitúa por delante de Pac-Man según su dirección actual.
- [ ] La trayectoria de Inky cambia si se mueve Blinky (flanqueo real).
- [ ] Clyde persigue a >8 celdas y se retira a su esquina a ≤8.
- [ ] Cada ~7s todos viran hacia sus esquinas y ~20s después vuelven a perseguir.
- [ ] Ningún fantasma invierte dirección salvo en callejón sin salida.
- [ ] Al iniciar partida y tras perder una vida, los 4 salen escalonados (~2s entre salidas) y los que esperan están inmóviles.
- [ ] Ganar/perder funciona igual que antes (sin regresiones en colisiones ni dots).

## Decisiones

- **Sí:** personalidades clásicas del arcade — máximo contraste de comportamiento con costo bajo.
- **No:** frightened/power pellets — el laberinto no tiene tiles de pellet; spec futura.
- **Sí:** temporizador global único de modos para los 4 — más simple que uno por fantasma.
- **Sí:** velocidades idénticas 1/10 — preserva invariantes de alineación del repo.
- **No:** tabla completa de fases arcade — sobreingeniería para este proyecto.
- **No:** bug histórico de Pinky (desvío extra hacia arriba) — decisión consciente, emboscada limpia.
- **Sí:** timers en frames del bucle `requestAnimationFrame` — consistente con las velocidades por-frame existentes.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Monitores >60Hz aceleran los 7s/20s (rAF por frame) | Aceptado: todo el juego ya escala por frame; documentado en `game.js` |
| Distancia Manhattan ignora el wrap del túnel | Aceptado: el arcade original también lo ignora |

## Qué **no** está en esta spec

Frightened/power pellets, niveles y dificultad creciente, rebote visual en la pen, HUD con modo actual. Cada uno, si aterriza, va en su propio spec.
