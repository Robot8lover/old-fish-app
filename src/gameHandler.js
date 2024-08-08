import { randomBytes } from "node:crypto";
import { validateCard, validateMaxPlayers, makeHands } from "./cards.js";
import { ASK_DELAY, NAME_LEN } from "../public/shared_js/constants.js";

const testHex = (text) => /^[0-9A-Fa-f]+$/.test(text);

const games = {};
const users = {};

const swapSeats = (gameId, seat1, seat2) => {
  players = games[gameId].players;
  [players[seat1], players[seat2]] = [players[seat2], players[seat1]];
};

const gameId2room = (gameId) => `game:${gameId}`;
const userId2room = (userId) => `user:${userId}`;

const resetGame = (gameId) => {
  const game = games[gameId];
  games[gameId] = {
    ...game,
    turn: -1,
    hands: new Array(game.maxPlayers),
    nextAskTime: 0,
    playing: false,
    declared: [],
  };
};

const createGame = (gameId, maxPlayers) => ({
  id: gameId,
  players: new Array(maxPlayers).fill(""),
  names: new Array(maxPlayers).fill(""),
  turn: -1,
  maxPlayers,
  hands: new Array(maxPlayers),
  nextAskTime: 0,
  host: "",
  playing: false,
  declared: [],
});

const createUser = (userId) => {
  return {
    gameId: "",
    userId,
  };
};

const registerPlayHandlers = (io, socket) => {
  const userId = socket.id;

  const emitToGame = (gameId, eventName, ...args) => {
    io.to(gameId2room(gameId)).emit(eventName, ...args);
  };

  socket.on("game:play:ask", (gameId, card, target) => {
    if (game.nextAskTime > Date.now()) {
      // must wait to make next ask
      return;
    }

    const game = games[gameId];
    if (!game) {
      // game does not exist
      return;
    }

    if (!game.playing) {
      // game is not being played
      return;
    }

    if (!validateCard(card, game.maxPlayers)) {
      // invalid card
      return;
    }

    const seat = game.players.indexOf(userId);
    if (seat !== game.turn) {
      // not player's turn
      return;
    }

    if (target % 2 === seat % 2) {
      // player and target on same team
      return;
    }

    if (game.hands[seat].has(card)) {
      // player has the card (illegal)
      return;
    }

    // TODO: add card held in half suit check

    if (game.hands[target].has(card)) {
      // target player has card
      // successful ask
      game.hands[target].delete(card);
      game.hands[seat].add(card);
      emitToGame(gameId, "game:play:ask success", card, seat, target);
    } else {
      // target player does not have card
      // unsuccessful ask
      emitToGame(gameId, "game:play:ask fail", card, seat, target);
      emitToGame(gameId, "game:play:transfer", seat, target);
      game.turn = target;
    }

    game.nextAskTime = Date.now() + ASK_DELAY;
  });

  socket.on("game:play:declare", (gameId, declaration) => {
    const game = games[gameId];
    if (!game) {
      // game does not exist
      return;
    }

    if (!game.playing) {
      // game is not being played
      return;
    }

    const seat = game.players.indexOf(userId);
    if (seat === -1) {
      // player not in the game
      return;
    }

    const result = declareSuccess(game.hands, declaration);
    applyDeclare(game.hands, declaration);
    if (result) {
      emitToGame(gameId, "game:play:declare success", declaration, seat);
    } else {
      emitToGame(gameId, "game:play:declare fail", declaration, seat);
    }

    if (game.hands.every((hand) => hand.size === 0)) {
      game.playing = false;
      emitToGame(gameId, "game:play:end"); // let them compute result i guess?
    }
  });

  socket.on("game:play:transfer", (gameId, target) => {
    const game = games[gameId];
    if (!game) {
      // game does not exist
      return;
    }

    if (!game.playing) {
      // game is not being played
      return;
    }

    const seat = game.players.indexOf(userId);
    if (seat !== game.turn) {
      // not player's turn
      return;
    }

    if (game.hands[seat].size > 0) {
      // player still has cards left
      return;
    }

    const team = seat % 2;
    if (target % 2 !== team) {
      if (game.hands.some((v, i) => i % 2 === team && v.size > 0)) {
        // player and target on different teams
        // and player's team has cards left
        return;
      }
    }

    if (game.hands[target].size === 0) {
      // target does not have any cards left
      return;
    }

    emitToGame(gameId, "game:play:transfer", seat, target);
    game.turn = target;
  });

  socket.on("game:play:start", (gameId) => {
    const game = games[gameId];
    if (!game) {
      // game does not exist
      return;
    }

    if (game.playing) {
      // game is already playing
      // no need to continue
      return;
    }

    if (game.host !== userId) {
      // player is not host
      return;
    }

    if (game.players.some((v) => v === "")) {
      // game is not filled
      return;
    }

    game.playing = true;

    game.declared = [];
    game.hands = makeHands(game.maxPlayers);
    game.turn = Math.floor(Math.random() * game.maxPlayers);

    game.players.forEach((playerId, i) => {
      io.to(userId2room(playerId)).emit(
        "game:play:start",
        {
          declared: game.declared,
          hands: game.hands.map((hand) => hand.size),
          turn: game.turn,
        },
        Array.from(game.hands[i]),
        i
      );
    });
  });
};

