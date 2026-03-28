# Compile Online Prototype

This repository contains an early digital implementation of **Compile** for remote play.

## Current Features

- Shared realtime board state over WebSockets (Socket.IO).
- Drag-and-drop card movement between deck, hand, field, and trash zones.
- Room system so two friends can join the same game board.
- Rules-aware effect engine for an initial subset of card effects.
- Effect prompt dialog that requests player choices when effects require targeting.
- Resolution log that records effect outcomes and unresolved manual steps.
- In-app card library panel and links to:
  - Official card browser: https://ryanascherr.github.io/compile/
  - Complete rules PDF: https://www.dropbox.com/scl/fi/4euibgcvbyxufqvm08fam/COMP-MN01_Rulesheet.pdf?rlkey=ewp7j0glzjct6evffzp0t011k&e=1&st=vyue05bi&dl=0

## Implemented Rules Concepts

Based on key terms and card text excerpts from the rulesheet/database references, the prototype currently supports:

- draw
- reveal hand (prompt/log workflow)
- draw by deck filter (value-based search)
- discard from hand with player choice
- mutual discard (local + opponent prompt/log)
- flip face-up / face-down by choice
- set face-down by choice
- shift by choice
- random delete

Some effects still intentionally log manual steps when game board structures (protocol line rearrangement/compile checks/full stack semantics) are not yet fully modeled.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in two browser windows (or two machines on the same network).

## Next milestones

- Full protocol/line model (three lines, uncovered/covered stack behavior).
- Turn controller and compile/refresh/check-control enforcement.
- Full card import from the card database source.
- Match lobby and account-backed online play.
