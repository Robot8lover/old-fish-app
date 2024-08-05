import { randomBytes } from "node:crypto";

const testHex = (text) => /^[0-9A-Fa-f]+$/.test(text);

const games = {};
const users = {};

const swapSeats = (gameId, seat1, seat2) => {
  players = games[gameId].players;
  [players[seat1], players[seat2]] = [players[seat2], players[seat1]];
};

const createGame = (gameId, maxPlayers) => {
  return {
    id: gameId,
    players: [],
    turn: -1,
    maxPlayers,
  };
};

const createUser = (userId) => {
  return {
    games: [],
    userId,
  };
};

const registerPlayHandlers = (io, socket) => {
  const userId = socket.id;

  socket.on("game:play:ask", (gameId, card, target) => {
    const game = games[gameId];
    let seat;
    if (!game) {
      return;
    }
      seat = game.players.indexOf(userId);
      if (seat !== game.turn) {
        return;
      }
  });

  socket.on("game:play:declare", (gameId, declaration) => {});

  socket.on("game:play:transfer", (gameId, target) => {});
};

const registerGameHandlers = (io, socket) => {
  const userId = socket.id;

  socket.on("game:create", (maxPlayers) => {
    try {
      let gameId;
      do {
        gameId = randomBytes(3).toString("hex");
      } while (games[gameId]);

      games[gameId] = createGame(gameId, maxPlayers);

      socket.join(`game:${gameId}`);
      game.players.push(userId);

      io.emit("game:create", gameId);
    } catch (err) {
      console.error("An error occurred during game creation", err);
    }
  });

  socket.on("game:join", (gameId) => {
    const game = games[gameId];
    if (
      game &&
      game.players.length > game.maxPlayers &&
      !game.players.includes(userId)
    ) {
      socket.join(`game:${gameId}`);
      game.players.push(userId);
    }
  });
};

export default (io, socket) => {
  const userId = socket.id;

  users[userId] = createUser(userId);
};
