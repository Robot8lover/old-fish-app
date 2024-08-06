const onLoad = () => {
  const createGameBtn = document.getElementById("create-game");
  const gameIdInput = document.getElementById("game-id");
  const joinGameBtn = document.getElementById("join-game");

  const socket = io();

  createGameBtn.addEventListener("click", () => {
    let maxPlayers = 0;
    for (element of documents.getElementsByName("max-players")) {
      if (element.checked) {
        maxPlayers = +element.value;
        break;
      }
    }
    if (maxPlayers === 0) {
      return;
    }
    socket.emit("game:create", maxPlayers);
  }, false);
  joinGameBtn.addEventListener("click", () => {}, false);
};

document.addEventListener("DOMContentLoaded", onLoad, false);
