export default (io, socket, gameRooms) => {
  socket.on("game:join", (roomId) => {
    room = gameRooms[roomId]
    if (room && room.remainingSeats > 0) {
      socket.join(roomId);
      room.players 
      room.remainingSeats -= 1;
    }
  });
};