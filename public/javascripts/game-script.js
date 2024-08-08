"use strict";

import { ASK_DELAY, NAME_LEN } from "../shared_js/constants.js";

const onLoad = () => {
  const joinPage = document.getElementById("join-page");
  const gamePage = document.getElementById("game-page");
  const gameIdInput = document.getElementById("game-id-in");
  const createGameForm = document.getElementById("create-form");
  const joinGameForm = document.getElementById("join-form");
  const playerSelf = document.getElementById("player-self");
  const selfName = document.getElementById("self-name");
  const startBtn = document.getElementById("start-btn");

  const socket = io();

  const createGame = (maxPlayers) => ({
    gameId: "",
    maxPlayers: 0,
    declared: [],
    handCounts: new Array(maxPlayers).fill(0),
    seat: -1,
    hand: null,
    turn: -1,
  });

  let game = createGame(0);
  let host = false;
  let players = [""];

  const escapeHtml = (() => {
    const MAP = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return (text, replaceWhitespace = false) => {
      if (replaceWhitespace) {
        return text.replace(/\s/g, " ").replace(/[&<>"']/g, (m) => MAP[m]);
      } else {
        return text.replace(/[&<>"']/g, (m) => MAP[m]);
      }
    };
  })();

  const convertSeatPos = (pos) =>
    (pos + game.maxPlayers - game.seat) % game.maxPlayers;
  const unconvertSeatPos = (pos) => (pos + game.seat) % game.maxPlayers;

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
    game.gameId = gameId;
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
      host = true;
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
      host = false;
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

  const drawDeclared = () => {};
  const drawHands = () => {};
  const drawSelfHand = () => {};
  const drawTurn = () => {};

  socket.on(
    "game:play:start",
    ({ declared, hands: handCounts, turn }, hand) => {
      startBtn.classList.add("hidden");

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

  startBtn.addEventListener("click", () => {
    socket.emit("game:play:start", game.gameId);
  });

  const drawResult = () => {};

  socket.on("game:play:end", () => {
    drawResult();
  });

  socket.on("game:play:change name", (seat, name) => {
    if (seat === game.seat) {
      // self name so do not make an update
      return;
    }
    players[convertSeatPos(seat)].getElementsByClassName(
      "player-name"
    )[0].textContent = escapeHtml(name, true);
    // FIXME: We do not need to escape if we use escapeHTML.
    // FIXME: Possibly still add support for whitespace stuff.
  });

  selfName.maxLength = NAME_LEN;
  selfName.addEventListener(
    "change",
    () => {
      socket.emit("game:play:change name", game.gameId, selfName.value);
    },
    false
  );

  /*
  // for debugging
  socket.onAny((event, ...args) => {
    console.log(`Event "${event}"`, args);
  });
  //*/
};

document.addEventListener("DOMContentLoaded", onLoad, false);
