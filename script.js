'use strict';
/* =========================================================================
   ELEMENTAL STRIKERS: ROGUELIKE
   Juego de fútbol elemental por turnos, sin frameworks, sin backend.
   Todo el estado vive en memoria durante la partida; el meta-progreso
   (Puntos de Leyenda, desbloqueos, mejores marcas) se guarda en localStorage.
   ========================================================================= */

/* ---------------------------------------------------------------------
   1. CONSTANTES Y DATOS
   --------------------------------------------------------------------- */

var TYPES = ['Fuego', 'Viento', 'Tierra', 'Trueno', 'Aire'];
var CYCLE = ['Fuego', 'Viento', 'Tierra', 'Trueno']; // cada uno vence al siguiente
var POSITIONS = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

var TYPE_EMOJI = {
  Fuego: '🔥',
  Viento: '🌪️',
  Tierra: '🪨',
  Trueno: '⚡',
  Aire: '💨'
};

var FIRST_NAMES = ['Aldo', 'Rin', 'Kael', 'Mika', 'Toro', 'Nia', 'Sol', 'Iker', 'Vera', 'Dax',
  'Luna', 'Bram', 'Zia', 'Coen', 'Rex', 'Ash', 'Milo', 'Nara', 'Theo', 'Ixi',
  'Yara', 'Enzo', 'Fira', 'Odell', 'Suri', 'Kimo', 'Val', 'Nox', 'Pia', 'Ravi'];

var SURNAMES_BY_TYPE = {
  Fuego: ['Ascuas', 'Brasa', 'Magma', 'Cenizas', 'Ígneo'],
  Viento: ['Ventisca', 'Torbellino', 'Ráfaga', 'Céfiro', 'Vendaval'],
  Tierra: ['Basalto', 'Terrón', 'Granito', 'Raíz', 'Roquedal'],
  Trueno: ['Voltio', 'Relámpago', 'Chispa', 'Fulgor', 'Tormenta'],
  Aire: ['Nimbo', 'Zenit', 'Altura', 'Cénit', 'Bruma']
};

// Plantillas de estadísticas base por posición: [tiro, pase, defensa, especial] +/- variación
var POSITION_TEMPLATES = {
  Portero: { tiro: 28, pase: 55, defensa: 78, especial: 48, variance: 8 },
  Defensa: { tiro: 42, pase: 55, defensa: 72, especial: 52, variance: 8 },
  Centrocampista: { tiro: 55, pase: 72, defensa: 50, especial: 58, variance: 8 },
  Delantero: { tiro: 74, pase: 48, defensa: 38, especial: 62, variance: 8 }
};

// Capitanes base, siempre disponibles en el sorteo inicial
var CAPTAIN_POOL_BASE = [
  mkCaptain('c1', 'Kael Ascuas', 'Delantero', 'Fuego', 72, 55, 40, 65, 'Delantero letal, especialista en tiros potentes.'),
  mkCaptain('c2', 'Nia Ventisca', 'Centrocampista', 'Viento', 55, 74, 48, 60, 'Motor del equipo, reparte juego a gran velocidad.'),
  mkCaptain('c3', 'Toro Basalto', 'Defensa', 'Tierra', 45, 50, 78, 55, 'Muro defensivo inamovible.'),
  mkCaptain('c4', 'Rin Voltio', 'Centrocampista', 'Trueno', 60, 65, 52, 68, 'Explosivo con el balón, imprevisible.'),
  mkCaptain('c5', 'Sol Nimbo', 'Portero', 'Aire', 30, 58, 80, 50, 'Guardameta sereno, lee el juego perfectamente.'),
  mkCaptain('c6', 'Dax Brasa', 'Delantero', 'Fuego', 68, 48, 42, 70, 'Puro instinto goleador.'),
  mkCaptain('c7', 'Vera Torbellino', 'Defensa', 'Viento', 42, 60, 70, 58, 'Corta cualquier avance rival.'),
  mkCaptain('c8', 'Milo Granito', 'Centrocampista', 'Tierra', 58, 62, 60, 55, 'Equilibrado y constante, nunca falla.')
];

// Capitanes desbloqueables con Puntos de Leyenda en el Vestuario
var CAPTAIN_POOL_LOCKED = [
  { captain: mkCaptain('l1', 'Zia Relámpago', 'Delantero', 'Trueno', 80, 58, 45, 78, 'Prodigio ofensivo, casi imposible de frenar.'), cost: 60 },
  { captain: mkCaptain('l2', 'Bram Cénit', 'Portero', 'Aire', 35, 62, 88, 60, 'La última muralla. Casi nunca encaja.'), cost: 50 },
  { captain: mkCaptain('l3', 'Ixi Magma', 'Centrocampista', 'Fuego', 66, 70, 58, 75, 'Creatividad y potencia a partes iguales.'), cost: 70 },
  { captain: mkCaptain('l4', 'Coen Raíz', 'Defensa', 'Tierra', 48, 55, 85, 62, 'Nada pasa por su carril.'), cost: 55 }
];

function mkCaptain(id, nombre, posicion, tipo, tiro, pase, defensa, especial, desc) {
  return { id: id, nombre: nombre, posicion: posicion, tipo: tipo, tiro: tiro, pase: pase, defensa: defensa, especial: especial, desc: desc };
}

var MAX_SQUAD = 4;
var MATCH_TURNS = 6; // 3 ataques para cada equipo
var LEGEND_PER_NODE = 4;
var LEGEND_PER_MATCH = 10;
var LEGEND_PER_BOSS = 30;

