"use strict";

import ASK_DELAY from "../shared_js/ASK_DELAY.js";

const onLoad = () => {
  const joinPage = document.getElementById("join-page");
  const gamePage = document.getElementById("game-page");
  const createGameBtn = document.getElementById("create-btn");
  const gameIdInput = document.getElementById("game-id-in");
  const joinGameBtn = document.getElementById("join-btn");

  const socket = io();

  let game = null;

  const createGame = (maxPlayers) => ({
    declared: [],
    handCounts: new Array(maxPlayers).fill(0),
    names: new Array(maxPlayers).fill(""),
    seat: -1,
    hand: null,
    turn: -1,
  });

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

  const setSeat = (seat) => {
    game.seat = seat;
  };

  const addDeclared = (halfSuit) => {
    game.declared.push(halfSuit);
  };

  const setHandCount = (count, position) => {
    game.handCounts[position] = count;
  };

  const setName = (name, position) => {
    game.names[position] = name;
  };

  const setTurn = (turn) => {
    game.turn = turn;
  };

  const setHand = (hand) => {
    game.hand = hand;
  };

  const drawPlayers = () => {};

  socket.on(
    "game:play:start",
    ({ declared, hands: handCounts, maxPlayers, names, turn }, hand, seat) => {
      game = createGame(maxPlayers);
      setSeat(seat);
      setHand(hand);
      declared.forEach(addDeclared);
      handCounts.forEach(setHandCount);
      names.forEach(setName);
      setTurn(turn);

      drawPlayers();
    }
  );
};

document.addEventListener("DOMContentLoaded", onLoad, false);
