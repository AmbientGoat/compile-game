window.COMPILE_CARDS = [
  {
    id: 'mn02-clarity-01',
    name: 'Clarity / Reveal Hand',
    set: 'MN02',
    protocol: 'Clarity',
    value: 1,
    facing: 'up',
    effectText: 'Your opponent reveals their hand.',
    effects: [{ type: 'reveal-hand', target: 'opponent' }]
  },
  {
    id: 'mn02-clarity-02',
    name: 'Clarity / Value-5 Search',
    set: 'MN02',
    protocol: 'Clarity',
    value: 3,
    facing: 'up',
    effectText: 'Reveal your deck. Draw 1 card with value 5 revealed this way. Shuffle your deck.',
    effects: [{ type: 'draw-value-from-deck', value: 5, amount: 1 }]
  },
  {
    id: 'mn02-chaos-01',
    name: 'Chaos / Draw-Rearrange-Covered',
    set: 'MN02',
    protocol: 'Chaos',
    value: 2,
    facing: 'up',
    effectText: 'Draw 1 card, then rearrange one protocol.',
    effects: [
      { type: 'draw', amount: 1 },
      { type: 'note-choice', message: 'Rearrange protocols manually (line/protocol movement UI is next).'}
    ]
  },
  {
    id: 'mn02-fear-01',
    name: 'Fear / Shift-Discard',
    set: 'MN02',
    protocol: 'Fear',
    value: 2,
    facing: 'up',
    effectText: 'Shift one uncovered friendly card, then discard 1 card.',
    effects: [
      { type: 'shift-friendly-choice' },
      { type: 'discard-from-hand', amount: 1 }
    ]
  },
  {
    id: 'mn02-corruption-01',
    name: 'Corruption / Flip-Discard',
    set: 'MN02',
    protocol: 'Corruption',
    value: 2,
    facing: 'up',
    effectText: 'Flip one field card. Then discard 1 card.',
    effects: [
      { type: 'flip-field-choice' },
      { type: 'discard-from-hand', amount: 1 }
    ]
  },
  {
    id: 'mn02-smoke-01',
    name: 'Smoke / Face-down Shift',
    set: 'MN02',
    protocol: 'Smoke',
    value: 2,
    facing: 'up',
    effectText: 'Choose one card and set it face-down, then shift it.',
    effects: [
      { type: 'set-facedown-choice' },
      { type: 'shift-any-choice' }
    ]
  },
  {
    id: 'mn02-time-01',
    name: 'Time / Discard-Trash',
    set: 'MN02',
    protocol: 'Time',
    value: 3,
    facing: 'up',
    effectText: 'Each player discards 1 card.',
    effects: [{ type: 'mutual-discard', amount: 1 }]
  },
  {
    id: 'mn02-luck-01',
    name: 'Luck / Random-Delete-Play',
    set: 'MN02',
    protocol: 'Luck',
    value: 4,
    facing: 'up',
    effectText: 'Randomly delete one uncovered card. Then you may play a card from hand face-down.',
    effects: [
      { type: 'random-delete-uncovered', amount: 1 },
      { type: 'note-choice', message: 'Optional bonus play is not automated yet; play manually.' }
    ]
  }
];
