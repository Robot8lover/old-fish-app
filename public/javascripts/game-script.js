"use strict";

import ASK_DELAY from "./ASK_DELAY.js";

const onLoad = () => {
  const joinPage = document.getElementById("join-page");
  const gamePage = document.getElementById("game-page");
  const createGameBtn = document.getElementById("create-btn");
  const gameIdInput = document.getElementById("game-id-in");
  const joinGameBtn = document.getElementById("join-btn");

  const socket = io();

  socket.on("game:join", (gameId) => {
    joinPage.classList.add("hidden");
    gamePage.classList.remove("hidden");
    document.getElementById("game-id-span").textContent = gameId;
  });

  createGameBtn.addEventListener(
    "click",
    () => {
      let maxPlayers = 0;
      for (const element of document.getElementsByName("max-players")) {
        if (element.checked) {
          maxPlayers = +element.value;
          break;
        }
      }
      if (maxPlayers === 0) {
        return;
      }
      socket.emit("game:create", maxPlayers);
    },
    false
  );

  joinGameBtn.addEventListener(
    "click",
    () => {
      socket.emit("game:join", gameIdInput.value);
    },
    false
  );

  document.getElementById("leave-btn").addEventListener(
    "click",
    () => {
      socket.emit("game:leave");
      joinPage.classList.remove("hidden");
      gamePage.classList.add("hidden");
      document.getElementById("game-id-span").textContent = "";
    },
    false
  );
};

document.addEventListener("DOMContentLoaded", onLoad, false);
