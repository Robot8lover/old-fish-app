"use strict";

import { ASK_DELAY, NAME_LEN } from "../shared_js/constants.js";

const onLoad = () => {
  const joinPage = document.getElementById("join-page");
  const gamePage = document.getElementById("game-page");
  const gameIdInput = document.getElementById("game-id-in");
  const createGameForm = document.getElementById("create-form");
  const joinGameForm = document.getElementById("join-form");
  const playerSelf = document.getElementById("player-self");
  let players = null;

  const socket = io();

  let game = null;

  const createGame = (maxPlayers) => ({
    maxPlayers: 0,
    declared: [],
    handCounts: new Array(maxPlayers).fill(0),
    names: new Array(maxPlayers).fill(""),
    seat: -1,
    hand: null,
    turn: -1,
  });

  const convertSeatPos = (pos) => (pos + maxPlayers - seat) % maxPlayers;

  const drawPlayers = () => {};

  socket.on("game:join", (gameId, maxPlayers, seat) => {
    joinPage.classList.add("hidden");
    gamePage.classList.remove("hidden");
    document.getElementById("game-id-span").textContent = gameId;
    Array.prototype.forEach.call(
      document.getElementsByClassName("player"),
      (element) => {
        element.classList.add("hidden");
      }
    );
    (players = document.getElementsByClassName(`player-${maxPlayers}`)),
      Array.prototype.forEach.call(players, (element) => {
        element.classList.remove("hidden");
      });

    game = createGame(maxPlayers);
    game.maxPlayers = maxPlayers;
    game.seat = seat;

    drawPlayers();
  });

  createGameForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      /*
      let maxPlayers = 0;
      for (const element of document.getElementsByName("max-players")) {
        if (element.checked) {
          maxPlayers = +element.value;
          break;
        }
      }
      */
      const maxPlayers = +createGameForm.elements["max-players"].value;
      if (maxPlayers === 0) {
        return;
      }

      socket.emit("game:create", maxPlayers);
      Array.prototype.forEach.call(
        document.getElementsByClassName("host"),
        (element) => {
          element.classList.remove("hidden");
        }
      );
    },
    false
  );

  joinGameForm.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      socket.emit("game:join", gameIdInput.value);
      Array.prototype.forEach.call(
        document.getElementsByClassName("host"),
        (element) => {
          element.classList.add("hidden");
        }
      );
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

  const addDeclared = (halfSuit) => {
    game.declared.push(halfSuit);
  };

  const setHandCount = (count, position) => {
    game.handCounts[position] = count;
  };

  const setTurn = (turn) => {
    game.turn = turn;
  };

  const setHand = (hand) => {
    game.hand = hand;
  };


  const drawHands = () => {};
  const drawSelfHand = () => {};
  const drawTurn = () => {};

  socket.on(
    "game:play:start",
    ({ declared, hands: handCounts, turn }, hand) => {
      setHand(hand);
      if (declared) {
        declared.forEach(addDeclared);
        drawDeclared();
      }
      handCounts.forEach(setHandCount);
      setTurn(turn);

      drawHands();
      drawSelfHand();
      drawTurn();
    }
  );

  const drawEnd = () => {};

  socket.on("game:play:end", () => {
    drawResult();
  });
};

document.addEventListener("DOMContentLoaded", onLoad, false);
