(function () {
  const PLAYER_ZONE_PRIORITY = ['playerField', 'hand', 'deck', 'discard'];
  const OPPONENT_ZONE_PRIORITY = ['opponentField'];

  function clone(value) {
    return structuredClone(value);
  }

  function removeCardsByIndexes(cards, indexes) {
    const sorted = [...indexes].sort((a, b) => b - a);
    const removed = [];
    for (const idx of sorted) {
      if (idx >= 0 && idx < cards.length) {
        removed.push(cards.splice(idx, 1)[0]);
      }
    }
    return removed.reverse();
  }

  function drawCards(zones, amount) {
    let remaining = amount;
    while (remaining > 0 && zones.deck.length > 0) {
      zones.hand.push(zones.deck.shift());
      remaining -= 1;
    }

    return {
      drawn: amount - remaining,
      message: remaining > 0
        ? `Drew ${amount - remaining} card(s); deck ran out before drawing ${amount}.`
        : `Drew ${amount} card(s).`
    };
  }

  function shiftInZone(zones, fromZone, cardIndex, toZone) {
    if (!zones[fromZone] || !zones[toZone]) {
      return { ok: false, message: 'Invalid shift target.' };
    }

    const [card] = zones[fromZone].splice(cardIndex, 1);
    if (!card) {
      return { ok: false, message: 'No card selected for shift.' };
    }

    zones[toZone].push(card);
    return { ok: true, message: `Shifted ${card.name} to ${toZone}.` };
  }

  function buildChoicesFromZone(zones, zoneName, labelPrefix) {
    const zone = zones[zoneName] || [];
    return zone.map((card, idx) => ({
      id: `${zoneName}:${idx}`,
      label: `${labelPrefix} ${card.name}`,
      meta: { zone: zoneName, index: idx }
    }));
  }

  function parseChoiceMeta(choiceId) {
    const [zone, rawIndex] = String(choiceId).split(':');
    return { zone, index: Number(rawIndex) };
  }

  function createEngine({ getState, setState, queuePrompt, addLog, syncState }) {
    async function runCardPlayEffects(card, context) {
      if (!card?.effects?.length || card.facing === 'down') {
        return;
      }

      for (const effect of card.effects) {
        // eslint-disable-next-line no-await-in-loop
        await runEffect(effect, context);
      }

      syncState();
    }

    async function runEffect(effect, context) {
      const state = clone(getState());
      const zones = state.zones;

      switch (effect.type) {
        case 'draw': {
          const outcome = drawCards(zones, effect.amount ?? 1);
          setState(state);
          addLog(`${context.actor}: ${outcome.message}`);
          return;
        }

        case 'draw-value-from-deck': {
          const matches = [];
          zones.deck.forEach((card, idx) => {
            if (card.value === effect.value) {
              matches.push(idx);
            }
          });

          if (!matches.length) {
            addLog(`${context.actor}: No value ${effect.value} card found in deck.`);
            return;
          }

          const picked = matches[0];
          const [found] = removeCardsByIndexes(zones.deck, [picked]);
          zones.hand.push(found);
          setState(state);
          addLog(`${context.actor}: Revealed deck and drew ${found.name} (value ${effect.value}).`);
          return;
        }

        case 'discard-from-hand': {
          const amount = effect.amount ?? 1;
          for (let i = 0; i < amount; i += 1) {
            const snapshot = clone(getState());
            const handChoices = buildChoicesFromZone(snapshot.zones, 'hand', 'Discard');
            if (!handChoices.length) {
              addLog(`${context.actor}: No cards in hand to discard.`);
              return;
            }

            // eslint-disable-next-line no-await-in-loop
            const selected = await queuePrompt({
              title: 'Choose card to discard',
              description: 'Card effect requires a discard.',
              choices: handChoices
            });

            if (!selected) {
              addLog(`${context.actor}: Discard selection skipped.`);
              return;
            }

            const live = clone(getState());
            const meta = parseChoiceMeta(selected);
            const [discarded] = removeCardsByIndexes(live.zones[meta.zone], [meta.index]);
            if (discarded) {
              live.zones.discard.push(discarded);
              setState(live);
              addLog(`${context.actor}: Discarded ${discarded.name}.`);
            }
          }

          return;
        }

        case 'mutual-discard': {
          const playerState = clone(getState());
          if (playerState.zones.hand.length) {
            const [discarded] = removeCardsByIndexes(playerState.zones.hand, [playerState.zones.hand.length - 1]);
            playerState.zones.discard.push(discarded);
            addLog(`${context.actor}: You discarded ${discarded.name}.`);
          } else {
            addLog(`${context.actor}: You had no card to discard.`);
          }

          addLog(`${context.actor}: Opponent should discard ${effect.amount ?? 1} card(s).`);
          setState(playerState);
          return;
        }

        case 'reveal-hand': {
          addLog(`${context.actor}: Opponent must reveal their hand.`);
          return;
        }

        case 'flip-field-choice': {
          const snapshot = clone(getState());
          const options = [
            ...buildChoicesFromZone(snapshot.zones, 'playerField', 'Flip'),
            ...buildChoicesFromZone(snapshot.zones, 'opponentField', 'Flip')
          ];

          if (!options.length) {
            addLog(`${context.actor}: No field cards available to flip.`);
            return;
          }

          const selected = await queuePrompt({
            title: 'Choose field card to flip',
            description: 'This effect flips a card face-up/down.',
            choices: options
          });

          if (!selected) {
            addLog(`${context.actor}: Flip selection skipped.`);
            return;
          }

          const live = clone(getState());
          const meta = parseChoiceMeta(selected);
          const card = live.zones[meta.zone]?.[meta.index];
          if (!card) {
            addLog(`${context.actor}: Chosen card no longer exists.`);
            return;
          }

          card.facing = card.facing === 'down' ? 'up' : 'down';
          setState(live);
          addLog(`${context.actor}: Flipped ${card.name} to face-${card.facing}.`);
          return;
        }

        case 'set-facedown-choice': {
          const snapshot = clone(getState());
          const options = [
            ...buildChoicesFromZone(snapshot.zones, 'playerField', 'Set face-down'),
            ...buildChoicesFromZone(snapshot.zones, 'opponentField', 'Set face-down')
          ];

          if (!options.length) {
            addLog(`${context.actor}: No field cards available to set face-down.`);
            return;
          }

          const selected = await queuePrompt({
            title: 'Choose card to set face-down',
            description: 'Set one field card to face-down.',
            choices: options
          });

          if (!selected) {
            addLog(`${context.actor}: Face-down choice skipped.`);
            return;
          }

          const live = clone(getState());
          const meta = parseChoiceMeta(selected);
          const card = live.zones[meta.zone]?.[meta.index];
          if (!card) {
            return;
          }

          card.facing = 'down';
          setState(live);
          addLog(`${context.actor}: Set ${card.name} face-down.`);
          return;
        }

        case 'shift-friendly-choice': {
          const snapshot = clone(getState());
          const choices = buildChoicesFromZone(snapshot.zones, 'playerField', 'Shift');
          if (!choices.length) {
            addLog(`${context.actor}: No friendly field cards available to shift.`);
            return;
          }

          const selected = await queuePrompt({
            title: 'Choose friendly card to shift',
            description: 'Move a friendly uncovered card to a new zone.',
            choices
          });

          if (!selected) {
            addLog(`${context.actor}: Shift skipped.`);
            return;
          }

          const destination = await queuePrompt({
            title: 'Choose shift destination',
            description: 'Pick destination zone for shifted card.',
            choices: PLAYER_ZONE_PRIORITY
              .filter((z) => z !== 'playerField')
              .map((zone) => ({ id: `dest:${zone}`, label: `Move to ${zone}` }))
          });

          if (!destination) {
            addLog(`${context.actor}: Shift destination not chosen.`);
            return;
          }

          const live = clone(getState());
          const chosen = parseChoiceMeta(selected);
          const targetZone = destination.split(':')[1];
          const outcome = shiftInZone(live.zones, chosen.zone, chosen.index, targetZone);
          setState(live);
          addLog(`${context.actor}: ${outcome.message}`);
          return;
        }

        case 'shift-any-choice': {
          const snapshot = clone(getState());
          const options = [
            ...buildChoicesFromZone(snapshot.zones, 'playerField', 'Shift'),
            ...buildChoicesFromZone(snapshot.zones, 'opponentField', 'Shift')
          ];

          if (!options.length) {
            addLog(`${context.actor}: No cards available to shift.`);
            return;
          }

          const selected = await queuePrompt({
            title: 'Choose card to shift',
            description: 'Move selected card to another field zone.',
            choices: options
          });

          if (!selected) {
            addLog(`${context.actor}: Shift skipped.`);
            return;
          }

          const destination = await queuePrompt({
            title: 'Choose destination zone',
            description: 'Move selected card to destination.',
            choices: [...PLAYER_ZONE_PRIORITY, ...OPPONENT_ZONE_PRIORITY]
              .filter((z) => !selected.startsWith(`${z}:`))
              .map((zone) => ({ id: `dest:${zone}`, label: `Move to ${zone}` }))
          });

          if (!destination) {
            return;
          }

          const live = clone(getState());
          const picked = parseChoiceMeta(selected);
          const target = destination.split(':')[1];
          const outcome = shiftInZone(live.zones, picked.zone, picked.index, target);
          setState(live);
          addLog(`${context.actor}: ${outcome.message}`);
          return;
        }

        case 'random-delete-uncovered': {
          const live = clone(getState());
          const pool = [
            ...buildChoicesFromZone(live.zones, 'playerField', 'Delete'),
            ...buildChoicesFromZone(live.zones, 'opponentField', 'Delete')
          ];

          if (!pool.length) {
            addLog(`${context.actor}: No uncovered cards available for random delete.`);
            return;
          }

          const roll = Math.floor(Math.random() * pool.length);
          const meta = parseChoiceMeta(pool[roll].id);
          const [deleted] = removeCardsByIndexes(live.zones[meta.zone], [meta.index]);
          if (!deleted) {
            return;
          }

          live.zones.discard.push(deleted);
          setState(live);
          addLog(`${context.actor}: Random delete removed ${deleted.name}.`);
          return;
        }

        case 'note-choice': {
          addLog(`${context.actor}: ${effect.message}`);
          return;
        }

        default:
          addLog(`${context.actor}: Effect '${effect.type}' is not implemented yet.`);
      }
    }

    return {
      runCardPlayEffects
    };
  }

  window.CompileGameLogic = {
    createEngine
  };
})();