/* ---------------------------------------------------------------------
   2. UTILIDADES
   --------------------------------------------------------------------- */

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function choice(arr) { return arr[rand(0, arr.length - 1)]; }
function uid() { return 'p' + Math.random().toString(36).slice(2, 10); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function typeAdvantage(a, b) {
  if (a === 'Aire' || b === 'Aire' || a === b) return 0;
  var ia = CYCLE.indexOf(a), ib = CYCLE.indexOf(b);
  if (ia === -1 || ib === -1) return 0;
  if ((ia + 1) % 4 === ib) return 1;  // a vence a b
  if ((ib + 1) % 4 === ia) return -1; // b vence a a
  return 0;
}

function typeBadge(tipo) {
  return '<span class="type-badge type-' + tipo.toLowerCase() + '">' + TYPE_EMOJI[tipo] + ' ' + tipo + '</span>';
}

/* ---------------------------------------------------------------------
   3. GENERACIÓN DE JUGADORES
   --------------------------------------------------------------------- */

function randomName(tipo) {
  var first = choice(FIRST_NAMES);
  var last = choice(SURNAMES_BY_TYPE[tipo]);
  return first + ' ' + last;
}

function generateRandomPlayer(depth) {
  var posicion = choice(POSITIONS);
  var tipo = choice(TYPES);
  var t = POSITION_TEMPLATES[posicion];
  var scale = 1 + (depth || 0) * 0.015;
  function s(base) { return clamp(Math.round((base + rand(-t.variance, t.variance)) * scale), 15, 99); }
  return {
    id: uid(),
    nombre: randomName(tipo),
    posicion: posicion,
    tipo: tipo,
    tiro: s(t.tiro),
    pase: s(t.pase),
    defensa: s(t.defensa),
    especial: s(t.especial),
    fatigado: false
  };
}

function generateOpponentSquad(depth, isBoss) {
  var squad = [];
  for (var i = 0; i < 4; i++) {
    var p = generateRandomPlayer(depth);
    if (isBoss) {
      p.tiro = clamp(p.tiro + rand(2, 6), 15, 99);
      p.pase = clamp(p.pase + rand(2, 6), 15, 99);
      p.defensa = clamp(p.defensa + rand(2, 6), 15, 99);
      p.especial = clamp(p.especial + rand(3, 8), 15, 99);
    }
    squad.push(p);
  }
  return squad;
}

function offerCaptains() {
  var pool = CAPTAIN_POOL_BASE.slice();
  var unlocked = getUnlockedCaptainIds();
  CAPTAIN_POOL_LOCKED.forEach(function (entry) {
    if (unlocked.indexOf(entry.captain.id) !== -1) pool.push(entry.captain);
  });
  var shuffled = pool.slice().sort(function () { return Math.random() - 0.5; });
  return shuffled.slice(0, 3).map(function (c) {
    // clonar y darle un id único de instancia para esta partida
    var clone = Object.assign({}, c);
    clone.id = uid();
    clone.fatigado = false;
    return clone;
  });
}

/* ---------------------------------------------------------------------
   4. PERSISTENCIA (localStorage)
   --------------------------------------------------------------------- */

var STORAGE_KEY = 'elementalStrikers_v1';

function loadMeta() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error('none');
    var data = JSON.parse(raw);
    return Object.assign({ points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0 }, data);
  } catch (e) {
    return { points: 0, unlocked: [], bestNode: 0, bestWins: 0, runsPlayed: 0 };
  }
}

function saveMeta(meta) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(meta)); } catch (e) { /* almacenamiento no disponible */ }
}

function getUnlockedCaptainIds() { return loadMeta().unlocked; }

/* ---------------------------------------------------------------------
   5. GENERACIÓN DEL MAPA (estilo ramificado)
   --------------------------------------------------------------------- */

var NODE_ICONS = {
  partido: '⚽',
  entrenamiento: '🏋️',
  fichaje: '🧢',
  descanso: '💤',
  jefe: '👑'
};
var NODE_LABELS = {
  partido: 'Partido',
  entrenamiento: 'Entrenamiento',
  fichaje: 'Fichaje',
  descanso: 'Descanso',
  jefe: 'Jefe'
};

function generateMap() {
  // filas: normal(3) x4, jefe(1), normal(3) x4, jefe(1)
  var rowDefs = [3, 3, 3, 3, 1, 3, 3, 3, 3, 1];
  var rows = [];
  var idCounter = 0;

  rowDefs.forEach(function (count, rowIndex) {
    var isBoss = count === 1;
    var nodes = [];
    for (var c = 0; c < count; c++) {
      var type;
      if (isBoss) {
        type = 'jefe';
      } else {
        type = weightedNodeType();
      }
      nodes.push({
        id: 'n' + (idCounter++),
        row: rowIndex,
        col: c,
        type: type,
        cleared: false
      });
    }
    rows.push(nodes);
  });

  // construir aristas
  var edges = {}; // id -> [ids siguientes]
  for (var r = 0; r < rows.length - 1; r++) {
    var curRow = rows[r], nextRow = rows[r + 1];
    curRow.forEach(function (node) {
      var targets = [];
      if (nextRow.length === 1) {
        targets = [nextRow[0].id];
      } else if (curRow.length === 1) {
        targets = nextRow.map(function (n) { return n.id; });
      } else {
        var idx = node.col;
        [idx - 1, idx, idx + 1].forEach(function (t) {
          if (t >= 0 && t < nextRow.length) targets.push(nextRow[t].id);
        });
        if (targets.length === 0) targets.push(nextRow[Math.min(idx, nextRow.length - 1)].id);
      }
      edges[node.id] = targets;
    });
  }
  // asegurar que cada nodo de nextRow tenga al menos una entrada
  for (var r2 = 0; r2 < rows.length - 1; r2++) {
    var curRow2 = rows[r2], nextRow2 = rows[r2 + 1];
    if (curRow2.length === 1 || nextRow2.length === 1) continue;
    var incoming = {};
    nextRow2.forEach(function (n) { incoming[n.id] = 0; });
    curRow2.forEach(function (n) { edges[n.id].forEach(function (t) { incoming[t]++; }); });
    nextRow2.forEach(function (n) {
      if (incoming[n.id] === 0) {
        var nearest = curRow2[Math.min(n.col, curRow2.length - 1)];
        edges[nearest.id].push(n.id);
      }
    });
  }

  return { rows: rows, edges: edges };
}

