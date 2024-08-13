"use strict";

import { ASK_DELAY, NAME_LEN } from "../shared_js/constants.js";
import dialogPolyfill from "/dialog-polyfill.esm.js";

const Enum = (arr) =>
  arr.reduce(
    (acc, val) => ({
      ...acc,
      [val]: val,
    }),
    Object.create(null)
  );

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
  const declareBtn = document.getElementById("declare-btn");
  const requestBtn = document.getElementById("request-btn");
  const transferBtn = document.getElementById("transfer-btn");
  const askAskerDiv = document.getElementById("ask-asker");
  const askTargetDiv = document.getElementById("ask-target");
  const askCardDiv = document.getElementById("ask-card");
  const askResultDiv = document.getElementById("ask-result");
  const askDialog = document.getElementById("ask-dialog");
  const askOptions = document.getElementById("ask-options");
  const closeAskDialogBtn = document.getElementById("close-ask-dialog");
  const selfCards = document.getElementById("self-cards");

  dialogPolyfill.registerDialog(askDialog);

  const socket = io();

  const MODES = Enum([
    "NORMAL",
    "DECLARE",
    "SELECT_CARD",
    "REQUEST",
    "TRANSFER",
  ]);

  const modeObj = (() => {
    let mode = MODES.NORMAL;

    const listeners = [];
    const addListener = (listener) => {
      listeners.push(listener);
    };
    const removeListener = (listener) => {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
        return true;
      } else {
        return false;
      }
    };

    const setMode = (newMode) => {
      const oldMode = mode;
      mode = newMode;
      for (const func of listeners) {
        func(oldMode, newMode);
      }
    };

    const getMode = () => mode;

    const resetMode = () => {
      setMode(MODES.NORMAL);
    };

    const reset = () => {
      listeners.splice(0);
      resetMode();
    };

    return {
      addListener,
      removeListener,
      getMode,
      setMode,
      resetMode,
      reset,
    };
  })();

  const createGame = (maxPlayers) => ({
    gameId: "",
    maxPlayers: maxPlayers,
    declared: [],
    handCounts: new Array(maxPlayers).fill(0),
    seat: -1,
    hand: [],
    turn: -1,
    names: [],
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
    document.querySelectorAll(".player-turn").forEach((element) => {
      element.classList.add("hidden");
    });

    document.querySelectorAll(".player-cards").forEach((element) => {
      element.innerHTML = "";
    });

    askAskerDiv.innerHTML = "";
    askTargetDiv.innerHTML = "";
    askCardDiv.innerHTML = "";
    askResultDiv.classList.remove("success", "failure");

    if (host) {
      startBtn.classList.remove("hidden");
    }

    declareBtn.classList.add("vis-hidden");
    requestBtn.classList.add("vis-hidden");
    transferBtn.classList.add("vis-hidden");
  };

  const resetAll = () => {
    resetGame();

    Array.prototype.forEach.call(
      document.getElementsByClassName("player"),
      (element, index) => {
        element.classList.add("hidden");
        element.classList.remove("ally", "opp");
        element.onclick = undefined;
      }
    );

    document.querySelectorAll("span.player-name").forEach((element) => {
      element.textContent = "";
    });
  };

  const createDeclarer = (halfSet) => ({
    halfSet,
    declares: Object.create(null),
    addCard(card, seat) {
      if (
        !(selectedCard in this.declares) &&
        card - (card % 6) === this.halfSet * 6
      ) {
        this.declares[card] = seat;
      }
    },
  });

  let selectedCard = -1;
  let declareObj = createDeclarer(-1);

  const onClickPlayer = (index) => {
    // function factory
    const seat = unconvertSeatPos(index);
    return (event) => {
      switch (modeObj.getMode()) {
        case MODES.DECLARE:
          if (selectedCard !== -1 && index % 2 === 0) {
            declareObj.addCard(selectedCard, seat);
            selectedCard = -1;
          }
          break;
        case MODES.REQUEST:
          if (selectedCard !== -1 && index % 2 === 1) {
            socket.emit("game:play:ask", game.gameId, selectedCard, seat);
            selectedCard = -1;
          }
          break;
        case MODES.TRANSFER:
          if (
            game.handCounts[seat] > 0 &&
            (index % 2 === 0 ||
              game.handCounts.every((v, i) => i % 2 === 0 || v > 0))
          ) {
            socket.emit("game:play:transfer", game.gameId, seat);
          }
          break;
        default:
          return;
      }
      event.stopPropagation();
    };
  };

  const onClickWindow = (event) => {
    // actual event listener
    modeObj.resetMode();
    selectedCard = -1;
  };

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

  const HALF_SETS = CARD_MAP.reduce((acc, val, ind, arr) => {
    if (ind % 6 !== 0) {
      return acc;
    }

    return acc.concat([arr.slice(ind, ind + 6)]);
  }, []);

  const NUM_HALF_SETS = {
    6: 9,
    8: 8,
  };

  const cardStrToDiv = (cardStr) => `<div class="card card-${cardStr}"></div>`;

  const convertSeatPos = (pos) =>
    (pos + game.maxPlayers - game.seat) % game.maxPlayers;
  const unconvertSeatPos = (pos) => (pos + game.seat) % game.maxPlayers;

  const drawPlayers = () => {
    players = document.getElementsByClassName(`player-${game.maxPlayers}`);
    Array.prototype.forEach.call(players, (element, index) => {
      element.classList.remove("hidden");
      element.classList.add(index % 2 === 0 ? "ally" : "opp");

      element.onclick = onClickPlayer(index);
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

    window.addEventListener("click", onClickWindow, false);
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

      window.removeEventListener("click", onClickWindow, false);
    },
    false
  );

  document.getElementById("close-ask-dialog").addEventListener(
    "click",
    () => {
      askDialog.close();
    },
    false
  );

  declareBtn.addEventListener("click", (event) => {
    const mode = modeObj.getMode();
    if (mode === MODES.NORMAL) {
      // Do something
      modeObj.setMode("DECLARE");
    } else if (mode === MODES.DECLARE && Object.keys(declareObj).length === 6) {
      socket.emit("game:play:declare", game.gameId, declareObj);
      modeObj.resetMode();
    }
    event.stopPropagation();
  });

  requestBtn.addEventListener("click", (event) => {
    if (modeObj.getMode() === MODES.NORMAL) {
      modeObj.setMode(MODES.SELECT_CARD);
      event.stopPropagation();
    }
  });

  transferBtn.addEventListener("click", (event) => {
    if (modeObj.getMode() === MODES.NORMAL) {
      modeObj.setMode(MODES.TRANSFER);
    }
    event.stopPropagation();
  });

  const addDeclared = (halfSet) => {
    game.declared.push(halfSet);
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

  const drawDeclareArea = () => {
    // FIXME: Make them actually visible rather than crammed together.
    /*declareArea.innerHTML = "";
    for (const halfSet of HALF_SETS.slice(0, NUM_HALF_SETS[game.maxPlayers])) {
      const element = document.createElement("div");
      element.className = "half-set";
      for (const cardStr of halfSet) {
        element.innerHTML += cardStrToDiv(cardStr);
      }
      declareArea.appendChild(element);
    }*/
  };

  const drawHands = () => {
    game.handCounts.forEach((count, seat) => {
      const index = convertSeatPos(seat);
      if (index === 0) {
        // self
        return;
      }

      players[index].querySelector(".player-cards").innerHTML = `${"".padStart(
        count * CARD_BACK.length,
        CARD_BACK
      )}`;
    });
  };

  const drawSelfHand = () => {
    // TODO: implement sorting that separates half suits and same color suits
    game.hand.sort((a, b) => b - a);
    players[0].querySelector(".player-cards").innerHTML = game.hand
      .map((card) => cardStrToDiv(CARD_MAP[card]))
      .join("");

    const cards = selfCards.querySelectorAll(".card");
    cards.forEach((element, i) => {
      element.addEventListener("click", (event) => {
        if (
          game.turn !== game.seat ||
          modeObj.getMode() !== MODES.SELECT_CARD
        ) {
          return;
        }

        event.stopPropagation();

        modeObj.resetMode();
        selectedCard = -1;

        // I'm a little worried about the implicit requirement here
        // that the hand and elements must match order.
        const halfSetBase = game.hand[i] - (game.hand[i] % 6);
        const halfSet = [0, 1, 2, 3, 4, 5]
          .map((offset) => halfSetBase + offset)
          .filter((card) => !game.hand.includes(card));
        askOptions.innerHTML = halfSet
          .map((card) => cardStrToDiv(CARD_MAP[card]))
          .join("");
        askOptions.querySelectorAll(".card").forEach((askCardElement, j) => {
          askCardElement.addEventListener(
            "click",
            (askCardClickEvent) => {
              askCardClickEvent.stopPropagation();
              selectedCard = halfSet[j];
              modeObj.setMode(MODES.REQUEST);
              askDialog.close();
            },
            false
          );
        });
        askDialog.showModal();
      });
    }, false);
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

  socket.on("game:play:start", ({ declared, handCounts, turn }, hand) => {
    startBtn.classList.add("hidden");

    declareBtn.classList.remove("vis-hidden");

    setHand(hand);
    drawDeclareArea();
    if (declared) {
      declared.forEach(addDeclared);
    }
    handCounts.forEach(setHandCount);
    setTurn(turn);

    drawHands();
    drawSelfHand();
    drawTurn();
  });

  startBtn.addEventListener("click", () => {
    socket.emit("game:play:start", game.gameId);
  });

  const drawResult = () => {};

  socket.on("game:play:end", () => {
    drawResult();
  });

  socket.on("game:change name", (seat, name) => {
    game.names[seat] = name;
    if (seat === game.seat) {
      // self name so do not make an update
      return;
    }
    players[convertSeatPos(seat)].querySelector(".player-name").textContent =
      name; // This will be escaped I think.
  });

  const changeMyName = () => {
    socket.emit("game:change name", game.gameId, selfName.value);
  };
  selfName.maxLength = NAME_LEN;
  selfName.addEventListener("change", changeMyName, false);

  const drawAsk = (card, seat, target, result) => {
    askAskerDiv.textContent = `${game.names[seat]} (${convertSeatPos(seat)})`;
    askTargetDiv.textContent = `${game.names[target]} (${convertSeatPos(
      target
    )})`;
    askCardDiv.innerHTML = cardStrToDiv(CARD_MAP[card]);
    askResultDiv.classList.remove("success", "failure");
    askResultDiv.classList.add(result ? "success" : "failure");
  };

  socket.on("game:play:ask success", (card, seat, target) => {
    drawAsk(card, seat, target, true);
  });
  socket.on("game:play:ask fail", (card, seat, target) => {
    drawAsk(card, seat, target, false);
  });

  socket.on("game:play:transfer", (seat, target) => {
    setTurn(target);
    drawTurn();

    if (game.turn === game.seat) {
      requestBtn.classList.remove("vis-hidden");
    } else {
      requestBtn.classList.add("vis-hidden");
    }
  });

  //*
  // for debugging
  socket.onAny((event, ...args) => {
    console.log(`Event: "${event}"`, args);
  });
  //*/
};

document.addEventListener("DOMContentLoaded", onLoad, false);
