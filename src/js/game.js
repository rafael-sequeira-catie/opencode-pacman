// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Duracion de modos en frames (60fps)
const SCATTER_FRAMES = 420;  // 7s
const CHASE_FRAMES = 1200;   // 20s

// Esquinas objetivo en modo scatter
const SCATTER_CORNERS = {
  blinky: { x: 25, y: 0 },   // arriba-derecha
  pinky:  { x: 2,  y: 0 },   // arriba-izquierda
  inky:   { x: 27, y: 30 },  // abajo-derecha
  clyde:  { x: 0,  y: 30 },  // abajo-izquierda
};

const PEN_EXIT_ROW = 11;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    mode: 'scatter',
    modeTimer: 0,
    frame: 0,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      state: 'pen',
      releaseFrame: g.releaseFrame,
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Elegir objetivo segun modo y personalidad.
  let tx, ty;
  if ( game.mode === 'scatter' ) {
    const corner = SCATTER_CORNERS[ g.kind ];
    tx = corner.x;
    ty = corner.y;
  } else {
    // Chase: cada fantasma tiene su propia IA.
    const px = Math.round( p.x );
    const py = Math.round( p.y );
    switch ( g.kind ) {
      case 'blinky':
        tx = px;
        ty = py;
        break;
      case 'pinky': {
        // 4 celdas delante de Pac-Man segun su direccion.
        const pd = DIRS[ p.dir ];
        tx = px + pd.x * 4;
        ty = py + pd.y * 4;
        break;
      }
      case 'inky': {
        // Vector doble: desde Blinky hacia 2 celdas delante de Pac-Man.
        const blinky = game.ghosts.find( ( h ) => h.kind === 'blinky' );
        const pd = DIRS[ p.dir ];
        const ax = px + pd.x * 2;
        const ay = py + pd.y * 2;
        tx = blinky ? blinky.x + ( ax - blinky.x ) * 2 : ax;
        ty = blinky ? blinky.y + ( ay - blinky.y ) * 2 : ay;
        break;
      }
      case 'clyde': {
        // Persigue si >8 celdas; si no, va a su esquina.
        const dist = Math.abs( g.x - px ) + Math.abs( g.y - py );
        if ( dist > 8 ) {
          tx = px;
          ty = py;
        } else {
          const corner = SCATTER_CORNERS.clyde;
          tx = corner.x;
          ty = corner.y;
        }
        break;
      }
    }
  }

  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - tx ) + Math.abs( ny - ty );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function updateGhostState( game, g ) {
  if ( g.state === 'pen' && game.frame >= g.releaseFrame ) {
    g.state = 'exiting';
    g.dir = 'up';
  }
  if ( g.state === 'exiting' && aligned( g.x ) && g.y <= PEN_EXIT_ROW ) {
    g.state = 'active';
  }
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  updateGhostState( game, g );

  if ( g.state === 'pen' ) return;

  if ( g.state === 'exiting' ) {
    if ( aligned( g.x ) ) g.x = Math.round( g.x );
    g.dir = 'up';
    const d = DIRS[ g.dir ];
    g.x += d.x * g.speed;
    g.y += d.y * g.speed;
    return;
  }

  // active
  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.mode = 'scatter';
  game.modeTimer = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.state = 'pen';
    g.releaseFrame = game.frame + GHOST_STARTS[ i ].releaseFrame;
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  // Avanzar temporizador de modos y alternar scatter/chase.
  game.modeTimer++;
  const limit = game.mode === 'scatter' ? SCATTER_FRAMES : CHASE_FRAMES;
  if ( game.modeTimer >= limit ) {
    game.mode = game.mode === 'scatter' ? 'chase' : 'scatter';
    game.modeTimer = 0;
  }

  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