function weightedNodeType() {
  var roll = Math.random() * 100;
  if (roll < 45) return 'partido';
  if (roll < 65) return 'entrenamiento';
  if (roll < 80) return 'fichaje';
  return 'descanso';
}

function mapDepth(nodeId, map) {
  for (var r = 0; r < map.rows.length; r++) {
    for (var c = 0; c < map.rows[r].length; c++) {
      if (map.rows[r][c].id === nodeId) return r;
    }
  }
  return 0;
}

function findNode(map, nodeId) {
  for (var r = 0; r < map.rows.length; r++) {
    for (var c = 0; c < map.rows[r].length; c++) {
      if (map.rows[r][c].id === nodeId) return map.rows[r][c];
    }
  }
  return null;
}

/* ---------------------------------------------------------------------
   6. ESTADO GLOBAL DEL JUEGO
   --------------------------------------------------------------------- */

var G = {
  screen: 'menu',
  meta: loadMeta(),
  run: null,     // { squad, map, currentNodeId, clearedCount, matchesWon, legendEarned }
  match: null,   // estado del partido en curso
  pendingCaptainOffers: null,
  pendingRecruits: null,
  pendingTraining: null
};

function newRun() {
  G.run = {
    squad: [],
    map: generateMap(),
    currentNodeId: null,
    clearedCount: 0,
    matchesWon: 0,
    legendEarned: 0,
    victory: false,
    startedAt: Date.now()
  };
}

/* ---------------------------------------------------------------------
   7. RENDER: NAVEGACIÓN PRINCIPAL
   --------------------------------------------------------------------- */

var appEl = null;

function render() {
  if (!appEl) appEl = document.getElementById('app');
  var html = '';
  switch (G.screen) {
    case 'menu': html = renderMenu(); break;
    case 'captainSelect': html = renderCaptainSelect(); break;
    case 'map': html = renderMap(); break;
    case 'match': html = renderMatch(); break;
    case 'entrenamiento': html = renderTraining(); break;
    case 'fichaje': html = renderRecruit(); break;
    case 'descanso': html = renderRest(); break;
    case 'summary': html = renderSummary(); break;
    case 'vestuario': html = renderVestuario(); break;
    default: html = renderMenu();
  }
  appEl.innerHTML = html;
  if (G.screen === 'map') drawMapConnections();
}

/* ---- Menú principal ---- */
function renderMenu() {
  var m = G.meta;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<p class="currency-display">🏆 ' + m.points + ' Puntos de Leyenda</p>' +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + m.bestNode + '</div><div class="label">Mejor progreso (nodos)</div></div>' +
          '<div class="stat-tile"><div class="num">' + m.bestWins + '</div><div class="label">Mejor racha de victorias</div></div>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionStartRun()">▶ Jugar</button>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-block" onclick="actionGoVestuario()">👕 Vestuario</button>' +
        '</div>' +
      '</div>' +
      '<div class="panel">' +
        '<h2 class="panel-title">La rueda elemental</h2>' +
        '<p class="dim small">Fuego vence a Viento · Viento vence a Tierra · Tierra vence a Trueno · Trueno vence a Fuego. Aire es neutral frente a todos.</p>' +
        '<div class="btn-row">' + TYPES.map(typeBadge).join('') + '</div>' +
      '</div>' +
    '</div>'
  );
}

function actionStartRun() {
  G.pendingCaptainOffers = offerCaptains();
  G.screen = 'captainSelect';
  render();
}

function actionGoVestuario() { G.screen = 'vestuario'; render(); }
function actionBackToMenu() { G.screen = 'menu'; render(); }

