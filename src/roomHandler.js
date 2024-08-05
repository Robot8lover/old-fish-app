"use strict";

const gameRooms = {};

const createGameRoom = (roomId, maxPlayers) => {
  return {
    id: roomId,
    players: [],
    maxPlayers,
  };
};

export default (io, socket) => {
  socket.on("room:join", (roomId) => {
    const room = gameRooms[roomId];
    if (room && room.players.length > room.maxPlayers) {
      socket.join(roomId);
      room.players.push();
      room.remainingSeats -= 1;
    }
  });
};