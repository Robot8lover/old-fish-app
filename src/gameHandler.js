import { randomBytes } from "node:crypto";
import { validateCard } from "./cards"
import ASK_DELAY from "../public/javascripts/ASK_DELAY";

const testHex = (text) => /^[0-9A-Fa-f]+$/.test(text);

const games = {};
const users = {};

const swapSeats = (gameId, seat1, seat2) => {
  players = games[gameId].players;
  [players[seat1], players[seat2]] = [players[seat2], players[seat1]];
};

const gameId2room = (gameId) => (`game:${gameId}`);

const createGame = (gameId, maxPlayers) => {
  return {
    id: gameId,
    players: new Array(maxPlayers),
    turn: -1,
    maxPlayers,
    hands: [],
    nextAskTime: 0,
  };
};

const createUser = (userId) => {
  return {
    gameId: "",
    userId,
  };
};

const registerPlayHandlers = (io, socket) => {
  const userId = socket.id;

  socket.on("game:play:ask", (gameId, card, target) => {
    const time = Date.now();
    if (game.nextAskTime > time) {
      // must wait to make next ask
      return;
    }

    const game = games[gameId];
    if (!game) {
      // game does not exist
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

    if ((target % 2) === (seat % 2)) {
      // player and target on same team
      return;
    }

    if (game.hands[seat].has(card)) {
      // player has the card (illegal)
      return;
    }

    if (game.hands[target].has(card)) {
      // target player has card
      // successful ask
      game.hands[target].delete(card);
      game.hands[seat].add(card);
      socket.to(gameId2room(gameId)).emit("game:play:ask success", card, seat, target);
    } else {
      // target player does not have card
      // unsuccessful ask
      socket.to(gameId2room(gameId)).emit("game:play:ask fail", card, seat, target);
    }

    game.nextAskTime = time + ASK_DELAY;
  });

  socket.on("game:play:declare", (gameId, declaration) => {});

  socket.on("game:play:transfer", (gameId, target) => {});
};

const registerGameHandlers = (io, socket) => {
  const userId = socket.id;
  const user = users[userId];

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

  const joinGame = (gameId) => {
    if (user.gameId) {
      socket.leave(gameId2room(user.gameId));
      const prevGame = games[user.gameId];
      prevGame.players[prevGame.players.indexOf(userId)] = undefined;
    }
    const game = games[gameId];
    socket.join(gameId2room(gameId));
    game.players[game.players.indexOf(undefined)] = userId;
    user.gameId = gameId;
  }

  socket.on("game:create", (maxPlayers) => {
    try {
      let gameId;
      do {
        gameId = randomBytes(3).toString("hex");
      } while (games[gameId]);

      games[gameId] = createGame(gameId, maxPlayers);

      joinGame(gameId);

      io.emit("game:create", gameId);
    } catch (err) {
      console.error("An error occurred during game creation", err);
    }
  });

  socket.on("game:join", (gameId) => {
    const game = games[gameId];
    if (
      game &&
      game.players.includes(undefined) &&
      !game.players.includes(userId)
    ) {
      joinGame(gameId);
    }
  });
};

export default (io, socket) => {
  const userId = socket.id;

  users[userId] = createUser(userId);

  registerGameHandlers(io, socket);
  registerPlayHandlers(io, socket);
};
