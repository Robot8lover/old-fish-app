const DECKS = {
  6: new Set(new Array(54)),
  8: new Set(new Array(48)),
}

const validateCard = (card, maxPlayers) => {
  return DECKS[maxPlayers].has(card);
};

export { validateCard };