const registerGameHandlers = (io, socket) => {
  const userId = socket.id;
  const user = users[userId];

  socket.join(userId2room(userId));

  /*
  const leaveAllGames = () => {
    const roomsToLeave = [];
    for (room of socket.rooms) {
      if (/^game:[0-9A-Fa-f]{6}$/.text(room)) {
        roomsToLeave.push(room);
      } else if (room.indexOf("game:") === 0) {
        console.warn(`Room did not match fully: ${room}`)
      }
    }
    for (room of roomsToLeave) {
      socket.leave(room);
    }
  }
  */

  const leaveGame = (assignHost = false) => {
    if (user.gameId) {
      socket.leave(gameId2room(user.gameId));
      const prevGame = games[user.gameId];
      const seat = prevGame.players.indexOf(userId);
      prevGame.players[seat] = "";
      prevGame.names[seat] = "";

      if (prevGame.players.every((v) => v === "")) {
        // no players left
        delete games[user.gameId];
      } else if (assignHost && prevGame.host === userId) {
        // assign new host if player was host
        prevGame.host = prevGame.players.find((element) => element !== "");
      }

      user.gameId = "";
    }
  };

  const joinGame = (gameId) => {
    leaveGame();

    const game = games[gameId];
    const roomName = gameId2room(gameId);
    socket.join(roomName);
    game.players[game.players.indexOf("")] = userId;
    user.gameId = gameId;

    socket.emit(
      "game:join",
      gameId,
      game.maxPlayers,
      game.players.indexOf(userId)
    );

    game.names.forEach((name, seat) => {
      io.to(userId2room(userId)).emit("game:change name", seat, name);
    });
  };

  socket.on("game:create", (maxPlayers) => {
    if (!validateMaxPlayers(maxPlayers)) {
      // invalid number of players
      return;
    }

    try {
      let gameId;
      do {
        gameId = randomBytes(3).toString("hex");
      } while (games[gameId]);

      const game = createGame(gameId, maxPlayers);
      games[gameId] = game;
      joinGame(gameId);
      game.host = userId;
    } catch (err) {
      console.error("An error occurred during game creation", err);
    }
  });

  socket.on("game:join", (gameId) => {
    gameId = gameId.toLowerCase();
    const game = games[gameId];
    if (!game || !game.players.includes("") || game.players.includes(userId)) {
      // game does not exist
      // or game is full
      // or game already has player
      return;
    }

    joinGame(gameId);
  });

  socket.on("game:change name", (gameId, name) => {
    if (typeof name !== "string") {
      // name is not a string
      return;
    }

    if (name.length > NAME_LEN) {
      // name too long
      return;
    }

    const game = games[gameId];
    if (!game) {
      // game does not exist
      return;
    }

    const seat = game.players.indexOf(userId);
    if (seat === -1) {
      // player is not in game
      return;
    }

    game.names[seat] = name;

    socket.to(gameId2room(gameId)).emit("game:change name", seat, name);
  });

  socket.on("game:leave", () => {
    leaveGame(true);
  });
  socket.on("disconnect", (reason) => {
    leaveGame(false);
  });
};

export default (io, socket) => {
  const userId = socket.id;

  users[userId] = createUser(userId);

  registerGameHandlers(io, socket);
  registerPlayHandlers(io, socket);

  //*
  // for debugging
  socket.onAny((event, ...args) => {
    console.log(`Event: "${event}"`, args);
  });
  //*/
};