/* ---- Selección de capitán inicial ---- */
function renderCaptainSelect() {
  var cards = G.pendingCaptainOffers.map(function (c) {
    return playerCardHtml(c, 'selectCaptain(\'' + c.id + '\')', false, false);
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel">' +
        '<h2 class="panel-title">Elige a tu capitán</h2>' +
        '<p class="dim small">Este jugador iniciará tu plantilla. Podrás fichar hasta 3 compañeros más durante la partida.</p>' +
      '</div>' +
      '<div class="card-grid">' + cards + '</div>' +
    '</div>'
  );
}

function selectCaptain(id) {
  var captain = G.pendingCaptainOffers.find(function (c) { return c.id === id; });
  newRun();
  G.run.squad.push(captain);
  G.screen = 'map';
  render();
}

/* ---- Tarjeta de jugador reutilizable ---- */
function playerCardHtml(p, onclickAttr, selected, disabled) {
  var cls = 'player-card' + (selected ? ' selected' : '') + (disabled ? ' disabled' : '') + (p.fatigado ? ' fatigued' : '');
  var attr = disabled ? '' : ' onclick="' + onclickAttr + '"';
  return (
    '<div class="' + cls + '"' + attr + '>' +
      '<div class="player-card-head">' +
        '<span class="player-name">' + escapeHtml(p.nombre) + '</span>' +
        typeBadge(p.tipo) +
      '</div>' +
      '<div class="player-pos">' + p.posicion + '</div>' +
      statBarsHtml(p) +
      (p.fatigado ? '<div class="fatigue-tag">💤 Fatigado (-10 a todo)</div>' : '') +
    '</div>'
  );
}

function statBarsHtml(p) {
  var stats = [['Tiro', p.tiro], ['Pase', p.pase], ['Defensa', p.defensa], ['Especial', p.especial]];
  return '<div class="stat-bars">' + stats.map(function (s) {
    return '<span class="stat-label">' + s[0] + '</span>' +
      '<span class="stat-bar-track"><span class="stat-bar-fill" style="width:' + clamp(s[1], 0, 100) + '%"></span></span>' +
      '<span class="stat-value">' + s[1] + '</span>';
  }).join('') + '</div>';
}

/* ---------------------------------------------------------------------
   8. RENDER: MAPA
   --------------------------------------------------------------------- */

function availableNodeIds() {
  var run = G.run;
  if (!run.currentNodeId) {
    return run.map.rows[0].map(function (n) { return n.id; });
  }
  return run.map.edges[run.currentNodeId] || [];
}

function renderMap() {
  var run = G.run;
  var avail = availableNodeIds();
  var rowsHtml = run.map.rows.map(function (rowNodes) {
    var nodesHtml = rowNodes.map(function (n) {
      var classes = 'node-btn';
      if (n.type === 'jefe') classes += ' boss';
      var isAvailable = avail.indexOf(n.id) !== -1;
      var isCurrent = run.currentNodeId === n.id;
      if (n.cleared) classes += ' cleared';
      if (isCurrent) classes += ' current';
      if (isAvailable && !n.cleared) classes += ' available';
      var disabled = !isAvailable || n.cleared;
      var attr = disabled ? ' disabled' : ' onclick="enterNode(\'' + n.id + '\')"';
      return (
        '<div class="node-btn-wrap" style="position:relative">' +
          '<button class="' + classes + '" data-node="' + n.id + '"' + attr + ' aria-label="' + NODE_LABELS[n.type] + '">' +
            NODE_ICONS[n.type] +
          '</button>' +
          '<span class="node-label">' + NODE_LABELS[n.type] + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="map-row">' + nodesHtml + '</div>';
  }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel">' +
        '<h2 class="panel-title mb0">Mapa de la temporada</h2>' +
        '<p class="dim small">Nodos superados: ' + run.clearedCount + ' · Partidos ganados: ' + run.matchesWon + '</p>' +
      '</div>' +
      '<div class="panel">' +
        '<h3 style="margin-bottom:8px">Tu plantilla</h3>' +
        '<div class="card-grid">' + run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
      '</div>' +
      '<div class="map-wrap">' +
        '<div class="map-rows" id="mapRows">' + rowsHtml + '<svg class="map-svg" id="mapSvg"></svg></div>' +
      '</div>' +
      '<div class="legend">' +
        '<span>⚽ Partido</span><span>🏋️ Entrenamiento</span><span>🧢 Fichaje</span><span>💤 Descanso</span><span>👑 Jefe</span>' +
      '</div>' +
    '</div>'
  );
}

function drawMapConnections() {
  var wrap = document.getElementById('mapRows');
  var svg = document.getElementById('mapSvg');
  if (!wrap || !svg) return;
  var run = G.run;
  var edges = run.map.edges;
  var rect = wrap.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  var lines = '';
  Object.keys(edges).forEach(function (fromId) {
    var fromEl = wrap.querySelector('[data-node="' + fromId + '"]');
    if (!fromEl) return;
    var fr = fromEl.getBoundingClientRect();
    var fx = fr.left - rect.left + fr.width / 2;
    var fy = fr.top - rect.top + fr.height / 2;
    edges[fromId].forEach(function (toId) {
      var toEl = wrap.querySelector('[data-node="' + toId + '"]');
      if (!toEl) return;
      var tr = toEl.getBoundingClientRect();
      var tx = tr.left - rect.left + tr.width / 2;
      var ty = tr.top - rect.top + tr.height / 2;
      var fromNode = findNode(run.map, fromId);
      var stroke = fromNode.cleared ? '#4caf50' : '#263457';
      lines += '<line x1="' + fx + '" y1="' + fy + '" x2="' + tx + '" y2="' + ty + '" stroke="' + stroke + '" stroke-width="3" />';
    });
  });
  svg.innerHTML = lines;
}

window.addEventListener('resize', function () {
  if (G.screen === 'map') drawMapConnections();
});

function enterNode(nodeId) {
  var node = findNode(G.run.map, nodeId);
  if (!node || node.cleared) return;
  G.run.currentNodeId = nodeId;
  switch (node.type) {
    case 'partido': startMatch(nodeId, false); break;
    case 'jefe': startMatch(nodeId, true); break;
    case 'entrenamiento': G.pendingTraining = generateTrainingOptions(); G.screen = 'entrenamiento'; render(); break;
    case 'fichaje': G.pendingRecruits = generateRecruitOptions(mapDepth(nodeId, G.run.map)); G.screen = 'fichaje'; render(); break;
    case 'descanso': G.screen = 'descanso'; render(); break;
  }
}

function clearCurrentNode() {
  var node = findNode(G.run.map, G.run.currentNodeId);
  if (node && !node.cleared) {
    node.cleared = true;
    G.run.clearedCount++;
  }
}

function returnToMap() {
  clearCurrentNode();
  G.screen = 'map';
  render();
}

/* ---------------------------------------------------------------------
   9. ENTRENAMIENTO
   --------------------------------------------------------------------- */

var STAT_KEYS = ['tiro', 'pase', 'defensa', 'especial'];
var STAT_LABELS = { tiro: 'Tiro', pase: 'Pase', defensa: 'Defensa', especial: 'Especial' };

function generateTrainingOptions() {
  var options = [];
  var used = {};
  while (options.length < 3) {
    var player = choice(G.run.squad);
    var stat = choice(STAT_KEYS);
    var key = player.id + stat;
    if (used[key]) continue;
    used[key] = true;
    options.push({ playerId: player.id, stat: stat, amount: rand(8, 14) });
  }
  return options;
}

function renderTraining() {
  var cards = G.pendingTraining.map(function (opt, i) {
    var player = G.run.squad.find(function (p) { return p.id === opt.playerId; });
    return (
      '<div class="choice-card">' +
        '<h3>' + escapeHtml(player.nombre) + ' ' + typeBadge(player.tipo) + '</h3>' +
        '<p>Mejora permanente: <strong>+' + opt.amount + ' ' + STAT_LABELS[opt.stat] + '</strong> (actual: ' + player[opt.stat] + ')</p>' +
        '<button class="btn btn-primary btn-block" onclick="applyTraining(' + i + ')">Entrenar</button>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">🏋️ Entrenamiento</h2><p class="dim small">Elige una mejora de estadística para un jugador de tu plantilla.</p></div>' +
      cards +
    '</div>'
  );
}

function applyTraining(index) {
  var opt = G.pendingTraining[index];
  var player = G.run.squad.find(function (p) { return p.id === opt.playerId; });
  player[opt.stat] = clamp(player[opt.stat] + opt.amount, 0, 99);
  G.run.legendEarned += LEGEND_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   10. FICHAJE
   --------------------------------------------------------------------- */

function generateRecruitOptions(depth) {
  var options = [];
  for (var i = 0; i < 3; i++) options.push(generateRandomPlayer(depth));
  return options;
}

function renderRecruit() {
  var full = G.run.squad.length >= MAX_SQUAD;
  var cards = G.pendingRecruits.map(function (cand, i) {
    var actionsHtml = '<button class="btn btn-primary btn-block" onclick="recruitPlayer(' + i + ', null)">Fichar</button>';
    if (full) {
      actionsHtml = '<p class="dim small">Plantilla completa. Elige a quién sustituir:</p>' +
        '<div class="btn-row">' + G.run.squad.map(function (p) {
          return '<button class="btn btn-danger" onclick="recruitPlayer(' + i + ', \'' + p.id + '\')">Sustituir a ' + escapeHtml(p.nombre) + '</button>';
        }).join('') + '</div>';
    }
    return (
      '<div class="choice-card">' +
        '<h3>' + escapeHtml(cand.nombre) + ' ' + typeBadge(cand.tipo) + '</h3>' +
        '<p class="dim">' + cand.posicion + '</p>' +
        statBarsHtml(cand) +
        '<div class="mt">' + actionsHtml + '</div>' +
      '</div>'
    );
  }).join('');
  return (
    '<div class="screen">' +
      '<div class="panel"><h2 class="panel-title mb0">🧢 Fichaje</h2><p class="dim small">' + (full ? 'Tu plantilla ya tiene 4 jugadores.' : 'Añade un nuevo jugador a tu plantilla (máx. 4).') + '</p></div>' +
      cards +
      '<button class="btn btn-outline btn-block mt" onclick="returnToMap()">Rechazar y continuar</button>' +
    '</div>'
  );
}

function recruitPlayer(index, replaceId) {
  var cand = G.pendingRecruits[index];
  if (replaceId) {
    var idx = G.run.squad.findIndex(function (p) { return p.id === replaceId; });
    if (idx !== -1) G.run.squad[idx] = cand;
  } else if (G.run.squad.length < MAX_SQUAD) {
    G.run.squad.push(cand);
  }
  G.run.legendEarned += LEGEND_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   11. DESCANSO
   --------------------------------------------------------------------- */

function renderRest() {
  var anyFatigued = G.run.squad.some(function (p) { return p.fatigado; });
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">💤 Descanso</h2>' +
        '<p class="dim">Tu equipo recupera fuerzas antes del siguiente reto.</p>' +
        '<div class="card-grid">' + G.run.squad.map(function (p) { return playerCardHtml(p, '', false, true); }).join('') + '</div>' +
        '<button class="btn btn-primary btn-block mt" onclick="applyRest()">' + (anyFatigued ? 'Quitar fatiga y continuar' : 'Continuar') + '</button>' +
      '</div>' +
    '</div>'
  );
}

function applyRest() {
  G.run.squad.forEach(function (p) { p.fatigado = false; });
  G.run.legendEarned += LEGEND_PER_NODE;
  returnToMap();
}

/* ---------------------------------------------------------------------
   12. SISTEMA DE PARTIDO
   --------------------------------------------------------------------- */

function startMatch(nodeId, isBoss) {
  var depth = mapDepth(nodeId, G.run.map);
  var oppSquad = generateOpponentSquad(depth, isBoss);
  var oppName = isBoss ? 'Jefe: ' + randomTeamName() : randomTeamName();
  G.match = {
    isBoss: isBoss,
    oppName: oppName,
    oppSquad: oppSquad,
    turn: 1,
    order: buildTurnOrder(),
    playerScore: 0,
    oppScore: 0,
    meterPlayer: 0,
    meterOpp: 0,
    log: [],
    selectedAttackerId: null,
    lastEvent: null,
    lastEventClass: '',
    finished: false,
    suddenDeath: false,
    sdRound: 0,
    sdStage: 'jugador'
  };
  G.screen = 'match';
  render();
}

function randomTeamName() {
  var adjs = ['Rugientes', 'Furiosos', 'Salvajes', 'Veloces', 'Invictos', 'Errantes', 'Feroces', 'Nocturnos'];
  var nouns = ['Cometas', 'Lobos', 'Halcones', 'Titanes', 'Espectros', 'Centinelas', 'Tornados', 'Forjados'];
  return choice(adjs) + ' ' + choice(nouns);
}

function buildTurnOrder() {
  // alterna: jugador ataca en turnos impares, rival en pares (o al revés, al azar)
  var startsPlayer = Math.random() < 0.5;
  var order = [];
  for (var i = 0; i < MATCH_TURNS; i++) {
    var playerAttacks = (i % 2 === 0) ? startsPlayer : !startsPlayer;
    order.push(playerAttacks ? 'jugador' : 'rival');
  }
  return order;
}

function currentAttacker() {
  if (G.match.suddenDeath) return G.match.sdStage;
  return G.match.order[G.match.turn - 1];
}

function renderMatch() {
  var m = G.match;
  if (!m) return '';
  var isPlayerTurn = currentAttacker() === 'jugador' && !m.finished;
  var fieldClass = 'field' + (m.lastEventClass ? ' ' + m.lastEventClass : '');

  var body = '';
  if (m.finished) {
    body = renderMatchEnd();
  } else if (isPlayerTurn) {
    body = renderPlayerTurn();
  } else {
    body = '<div class="panel center-text"><p>El rival está atacando…</p><button class="btn btn-primary btn-block" onclick="resolveOpponentTurn()">Continuar</button></div>';
  }

  return (
    '<div class="screen">' +
      '<div class="match-scoreboard">' +
        '<div class="score-side"><div class="score-name">' + escapeHtml(playerTeamLabel()) + '</div><div class="score-num">' + m.playerScore + '</div></div>' +
        '<div class="score-vs">VS</div>' +
        '<div class="score-side"><div class="score-name">' + escapeHtml(m.oppName) + '</div><div class="score-num">' + m.oppScore + '</div></div>' +
      '</div>' +
      '<div class="turn-indicator">' + (m.suddenDeath ? 'Muerte súbita — ronda ' + m.sdRound : 'Turno ' + m.turn + ' de ' + MATCH_TURNS) + (m.finished ? '' : (isPlayerTurn ? ' · Tu ataque' : ' · Ataque rival')) + '</div>' +
      (m.suddenDeath && !m.finished ? '<p class="dim small center-text">Gana quien marque más goles en esta ronda; sigue empatado y continúa otra ronda.</p>' : '') +
      '<div class="' + fieldClass + '"><div class="field-event">' + (m.lastEvent || (isPlayerTurn ? 'Elige tu jugador y tu jugada' : '')) + '</div></div>' +
      '<div class="meter-wrap">' +
        '<div class="meter-label"><span>Medidor de Jugada Especial</span><span>' + m.meterPlayer + '/100</span></div>' +
        '<div class="meter-track"><div class="meter-fill' + (m.meterPlayer >= 100 ? ' full' : '') + '" style="width:' + m.meterPlayer + '%"></div></div>' +
      '</div>' +
      body +
      '<div class="log-panel">' + m.log.slice(-6).map(function (l) { return '<p>' + l + '</p>'; }).join('') + '</div>' +
    '</div>'
  );
}

function playerTeamLabel() { return 'Tu equipo'; }

function renderPlayerTurn() {
  var m = G.match;
  var squad = G.run.squad;
  var selected = m.selectedAttackerId;
  var cards = squad.map(function (p) {
    return playerCardHtml(p, 'selectAttacker(\'' + p.id + '\')', selected === p.id, false);
  }).join('');

  var canSpecial = m.meterPlayer >= 100 && selected;
  var actions = (
    '<div class="action-row">' +
      '<button class="btn action-btn" ' + (selected ? '' : 'disabled') + ' onclick="playAction(\'tiro\')">⚽ Tiro<small>Directo a puerta</small></button>' +
      '<button class="btn action-btn" ' + (selected ? '' : 'disabled') + ' onclick="playAction(\'pase\')">🔁 Pase<small>Seguro, carga medidor</small></button>' +
      '<button class="btn action-btn btn-primary" ' + (canSpecial ? '' : 'disabled') + ' onclick="playAction(\'especial\')">🌟 Especial<small>' + (canSpecial ? '¡Listo!' : 'Requiere medidor lleno') + '</small></button>' +
    '</div>'
  );

  return (
    '<div class="panel">' +
      '<h3 style="margin-bottom:8px">Elige jugador</h3>' +
      '<div class="card-grid">' + cards + '</div>' +
      actions +
    '</div>'
  );
}

function selectAttacker(playerId) {
  var p = G.run.squad.find(function (pl) { return pl.id === playerId; });
  if (p.fatigado) { /* aún se puede usar, con penalización ya aplicada a stats en tiempo real si se desea */ }
  G.match.selectedAttackerId = playerId;
  render();
}

function effectiveStats(p) {
  if (!p.fatigado) return p;
  return {
    tiro: clamp(p.tiro - 10, 5, 99),
    pase: clamp(p.pase - 10, 5, 99),
    defensa: clamp(p.defensa - 10, 5, 99),
    especial: clamp(p.especial - 10, 5, 99),
    tipo: p.tipo,
    nombre: p.nombre
  };
}

function playAction(action) {
  var m = G.match;
  var attackerRaw = G.run.squad.find(function (p) { return p.id === m.selectedAttackerId; });
  if (!attackerRaw) return;
  var defenderRaw = choice(m.oppSquad);
  resolveAttack(attackerRaw, defenderRaw, action, true);
  advanceTurn();
}

function resolveOpponentTurn() {
  var m = G.match;
  var attackerRaw = choice(m.oppSquad);
  var defenderRaw = choice(G.run.squad);
  // decidir acción de la IA
  var action = 'tiro';
  var adv = typeAdvantage(attackerRaw.tipo, defenderRaw.tipo);
  if (m.meterOpp >= 100 && (adv >= 0 || Math.random() < 0.6)) {
    action = 'especial';
  } else {
    var roll = Math.random();
    action = roll < 0.65 ? 'tiro' : 'pase';
  }
  resolveAttack(attackerRaw, defenderRaw, action, false);
  advanceTurn();
}

function resolveAttack(attackerRaw, defenderRaw, action, isPlayerAttacking) {
  var m = G.match;
  var attacker = effectiveStats(attackerRaw);
  var defender = effectiveStats(defenderRaw);
  var adv = typeAdvantage(attacker.tipo, defender.tipo);

  var atkStat, meterGainBase, chance;
  if (action === 'tiro') { atkStat = attacker.tiro; meterGainBase = 15; chance = 50 + (atkStat - defender.defensa) * 0.6; }
  else if (action === 'pase') { atkStat = attacker.pase; meterGainBase = 25; chance = 30 + (atkStat - defender.defensa) * 0.5; }
  else { atkStat = attacker.especial; meterGainBase = 0; chance = 62 + (atkStat - defender.defensa) * 0.6; }

  chance += adv * (action === 'especial' ? 22 : 14);
  chance = clamp(Math.round(chance), 5, 95);

  var roll = rand(1, 100);
  var success = roll <= chance;

  var meterKey = isPlayerAttacking ? 'meterPlayer' : 'meterOpp';
  var scoreKey = isPlayerAttacking ? 'playerScore' : 'oppScore';
  var actorLabel = isPlayerAttacking ? escapeHtml(attackerRaw.nombre) : escapeHtml(attackerRaw.nombre) + ' (rival)';
  var advText = adv === 1 ? ' ¡Ventaja elemental!' : (adv === -1 ? ' Desventaja elemental.' : '');

  if (action === 'especial') {
    m[meterKey] = 0;
  } else {
    m[meterKey] = clamp(m[meterKey] + (success ? meterGainBase : Math.round(meterGainBase / 2)), 0, 100);
  }

  if (success) {
    m[scoreKey]++;
    var verb = action === 'especial' ? '¡Jugada Especial imparable!' : (action === 'tiro' ? '¡GOL!' : '¡Gol tras un gran pase!');
    m.lastEvent = actorLabel + ': ' + verb + advText;
    m.lastEventClass = 'goal';
    m.log.push('⚽ ' + m.lastEvent);
  } else {
    var missVerb = action === 'pase' ? 'el pase se corta.' : (action === 'especial' ? 'la jugada especial es bloqueada.' : 'el tiro es bloqueado.');
    m.lastEvent = actorLabel + ': ' + missVerb + advText;
    m.lastEventClass = 'block';
    m.log.push('🛡️ ' + m.lastEvent);
  }
  m.selectedAttackerId = null;
}

function advanceTurn() {
  var m = G.match;
  if (m.suddenDeath) {
    if (m.sdStage === 'jugador') {
      // el rival responde en la misma ronda
      m.sdStage = 'rival';
      render();
      return;
    }
    // la ronda se completa: ambos han atacado, se compara el marcador
    if (m.playerScore !== m.oppScore) {
      finishMatch();
      return;
    }
    m.sdRound++;
    if (m.sdRound > 5) {
      // desempate forzado para evitar bucles infinitos
      if (Math.random() < 0.5) m.playerScore++; else m.oppScore++;
      finishMatch();
      return;
    }
    m.sdStage = 'jugador';
    render();
    return;
  }

  m.turn++;
  if (m.turn > MATCH_TURNS) {
    if (m.playerScore === m.oppScore) {
      m.suddenDeath = true;
      m.sdRound = 1;
      m.sdStage = 'jugador';
      m.log.push('⏱️ Empate — ¡muerte súbita!');
      render();
      return;
    }
    finishMatch();
    return;
  }
  render();
}

function finishMatch() {
  var m = G.match;
  m.finished = true;
  var won = m.playerScore > m.oppScore;
  if (won) {
    G.run.matchesWon++;
    var reward = LEGEND_PER_MATCH + (m.isBoss ? LEGEND_PER_BOSS : 0);
    G.run.legendEarned += reward;
    // fatiga a un jugador aleatorio de la plantilla tras el esfuerzo
    var candidate = choice(G.run.squad);
    candidate.fatigado = true;
    m.log.push('🏅 ¡Victoria! +' + reward + ' Puntos de Leyenda (se sumarán al terminar la partida).');
  } else {
    m.log.push('💥 Derrota. Tu carrera termina aquí.');
  }
  render();
}

function renderMatchEnd() {
  var m = G.match;
  var won = m.playerScore > m.oppScore;
  var html = '<div class="panel center-text">';
  if (won) {
    html += '<h3>🏅 ¡Victoria ' + m.playerScore + ' - ' + m.oppScore + '!</h3>';
    html += '<p class="dim">Tu equipo avanza en el mapa.</p>';
    html += '<button class="btn btn-primary btn-block" onclick="afterMatchWin()">Continuar</button>';
  } else {
    html += '<h3>💥 Derrota ' + m.playerScore + ' - ' + m.oppScore + '</h3>';
    html += '<p class="dim">La partida ha terminado.</p>';
    html += '<button class="btn btn-danger btn-block" onclick="afterMatchLoss()">Ver resumen</button>';
  }
  html += '</div>';
  return html;
}

function afterMatchWin() {
  var wasFinalBoss = mapDepth(G.run.currentNodeId, G.run.map) === G.run.map.rows.length - 1;
  G.match = null;
  clearCurrentNode();
  if (wasFinalBoss) {
    G.run.victory = true;
    G.run.legendEarned += LEGEND_PER_BOSS; // bonificación extra por completar toda la temporada
    finishRun();
    return;
  }
  G.screen = 'map';
  render();
}

function afterMatchLoss() {
  G.run.victory = false;
  finishRun();
}

function finishRun() {
  var meta = G.meta;
  meta.points += G.run.legendEarned;
  meta.runsPlayed++;
  var depthReached = G.run.clearedCount;
  if (depthReached > meta.bestNode) meta.bestNode = depthReached;
  if (G.run.matchesWon > meta.bestWins) meta.bestWins = G.run.matchesWon;
  saveMeta(meta);
  G.meta = meta;
  G.screen = 'summary';
  render();
}

/* ---------------------------------------------------------------------
   13. RESUMEN DE PARTIDA
   --------------------------------------------------------------------- */

function renderSummary() {
  var run = G.run;
  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">' + (run.victory ? '🏆 ¡Campeones de la temporada!' : 'Resumen de la temporada') + '</h2>' +
        (run.victory ? '<p class="dim">Has superado todo el bracket sin perder ni un partido. ¡Enhorabuena!</p>' : '') +
        '<div class="stats-summary">' +
          '<div class="stat-tile"><div class="num">' + run.clearedCount + '</div><div class="label">Nodos superados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.matchesWon + '</div><div class="label">Partidos ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + run.legendEarned + '</div><div class="label">Puntos de Leyenda ganados</div></div>' +
          '<div class="stat-tile"><div class="num">' + G.meta.points + '</div><div class="label">Total acumulado</div></div>' +
        '</div>' +
        '<div class="btn-row" style="justify-content:center">' +
          '<button class="btn btn-primary btn-block" onclick="actionBackToMenu()">Volver al menú</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

/* ---------------------------------------------------------------------
   14. VESTUARIO (tienda de meta-progreso)
   --------------------------------------------------------------------- */

function renderVestuario() {
  var meta = G.meta;
  var items = CAPTAIN_POOL_LOCKED.map(function (entry) {
    var unlocked = meta.unlocked.indexOf(entry.captain.id) !== -1;
    var c = entry.captain;
    var right = unlocked
      ? '<span class="dim">✅ Desbloqueado</span>'
      : '<button class="btn btn-primary" ' + (meta.points >= entry.cost ? '' : 'disabled') + ' onclick="buyCaptain(\'' + c.id + '\')">Desbloquear</button>';
    return (
      '<div class="shop-item">' +
        '<div>' +
          '<strong>' + escapeHtml(c.nombre) + '</strong> ' + typeBadge(c.tipo) + '<br>' +
          '<span class="dim small">' + c.posicion + ' · ' + escapeHtml(c.desc) + '</span>' +
        '</div>' +
        '<div class="cost">' + (unlocked ? '' : '🏆 ' + entry.cost) + right + '</div>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="screen">' +
      '<div class="panel center-text">' +
        '<h2 class="panel-title">👕 Vestuario</h2>' +
        '<p class="currency-display">🏆 ' + meta.points + ' Puntos de Leyenda</p>' +
        '<p class="dim small">Desbloquea capitanes adicionales que podrán aparecer al empezar una nueva partida.</p>' +
      '</div>' +
      items +
      '<button class="btn btn-block mt" onclick="actionBackToMenu()">Volver</button>' +
    '</div>'
  );
}

function buyCaptain(captainId) {
  var meta = G.meta;
  var entry = CAPTAIN_POOL_LOCKED.find(function (e) { return e.captain.id === captainId; });
  if (!entry) return;
  if (meta.unlocked.indexOf(captainId) !== -1) return;
  if (meta.points < entry.cost) return;
  meta.points -= entry.cost;
  meta.unlocked.push(captainId);
  saveMeta(meta);
  render();
}

/* ---------------------------------------------------------------------
   15. INICIALIZACIÓN
   --------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', function () {
  appEl = document.getElementById('app');
  render();
});
