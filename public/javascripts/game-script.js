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
  const actionArea = document.getElementById("action-area");
  const playArea = document.getElementById("play-area");
  const declareArea = document.getElementById("declare-area");

  const socket = io();

  const createGame = (maxPlayers) => ({
    gameId: "",
    maxPlayers: maxPlayers,
    declared: [],
    handCounts: new Array(maxPlayers).fill(0),
    seat: -1,
    hand: new Set(),
    turn: -1,
  });

  let game = createGame(0);
  let host = false;
  let players = document.getElementsByClassName("player");

  const resetGame = () => {
    const oldGame = game;
    game = createGame(oldGame.maxPlayers);
    game.gameId = oldGame.gameId;
    game.seat = oldGame.seat;

    declareArea.innerHTML = "";
    playArea.innerHTML = "";
    Array.prototype.forEach.call(actionArea.children, (child) => {
      child.classList.add("hidden");
    });
    document.querySelectorAll(".player-turn").forEach((element) => {
      element.classList.add("hidden");
    });

    document.querySelectorAll(".player-cards").forEach((element) => {
      element.innerHTML = "";
    });

    if (host) {
      startBtn.classList.remove("hidden");
    }
  };

  const resetAll = () => {
    resetGame();

    Array.prototype.forEach.call(
      document.getElementsByClassName("player"),
      (element) => {
        element.classList.add("hidden");
        element.classList.remove("ally", "opp");
      }
    );

    document.querySelectorAll("span.player-name").forEach((element) => {
      element.textContent = "";
    });
  };

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

  const CARD_BACK = '<div class="card card-back-blue"></div>';

  const CARD_MAP = [
    "S2",
    "S3",
    "S4",
    "S5",
    "S6",
    "S7",
    "S8",
    "S9",
    "ST",
    "SJ",
    "SQ",
    "SK",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "H7",
    "H8",
    "H9",
    "HT",
    "HJ",
    "HQ",
    "HK",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "D7",
    "D8",
    "D9",
    "DT",
    "DJ",
    "DQ",
    "DK",
    "C2",
    "C3",
    "C4",
    "C5",
    "C6",
    "C7",
    "C8",
    "C9",
    "CT",
    "CJ",
    "CQ",
    "CK",
    "SA",
    "HA",
    "DA",
    "CA",
    "BO",
    "RO",
  ];

  const convertSeatPos = (pos) =>
    (pos + game.maxPlayers - game.seat) % game.maxPlayers;
  const unconvertSeatPos = (pos) => (pos + game.seat) % game.maxPlayers;

  const drawPlayers = () => {
    players = document.getElementsByClassName(`player-${game.maxPlayers}`);
    Array.prototype.forEach.call(players, (element, index) => {
      element.classList.remove("hidden");
      element.classList.add(index % 2 === 0 ? "ally" : "opp");
    });
  };

  socket.on("game:join", (gameId, maxPlayers, seat) => {
    joinPage.classList.add("hidden");
    gamePage.classList.remove("hidden");
    document.getElementById("game-id-span").textContent = gameId;

    resetAll();

    game = createGame(maxPlayers);
    game.gameId = gameId;
    game.maxPlayers = maxPlayers;
    game.seat = seat;

    drawPlayers();

    changeMyName();
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
  const drawHands = () => {
    game.handCounts.forEach((count, seat) => {
      const index = convertSeatPos(seat);
      if (index === 0) {
        // self
        return;
      }

      // FIXME: Make this better, use card backs.
      players[index].querySelector(".player-cards").innerHTML = `${"".padStart(
        count * CARD_BACK.length,
        CARD_BACK
      )}`;
    });
  };
  const drawSelfHand = () => {
    // FIXME: Make this better, use card faces.
    players[0].querySelector(".player-cards").innerHTML = Array.from(game.hand)
      .map((card) => `<div class="card card-${CARD_MAP[card]}"></div>`)
      .join("");
  };
  const drawTurn = () => {
    const turn = convertSeatPos(game.turn);
    Array.prototype.forEach.call(players, (player, index) => {
      const turnElement = player.querySelector(".player-turn");
      if (index === turn) {
        turnElement.classList.remove("hidden");
      } else {
        turnElement.classList.add("hidden");
      }
    });
  };

  socket.on(
    "game:play:start",
    ({ declared, hands: handCounts, turn }, handArr) => {
      startBtn.classList.add("hidden");

      const hand = new Set(handArr);

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

  socket.on("game:change name", (seat, name) => {
    if (seat === game.seat) {
      // self name so do not make an update
      return;
    }
    players[convertSeatPos(seat)].querySelector(".player-name").textContent =
      name; // This should be escaped I think.
  });

  const changeMyName = () => {
    socket.emit("game:change name", game.gameId, selfName.value);
  };
  selfName.maxLength = NAME_LEN;
  selfName.addEventListener("change", changeMyName, false);

  socket.on("game:play:ask success", (card, seat, target) => {
    playArea.innerHTML = `${game.names[seat]} (${convertSeatPos(
      seat
    )}) successfully requested ${card} from ${
      game.names[target]
    } (${convertSeatPos(target)})`;
  });
  socket.on("game:play:ask fail", (card, seat, target) => {
    playArea.innerHTML = `${game.names[seat]} (${convertSeatPos(
      seat
    )}) unsuccessfully requested ${card} from ${
      game.names[target]
    } (${convertSeatPos(target)})`;
  });

  socket.on("game:play:transfer", (seat, target) => {
    setTurn(target);
    drawTurn();
  });

  /*
  // for debugging
  socket.onAny((event, ...args) => {
    console.log(`Event: "${event}"`, args);
  });
  //*/
};

document.addEventListener("DOMContentLoaded", onLoad, false);
