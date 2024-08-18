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

const validateCardRequest = (card, hand) => {
  if (hand.has(card)) {
    // Hand has the card (illegal ask).
    return false;
  }

  // Check if hand has a card in the half-suit.
  const base = card - (card % 6);
  return [0, 1, 2, 3, 4, 5].some((offset) => hand.has(base + offset));
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

const validateDeclare = (game, declaration) => {
  if (
    typeof declaration.halfSet !== "number" ||
    !Array.isArray(declaration.declares) ||
    declaration.declares.length === 6
  ) {
    return false;
  }

  const team = declaration.declares[0] % 2;
  if (
    declaration.halfSet < 0 ||
    declaration.halfSet >= DECKS[game.maxPlayers].size ||
    declaration.declares.some(
      (seat) => seat < 0 || seat >= game.maxPlayers || seat % 2 !== team
    )
  ) {
    return false;
  }

  return true;
};

const declareSuccess = (hands, declaration) => {
  for (let i = 0; i < 6; i += 1) {
    const card = 6 * declaration.halfSet + i;
    const seat = declaration.declares[i];
    if (!hands[seat].has(card)) {
      return false;
    }
  }
  return true;
};

const applyDeclare = (hands, declaration) => {
  [0, 1, 2, 3, 4, 5]
    .map((offset) => 6 * declaration.halfSet + offset)
    .forEach((card) => {
      hands.forEach((hand) => hand.delete(card));
    });
};

const gameOver = (game) =>
  game.declared[0].length + game.declared[1].length >
  DECKS[game.maxPlayers].size / 6 / 2;

export {
  validateCard,
  validateCardRequest,
  validateMaxPlayers,
  shuffleArray,
  makeHands,
  validateDeclare,
  declareSuccess,
  applyDeclare,
  gameOver,
};
