const socket = io();

const ZONES = ['deck', 'hand', 'playerField', 'opponentField', 'discard'];
const initialZones = {
  deck: [...window.COMPILE_CARDS],
  hand: [],
  playerField: [],
  opponentField: [],
  discard: []
};

const state = {
  roomId: null,
  zones: structuredClone(initialZones)
};

const roomForm = document.getElementById('room-form');
const roomIdInput = document.getElementById('room-id');
const playerNameInput = document.getElementById('player-name');
const playersList = document.getElementById('players-list');
const library = document.getElementById('library');
const helpDialog = document.getElementById('help-dialog');
const showHelpButton = document.getElementById('show-help');

showHelpButton.addEventListener('click', () => {
  helpDialog.showModal();
});

function renderCard(card, zoneName, index) {
  const cardEl = document.createElement('article');
  cardEl.className = 'card';
  cardEl.draggable = true;
  cardEl.dataset.sourceZone = zoneName;
  cardEl.dataset.index = String(index);

  cardEl.innerHTML = `
    <h4>${card.name}</h4>
    <p><strong>${card.type}</strong> • Cost ${card.cost}</p>
    <p>${card.text}</p>
  `;

  cardEl.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', JSON.stringify({ sourceZone: zoneName, index }));
  });

  return cardEl;
}

function renderZones() {
  for (const zoneName of ZONES) {
    const zoneEl = document.getElementById(zoneName);
    zoneEl.innerHTML = '';

    state.zones[zoneName].forEach((card, index) => {
      zoneEl.appendChild(renderCard(card, zoneName, index));
    });
  }
}

function renderLibrary() {
  library.innerHTML = '';
  for (const card of window.COMPILE_CARDS) {
    const entry = document.createElement('div');
    entry.className = 'card';
    entry.innerHTML = `
      <h4>${card.name}</h4>
      <p><strong>${card.type}</strong> • Cost ${card.cost}</p>
      <p>${card.text}</p>
    `;
    library.appendChild(entry);
  }
}

function emitStateUpdate() {
  if (!state.roomId) {
    return;
  }

  socket.emit('state-update', {
    roomId: state.roomId,
    zones: state.zones
  });
}

function setupDropTargets() {
  document.querySelectorAll('.zone').forEach((zone) => {
    const zoneName = zone.dataset.zone;

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('active');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('active');
    });

    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('active');

      const payload = event.dataTransfer.getData('text/plain');
      if (!payload) {
        return;
      }

      const { sourceZone, index } = JSON.parse(payload);
      const parsedIndex = Number(index);
      if (!state.zones[sourceZone] || Number.isNaN(parsedIndex)) {
        return;
      }

      const [movedCard] = state.zones[sourceZone].splice(parsedIndex, 1);
      if (!movedCard) {
        return;
      }

      state.zones[zoneName].push(movedCard);
      renderZones();
      emitStateUpdate();
    });
  });
}

roomForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const roomId = roomIdInput.value.trim();
  const playerName = playerNameInput.value.trim();
  if (!roomId || !playerName) {
    return;
  }

  state.roomId = roomId;
  socket.emit('join-room', { roomId, playerName });
});

socket.on('state-sync', (zones) => {
  state.zones = zones;
  renderZones();
});

socket.on('room-presence', ({ players }) => {
  playersList.innerHTML = '';
  for (const player of players) {
    const li = document.createElement('li');
    li.textContent = player;
    playersList.appendChild(li);
  }
});

renderLibrary();
renderZones();
setupDropTargets();
