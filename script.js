const MAX_TURNS = 6;
const state = {
  wordLength: 5,
  wins: 0,
  turnsUsed: 0,
  guesses: [],
  incorrect: [],
  misplaced: [],
  isGameOver: false,
  maxTurns: MAX_TURNS,
  letterStatus: {}
};

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const guessInput = document.getElementById('guessInput');
const guessBtn = document.getElementById('guessBtn');
const newGameBtn = document.getElementById('newGameBtn');
const wordLengthValue = document.getElementById('wordLengthValue');
const turnsLeftValue = document.getElementById('turnsLeftValue');
const scoreValue = document.getElementById('scoreValue');
const incorrectListEl = document.getElementById('incorrectList');
const misplacedListEl = document.getElementById('misplacedList');
const keyboardEl = document.getElementById('keyboard');

const activeBoardState = {
  currentRow: 0,
  currentCol: 0,
  boardLetters: []
};

const keyboardRows = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm'
];

function updateLetterStatus() {
  const nextState = {};

  for (const guess of state.guesses) {
    for (let index = 0; index < guess.value.length; index += 1) {
      const letter = guess.value[index];
      const status = guess.result[index];
      const current = nextState[letter];

      if (
        !current ||
        status === 'correct' ||
        (current === 'wrong' && status === 'misplaced') ||
        (current === 'wrong' && status === 'correct') ||
        (current === 'misplaced' && status === 'correct')
      ) {
        nextState[letter] = status;
      }
    }
  }

  state.letterStatus = nextState;
}

function renderKeyboard() {
  if (!keyboardEl) {
    return;
  }

  keyboardEl.innerHTML = '';
  keyboardEl.style.display = 'none';
}

function updateStats() {
  wordLengthValue.textContent = `${state.wordLength} letters`;
  turnsLeftValue.textContent = `${Math.max(0, state.maxTurns - state.turnsUsed)} turns left`;
  scoreValue.textContent = `${state.wins}`;
  renderLetters(state.incorrect, incorrectListEl);
  renderLetters(state.misplaced, misplacedListEl);
}

function renderLetters(items, element) {
  if (!items.length) {
    element.innerHTML = '<span class="empty">None yet</span>';
    return;
  }

  element.innerHTML = `<div class="badges">${items.map((letter) => `<span class="badge">${letter}</span>`).join('')}</div>`;
}

function renderBoard() {
  const visibleRows = Math.min(state.maxTurns, Math.max(1, state.turnsUsed + 1));
  const rows = [];

  for (let rowIndex = 0; rowIndex < visibleRows; rowIndex += 1) {
    const cells = [];
    const rowLetters = activeBoardState.boardLetters[rowIndex] || [];

    for (let colIndex = 0; colIndex < state.wordLength; colIndex += 1) {
      const row = state.guesses[rowIndex];
      const letter = row?.value?.[colIndex] || rowLetters[colIndex] || '';
      const className = row?.result?.[colIndex] || (letter ? 'filled' : '');

      const isActiveCell = rowIndex === activeBoardState.currentRow && colIndex === activeBoardState.currentCol && !row;
      const cellClass = isActiveCell ? `cell active ${className} filled` : `cell ${className}`;

      if (isActiveCell) {
        cells.push(`<div class="${cellClass}" data-row="${rowIndex}" data-col="${colIndex}">${letter || ''}</div>`);
      } else {
        cells.push(`<div class="${cellClass}" data-row="${rowIndex}" data-col="${colIndex}">${letter}</div>`);
      }
    }

    rows.push(`<div class="row" style="--columns:${state.wordLength}">${cells.join('')}</div>`);
  }

  boardEl.innerHTML = rows.join('');

  boardEl.querySelectorAll('.cell').forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    cell.addEventListener('click', () => {
      if (state.isGameOver) {
        return;
      }
      activeBoardState.currentRow = row;
      activeBoardState.currentCol = Math.min(col, state.wordLength - 1);
      guessInput.value = getCurrentGuessString();
      renderBoard();
    });

    if (row === activeBoardState.currentRow && col === activeBoardState.currentCol && !state.isGameOver) {
      cell.setAttribute('tabindex', '0');
      cell.focus();
    }
  });
}

function getCurrentGuessString() {
  const rowLetters = activeBoardState.boardLetters[activeBoardState.currentRow] || [];
  return rowLetters.join('').slice(0, state.wordLength);
}

function ensureCurrentRowLength() {
  const rowIndex = activeBoardState.currentRow;
  if (!activeBoardState.boardLetters[rowIndex]) {
    activeBoardState.boardLetters[rowIndex] = Array(state.wordLength).fill('');
  }

  while (activeBoardState.boardLetters[rowIndex].length < state.wordLength) {
    activeBoardState.boardLetters[rowIndex].push('');
  }

  activeBoardState.boardLetters[rowIndex] = activeBoardState.boardLetters[rowIndex].slice(0, state.wordLength);
}

function updateActiveRowFromInput() {
  const value = (guessInput.value || '').trim().toLowerCase();
  const letters = Array.from({ length: state.wordLength }, (_, index) => value[index] || '');
  activeBoardState.boardLetters[activeBoardState.currentRow] = letters;
  activeBoardState.currentCol = Math.min(value.length, state.wordLength - 1);
  renderBoard();
}

