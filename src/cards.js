import { randomInt } from "node:crypto";

const DECKS = {
  6: new Set(new Array(54)),
  8: new Set(new Array(48)),
};

const BASE_DECK = new Array(54);
for (let i = 0; i < 54; i += 1) {
  BASE_DECK[i] = i;
}
DECKS[6] = new Set(BASE_DECK);
DECKS[8] = new Set(BASE_DECK.slice(0, 48));

const validateCard = (card, maxPlayers) => {
  return DECKS[maxPlayers].has(card);
};

const validateMaxPlayers = (maxPlayers) => maxPlayers in DECKS;

const shuffleArray = (original) => {
  // Perform a Fisher-Yates shuffle on an array.
  const arr = original.slice(0); // make a shallow copy
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const makeHands = (maxPlayers) => {
  const deck = shuffleArray(Array.from(DECKS[maxPlayers]));
  const hands = new Array(maxPlayers);
  const deckLen = deck.length;
  for (let i = 0; i < maxPlayers; i += 1) {
    hands[i] = [];
    for (let j = i; j < deckLen; j += maxPlayers) {
      hands[i].push(deck[j]);
    }
  }
  return hands.map((handArr) => new Set(handArr));
};

export { validateCard, validateMaxPlayers, shuffleArray, makeHands };
