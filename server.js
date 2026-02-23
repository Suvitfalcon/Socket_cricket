// server.js
// Hand Cricket WebSocket Server

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server for static files
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ server });

let players = []; // [{ ws, id, name }]
let idSeq = 1;

let game = {
  phase: 'waiting',   // 'waiting' | 'tossChoosing' | 'tossFlipping' | 'playing'
  innings: 0,         // 0 none, 1 first innings, 2 second innings
  batsman: null,      // ws of batting player (current innings)
  bowler: null,       // ws of bowling player (current innings)
  score1: 0,          // first-innings runs
  score2: 0,          // second-innings runs
  wickets: 0,         // wickets fallen in current innings
  target: null,       // score1 + 1 during innings 2
  maxWickets: 3,
  overs: 1,           // selected overs (1, 2, or 3)
  ballsLimit: 6,      // overs * 6, per innings
  ballsUsed: 0        // balls bowled in current innings
};

let choices = {}; // per-ball choices: { batsman, bowler }

let toss = {
  picks: {},       // { [id]: 'heads'|'tails' }
  sidesTaken: {},  // { heads: id|null, tails: id|null }
  flipperId: null, // id of player who flips
  winnerId: null,
  outcome: null
};

function safeSend(ws, data) {
  try {
    if (ws?.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (e) {
    console.error('Send error:', e);
  }
}

function broadcast(data) {
  players.forEach(p => safeSend(p.ws, data));
}

function resetMatch() {
  game = {
    phase: 'waiting',
    innings: 0,
    batsman: null,
    bowler: null,
    score1: 0,
    score2: 0,
    wickets: 0,
    target: null,
    maxWickets: 3,
    overs: 1, 
    ballsLimit: 6,
    ballsUsed: 0
  };
  choices = {};
  toss = { picks: {}, sidesTaken: {}, flipperId: null, winnerId: null, outcome: null };
  console.log('🔄 Match reset.');
}

function startMatchIfReady() {
  if (players.length === 2 && game.phase === 'waiting') {
    game.phase = 'tossChoosing';
    broadcast({ type: 'tossStart' });
    console.log('🪙 Toss started.');
  }
}

function playerById(id) {
  return players.find(p => p.id === id);
}

function otherPlayer(id) {
  return players.find(p => p.id !== id);
}

// ========== OVERS HANDLER ==========
function handleSetOvers(ws, overs, playerName) {
  const o = Number(overs);
  if (![1, 2, 3].includes(o)) {
    return safeSend(ws, { type: 'error', message: 'Invalid overs. Allowed: 1, 2, 3.' });
  }
  
  if (game.phase === 'waiting') {
    game.overs = o;
    game.ballsLimit = o * 6;
    
    const player = players.find(p => p.ws === ws);
    if (player) {
      player.name = playerName || `Player ${player.id}`;
    }
    
    safeSend(ws, { type: 'oversAccepted', overs: game.overs });
    broadcast({ type: 'status', message: `Match will be ${game.overs} over(s) per innings (${game.ballsLimit} balls).` });
    console.log(`⚙️ Overs set to ${game.overs} by ${player?.name || 'Unknown'}`);
  } else {
    safeSend(ws, { type: 'error', message: 'Cannot change overs after match started.' });
  }
}

// ========== TOSS HANDLERS ==========
function handleTossChooseSide(ws, id, side) {
  if (game.phase !== 'tossChoosing') return;
  if (side !== 'heads' && side !== 'tails') {
    return safeSend(ws, { type: 'tossSideAck', ok: false, message: 'Invalid side.' });
  }

  if (toss.sidesTaken[side] && toss.sidesTaken[side] !== id) {
    return safeSend(ws, { type: 'tossSideAck', ok: false, message: 'Side already taken. Choose the other.' });
  }

  const prev = toss.picks[id];
  if (prev && prev !== side) {
    delete toss.sidesTaken[prev];
  }
  toss.picks[id] = side;
  toss.sidesTaken[side] = id;

  safeSend(ws, { type: 'tossSideAck', ok: true, yourSide: side });

  if (toss.sidesTaken.heads && toss.sidesTaken.tails) {
    game.phase = 'tossFlipping';
    toss.flipperId = Math.random() < 0.5 ? toss.sidesTaken.heads : toss.sidesTaken.tails;

    players.forEach(p => {
      safeSend(p.ws, { type: 'tossSidesLocked', youAreFlipper: p.id === toss.flipperId });
    });
    console.log(`🪙 Toss sides locked. Flipper: P${toss.flipperId}`);
  }
}

function handleTossFlip(ws, id) {
  if (game.phase !== 'tossFlipping') return;
  if (id !== toss.flipperId) return;

  toss.outcome = Math.random() < 0.5 ? 'heads' : 'tails';
  toss.winnerId = toss.sidesTaken[toss.outcome];

  broadcast({
    type: 'tossResult',
    outcome: toss.outcome,
    winnerId: toss.winnerId,
    winnerSide: toss.outcome
  });

  console.log(`🪙 Toss result: ${toss.outcome}, winner P${toss.winnerId}`);
}

function handleTossChooseRole(ws, id, role) {
  if (game.phase !== 'tossFlipping') return;
  if (id !== toss.winnerId) return;
  if (role !== 'batting' && role !== 'bowling') return;

  const winner = playerById(id);
  const loser = otherPlayer(id);
  if (!winner || !loser) return;

  if (role === 'batting') {
    game.batsman = winner.ws;
    game.bowler = loser.ws;
  } else {
    game.batsman = loser.ws;
    game.bowler = winner.ws;
  }

  game.phase = 'playing';
  game.innings = 1;
  game.score1 = 0;
  game.score2 = 0;
  game.wickets = 0;
  game.ballsUsed = 0;
  game.target = null;

  players.forEach(p => {
    const yourRole = (p.ws === game.batsman) ? 'batting' : 'bowling';
    safeSend(p.ws, { type: 'rolesAssigned', yourRole, message: 'Innings 1 begins.' });
  });

  broadcast({
    type: 'update',
    innings: game.innings,
    score: 0,
    wickets: 0,
    target: null,
    ballsUsed: 0,
    ballsLimit: game.ballsLimit
  });

  console.log(`🏏 Innings 1 started. Winner P${id} chose ${role}. Match: ${game.overs} over(s).`);
}

// ========== GAMEPLAY (BALL INDICATORS SUPPORT) ==========
function handleChoice(playerWs, value) {
  if (game.phase !== 'playing') return;

  const role = (playerWs === game.batsman) ? 'batsman' : (playerWs === game.bowler) ? 'bowler' : null;
  if (!role) return;

  const val = Number(value);
  if (!Number.isInteger(val) || val < 0 || val > 6) {
    return safeSend(playerWs, { type: 'error', message: 'Choice must be 0-6.' });
  }

  choices[role] = val;

  if (choices.batsman !== undefined && choices.bowler !== undefined) {
    const b = choices.batsman;
    const w = choices.bowler;

    // Resolve delivery
    if (b === w) {
      game.wickets += 1;
      broadcast({ type: 'result', outcome: 'out', batsmanChoice: b, bowlerChoice: w });
      console.log(`🔴 Ball result: WICKET (both chose ${b})`);
    } else {
      if (game.innings === 1) {
        game.score1 += b;
      } else {
        game.score2 += b;
      }
      broadcast({ type: 'result', outcome: 'score', runs: b, batsmanChoice: b, bowlerChoice: w });
      console.log(`🔴 Ball result: ${b} runs`);
    }

    game.ballsUsed += 1;
    choices = {};

    const emitUpdate = () => {
      const score = (game.innings === 1) ? game.score1 : game.score2;
      broadcast({
        type: 'update',
        innings: game.innings,
        score,
        wickets: game.wickets,
        target: game.target,
        ballsUsed: game.ballsUsed,
        ballsLimit: game.ballsLimit
      });
    };

    if (game.innings === 1) {
      emitUpdate();

      if (game.wickets >= game.maxWickets || game.ballsUsed >= game.ballsLimit) {
        game.innings = 2;
        game.target = game.score1 + 1;
        game.wickets = 0;
        game.ballsUsed = 0;

        const oldBatsman = game.batsman;
        game.batsman = game.bowler;
        game.bowler = oldBatsman;

        broadcast({
          type: 'inningsChange',
          message: `Innings 2 begins. Target: ${game.target}. Roles swapped.`,
          target: game.target,
          ballsLimit: game.ballsLimit
        });

        players.forEach(p => {
          const yourRole = (p.ws === game.batsman) ? 'batting' : 'bowling';
          safeSend(p.ws, { type: 'rolesAssigned', yourRole, message: 'Roles swapped for Innings 2.' });
        });

        emitUpdate();
        console.log(`🔄 Innings 2 started. Target: ${game.target}`);
      }
    } else {
      if (game.score2 >= game.target) {
        emitUpdate();
        broadcast({
          type: 'matchOver',
          result: 'chasingSideWon',
          final: { 
            score1: game.score1, 
            score2: game.score2, 
            target: game.target, 
            ballsUsed1: game.ballsLimit, 
            ballsUsed2: game.ballsUsed, 
            wickets1: game.maxWickets, 
            wickets2: game.wickets 
          },
          playerNames: {
            player1: players[0]?.name || 'Player 1',
            player2: players[1]?.name || 'Player 2'
          },
          message: `Chase successful! Won by ${game.maxWickets - game.wickets} wickets.`
        });
        console.log(`🏆 Match over - chasing side won (${game.score2} >= ${game.target})`);
        resetMatch();
        return;
      }

      if (game.ballsUsed >= game.ballsLimit || game.wickets >= game.maxWickets) {
        let result = 'defendingSideWon';
        let message = `Defending side wins by ${game.target - game.score2 - 1} runs.`;
        
        if (game.score2 === game.score1) {
          result = 'tie';
          message = `Match tied! Both teams scored ${game.score1} runs.`;
        }

        emitUpdate();
        broadcast({
          type: 'matchOver',
          result,
          final: { 
            score1: game.score1, 
            score2: game.score2, 
            target: game.target, 
            ballsUsed1: game.ballsLimit, 
            ballsUsed2: game.ballsUsed, 
            wickets1: game.maxWickets, 
            wickets2: game.wickets 
          },
          playerNames: {
            player1: players[0]?.name || 'Player 1',
            player2: players[1]?.name || 'Player 2'
          },
          message
        });
        console.log(`🏆 Match over - Score comparison: ${game.score1} vs ${game.score2}`);
        resetMatch();
        return;
      }

      emitUpdate();
    }
  }
}

// ========== SERVER LIFECYCLE ==========
wss.on('connection', ws => {
  if (players.length >= 2) {
    safeSend(ws, { type: 'full', message: 'Room full. Try again later.' });
    ws.close(1013, 'Room full');
    return;
  }

  const id = idSeq++;
  players.push({ ws, id, name: `Player ${id}` });
  console.log(`👋 Client connected: P${id}`);

  safeSend(ws, { type: 'hello', id, message: 'Connected. Select overs and wait for opponent...' });

  if (players.length === 2) {
    setTimeout(() => startMatchIfReady(), 500);
  }

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    console.log(`📨 Message from P${id}:`, msg.type);

    switch (msg.type) {
      case 'setOvers':
        handleSetOvers(ws, msg.overs, msg.playerName);
        break;
      case 'tossChooseSide':
        handleTossChooseSide(ws, id, msg.side);
        break;
      case 'tossFlip':
        handleTossFlip(ws, id);
        break;
      case 'tossChooseRole':
        handleTossChooseRole(ws, id, msg.role);
        break;
      case 'choice':
        handleChoice(ws, msg.value);
        break;
      default:
        safeSend(ws, { type: 'error', message: 'Unknown message type.' });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`👋 Client disconnected: P${id}`);
    players = players.filter(p => p.ws !== ws);
    resetMatch();
    if (players.length === 1) {
      safeSend(players[0].ws, { type: 'reset', message: 'Opponent disconnected. Waiting for a new player.' });
    }
  });

  ws.on('error', err => console.error('🚨 WS error:', err));
});

server.listen(PORT, () => {
  console.log(`🏏 Hand Cricket Enhanced Server started on port ${PORT}`);
  console.log(`🌐 Access game at: http://localhost:${PORT}`);
  console.log(`🔴 Features: Ball indicators, Player vs Opponent scoreboard, Wickets Taken`);
  console.log('⏳ Waiting for players to connect...');
});