function typeLetterIntoBoard(letter) {
  if (state.isGameOver) {
    return;
  }

  ensureCurrentRowLength();
  const rowLetters = activeBoardState.boardLetters[activeBoardState.currentRow];
  const selectedIndex = activeBoardState.currentCol;

  rowLetters[selectedIndex] = letter;

  if (selectedIndex < state.wordLength - 1) {
    activeBoardState.currentCol += 1;
  }

  guessInput.value = rowLetters.join('');
  renderBoard();
}

function deleteLetterFromBoard() {
  if (state.isGameOver) {
    return;
  }

  ensureCurrentRowLength();
  const rowLetters = activeBoardState.boardLetters[activeBoardState.currentRow];
  const selectedIndex = activeBoardState.currentCol;

  rowLetters[selectedIndex] = '';
  if (selectedIndex > 0) {
    activeBoardState.currentCol -= 1;
  }

  guessInput.value = rowLetters.join('');
  renderBoard();
}

async function startGame() {
  state.guesses = [];
  state.incorrect = [];
  state.misplaced = [];
  state.turnsUsed = 0;
  state.isGameOver = false;
  state.letterStatus = {};
  activeBoardState.currentRow = 0;
  activeBoardState.currentCol = 0;
  activeBoardState.boardLetters = [];

  const response = await fetch('/api/new-game', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word_length: state.wordLength })
  });

  const data = await response.json();
  guessInput.disabled = false;
  guessInput.value = '';
  guessInput.maxLength = state.wordLength;
  guessInput.placeholder = `Enter a ${state.wordLength}-letter word`;
  guessInput.style.display = 'none';
  guessBtn.style.display = 'none';
  updateStats();
  renderBoard();
  renderKeyboard();
  statusEl.textContent = `Welcome to Word Guessing! Guess a ${state.wordLength}-letter word.`;

  if (!data.word_length) {
    statusEl.textContent = 'Could not start a new game.';
  }
}

async function handleGuess() {
  if (state.isGameOver) {
    return;
  }

  const guess = getCurrentGuessString();
  if (!guess) {
    statusEl.textContent = 'Please enter a word before submitting.';
    return;
  }

  if (guess === 'stop') {
    state.isGameOver = true;
    guessInput.disabled = true;
    statusEl.textContent = 'Game stopped. Press New Game to play again.';
    return;
  }

  if (guess.length !== state.wordLength || !/^[a-z]+$/.test(guess)) {
    statusEl.textContent = `Please enter a ${state.wordLength}-letter word using only letters.`;
    return;
  }

  const response = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guess })
  });

  const data = await response.json();

  if (!response.ok) {
    statusEl.textContent = data.message || 'There was a problem with that guess.';
    return;
  }

  state.guesses = data.guesses;
  state.turnsUsed = data.turns_used;
  state.incorrect = data.incorrect || [];
  state.misplaced = data.misplaced || [];
  updateLetterStatus();
  updateStats();

  if (state.turnsUsed > activeBoardState.currentRow) {
    activeBoardState.currentRow = state.turnsUsed;
    activeBoardState.currentCol = 0;
  }

  if (state.turnsUsed < state.maxTurns) {
    activeBoardState.boardLetters[state.turnsUsed] = [];
  }

  renderBoard();
  renderKeyboard();
  guessInput.value = '';

  if (data.won) {
    state.wins += 1;
    state.isGameOver = true;
    guessInput.disabled = true;
    statusEl.textContent = `Congratulations! You guessed it. Next round will use ${state.wordLength + 1} letters.`;
    updateStats();
    setTimeout(() => {
      state.wordLength += 1;
      startGame();
    }, 1200);
    return;
  }

  if (data.game_over) {
    state.isGameOver = true;
    guessInput.disabled = true;
    statusEl.textContent = `Game over! The word was: ${data.answer?.toUpperCase()}`;
    return;
  }

  statusEl.textContent = `Misplaced letters: ${state.misplaced.join(', ') || 'None'} | Incorrect letters: ${state.incorrect.join(', ') || 'None'}`;
}

guessBtn.addEventListener('click', handleGuess);
newGameBtn.addEventListener('click', () => {
  state.wins = 0;
  state.wordLength = 5;
  startGame();
});

guessInput.addEventListener('input', () => {
  guessInput.value = guessInput.value.replace(/[^a-z]/gi, '').slice(0, state.wordLength).toLowerCase();
  updateActiveRowFromInput();
});

document.addEventListener('keydown', (event) => {
  if (state.isGameOver) {
    return;
  }

  if (/^[a-z]$/i.test(event.key)) {
    event.preventDefault();
    typeLetterIntoBoard(event.key.toLowerCase());
    return;
  }

  if (event.key === 'Backspace') {
    event.preventDefault();
    deleteLetterFromBoard();
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const guess = getCurrentGuessString();
    if (guess.length === state.wordLength) {
      guessInput.value = guess;
      handleGuess();
    }
  }
});

guessInput.focus();
startGame();
