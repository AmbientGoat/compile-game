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
  playerName: 'Player',
  zones: structuredClone(initialZones),
  log: []
};

const roomForm = document.getElementById('room-form');
const roomIdInput = document.getElementById('room-id');
const playerNameInput = document.getElementById('player-name');
const playersList = document.getElementById('players-list');
const library = document.getElementById('library');
const helpDialog = document.getElementById('help-dialog');
const showHelpButton = document.getElementById('show-help');
const logList = document.getElementById('log-list');

const choiceDialog = document.getElementById('choice-dialog');
const choiceTitle = document.getElementById('choice-title');
const choiceDescription = document.getElementById('choice-description');
const choiceOptions = document.getElementById('choice-options');

let pendingChoiceResolver = null;

function getState() {
  return state;
}

function setState(nextState) {
  state.zones = nextState.zones;
}

function addLog(entry) {
  state.log.unshift(`[${new Date().toLocaleTimeString()}] ${entry}`);
  state.log = state.log.slice(0, 80);
  renderLog();
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

function renderLog() {
  logList.innerHTML = '';
  for (const message of state.log) {
    const li = document.createElement('li');
    li.textContent = message;
    logList.appendChild(li);
  }
}

function queuePrompt({ title, description, choices }) {
  return new Promise((resolve) => {
    choiceTitle.textContent = title;
    choiceDescription.textContent = description || '';
    choiceOptions.innerHTML = '';

    for (const choice of choices) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-button';
      button.textContent = choice.label;
      button.addEventListener('click', () => {
        pendingChoiceResolver = null;
        choiceDialog.close();
        resolve(choice.id);
      });
      choiceOptions.appendChild(button);
    }

    pendingChoiceResolver = resolve;
    choiceDialog.showModal();
  });
}

choiceDialog.addEventListener('close', () => {
  if (choiceDialog.returnValue === 'cancel' && pendingChoiceResolver) {
    const resolver = pendingChoiceResolver;
    pendingChoiceResolver = null;
    resolver(null);
  }
});

const engine = window.CompileGameLogic.createEngine({
  getState,
  setState,
  queuePrompt,
  addLog,
  syncState: () => {
    renderZones();
    emitStateUpdate();
  }
});

showHelpButton.addEventListener('click', () => {
  helpDialog.showModal();
});

function renderCard(card, zoneName, index) {
  const cardEl = document.createElement('article');
  cardEl.className = 'card';
  cardEl.draggable = true;
  cardEl.dataset.sourceZone = zoneName;
  cardEl.dataset.index = String(index);

  const hiddenClass = card.facing === 'down' ? 'down' : '';
  cardEl.classList.add(hiddenClass);

  cardEl.innerHTML = `
    <h4>${card.name}</h4>
    <p><strong>${card.protocol || 'Neutral'}</strong> • Value ${card.value ?? 2}</p>
    <p>${card.facing === 'down' ? 'Face-down card' : card.effectText || 'No immediate effect.'}</p>
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
    entry.className = 'card library-card';
    entry.innerHTML = `
      <h4>${card.name}</h4>
      <p><strong>${card.protocol}</strong> • Value ${card.value}</p>
      <p>${card.effectText}</p>
    `;
    library.appendChild(entry);
  }
}

async function maybeResolvePlayEffect({ sourceZone, destinationZone, card }) {
  const enteringField = destinationZone === 'playerField' || destinationZone === 'opponentField';
  const fromHand = sourceZone === 'hand';

  if (!enteringField || !fromHand || !card) {
    return;
  }

  addLog(`${state.playerName} played ${card.name} (${card.protocol}).`);
  await engine.runCardPlayEffects(card, { actor: state.playerName });
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

    zone.addEventListener('drop', async (event) => {
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

      await maybeResolvePlayEffect({
        sourceZone,
        destinationZone: zoneName,
        card: movedCard
      });
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
  state.playerName = playerName;
  socket.emit('join-room', { roomId, playerName });
  addLog(`${playerName} joined room '${roomId}'.`);
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
renderLog();
setupDropTargets();
