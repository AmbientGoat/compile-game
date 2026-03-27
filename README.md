# Compile Online Prototype

This repository contains an MVP digital implementation of the **Compile** card game built for remote play.

## Current Features

- Shared realtime board state over WebSockets (Socket.IO).
- Click + drag card movement between deck, hand, field, and discard zones.
- Room system so two friends can join the same game.
- In-app card library panel (sample cards included as placeholders).
- Direct links to:
  - Official card browser: https://ryanascherr.github.io/compile/
  - Complete rules PDF: https://www.dropbox.com/scl/fi/4euibgcvbyxufqvm08fam/COMP-MN01_Rulesheet.pdf?rlkey=ewp7j0glzjct6evffzp0t011k&e=1&st=vyue05bi&dl=0
- In-game quick guide modal.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in two browser windows (or on two machines on the same network).

## Notes

- `public/cards.js` currently ships with sample card data only. Replace with complete official card definitions.
- This MVP focuses on board interaction and remote syncing first; turn order, rules enforcement, decks, and matchmaking can be layered in next.
