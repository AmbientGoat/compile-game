const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();

function makeDefaultState() {
  return {
    updatedAt: Date.now(),
    zones: {
      deck: [],
      hand: [],
      playerField: [],
      opponentField: [],
      discard: []
    },
    players: {}
  };
}

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, makeDefaultState());
  }
  return rooms.get(roomId);
}

app.use(express.static('public'));

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, playerName }) => {
    if (!roomId) {
      return;
    }

    socket.join(roomId);
    const state = ensureRoom(roomId);
    state.players[socket.id] = playerName || `Player-${socket.id.slice(0, 4)}`;

    io.to(roomId).emit('room-presence', {
      players: Object.values(state.players)
    });

    socket.emit('state-sync', state.zones);
  });

  socket.on('state-update', ({ roomId, zones }) => {
    if (!roomId || !zones) {
      return;
    }

    const state = ensureRoom(roomId);
    state.zones = zones;
    state.updatedAt = Date.now();

    socket.to(roomId).emit('state-sync', zones);
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) {
        continue;
      }

      const state = rooms.get(roomId);
      if (!state) {
        continue;
      }

      delete state.players[socket.id];
      io.to(roomId).emit('room-presence', {
        players: Object.values(state.players)
      });

      if (!Object.keys(state.players).length) {
        rooms.delete(roomId);
      }
    }
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Compile online prototype listening at http://localhost:${port}`);
});
