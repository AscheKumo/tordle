// Game state
let currentRow = 0;
let currentTile = 0;
let isGameOver = false;
let currentWord = '';
let targetWord = '';
let gameState = {
    board: Array(6).fill().map(() => Array(5).fill('')),
    evaluations: Array(6).fill().map(() => Array(5).fill('')),
    currentRow: 0,
    gameStatus: 'IN_PROGRESS' // IN_PROGRESS, WIN, LOSE
};

// Statistics
let statistics = {
    totalPlayed: 0,
    totalWins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastCompletedRow: -1
};

// Settings
let settings = {
    darkMode: false,
    hardMode: false
};

// Initialize the game
function init() {
    createBoard();
    createKeyboard();
    loadState();
    selectNewWord();
    addEventListeners();
}

// Create the game board
function createBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        
        for (let j = 0; j < 5; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        
        board.appendChild(row);
    }
}

// Create the on-screen keyboard
function createKeyboard() {
    const keyboard = document.getElementById('keyboard');
    keyboard.innerHTML = '';
    
    const keys = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
    ];
    
    keys.forEach((row, rowIndex) => {
        const keyboardRow = document.createElement('div');
        keyboardRow.className = 'keyboard-row';
        
        row.forEach(key => {
            const button = document.createElement('button');
            button.className = 'key';
            button.textContent = key;
            button.id = `key-${key}`;
            
            if (key === 'ENTER' || key === '⌫') {
                button.className += ' wide';
            }
            
            button.addEventListener('click', () => handleKeyPress(key));
            keyboardRow.appendChild(button);
        });
        
        keyboard.appendChild(keyboardRow);
    });
}

// Select a new word for the day
function selectNewWord() {
    // Use date-based selection for daily word
    const today = new Date();
    const startDate = new Date(2025, 0, 1); // January 1, 2025
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const wordIndex = daysSinceStart % WORDS.length;
    targetWord = WORDS[wordIndex];
    console.log('Target word selected'); // Don't log the actual word in production
}

// Add event listeners
function addEventListeners() {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
        if (isGameOver) return;
        
        if (e.key === 'Enter') {
            handleKeyPress('ENTER');
        } else if (e.key === 'Backspace') {
            handleKeyPress('⌫');
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            handleKeyPress(e.key.toUpperCase());
        }
    });
    
    // Modal controls
    document.getElementById('help-btn').addEventListener('click', () => openModal('help-modal'));
    document.getElementById('stats-btn').addEventListener('click', () => {
        updateStatisticsDisplay();
        openModal('stats-modal');
    });
    document.getElementById('settings-btn').addEventListener('click', () => openModal('settings-modal'));
    
    // Close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });
    
    // Settings toggles
    document.getElementById('dark-mode').addEventListener('change', (e) => {
        settings.darkMode = e.target.checked;
        document.body.classList.toggle('dark-mode', settings.darkMode);
        saveState();
    });
    
    document.getElementById('hard-mode').addEventListener('change', (e) => {
        if (currentRow > 0 && e.target.checked) {
            showMessage('Hard mode can only be enabled at the start');
            e.target.checked = false;
            return;
        }
        settings.hardMode = e.target.checked;
        saveState();
    });
    
    // Share button
    document.getElementById('share-btn').addEventListener('click', shareResults);
}

// Handle key press
function handleKeyPress(key) {
    if (isGameOver) return;
    
    if (key === 'ENTER') {
        if (currentTile === 5) {
            submitGuess();
        }
    } else if (key === '⌫') {
        if (currentTile > 0) {
            currentTile--;
            const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tile.textContent = '';
            tile.classList.remove('filled');
            currentWord = currentWord.slice(0, -1);
        }
    } else if (currentTile < 5 && /^[A-Z]$/.test(key)) {
        const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
        tile.textContent = key;
        tile.classList.add('filled');
        currentWord += key;
        currentTile++;
    }
}

// Submit the current guess
function submitGuess() {
    if (!VALID_WORDS.includes(currentWord) && !WORDS.includes(currentWord)) {
        shakeRow();
        showMessage('Not in word list');
        return;
    }
    
    if (settings.hardMode && !isValidHardModeGuess()) {
        shakeRow();
        return;
    }
    
    // Evaluate the guess
    const evaluation = evaluateGuess(currentWord, targetWord);
    
    // Reveal tiles with animation
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const tile = document.getElementById(`tile-${currentRow}-${i}`);
            tile.classList.add('reveal', evaluation[i]);
            
            // Update keyboard
            const key = document.getElementById(`key-${currentWord[i]}`);
            if (evaluation[i] === 'correct' || 
                (evaluation[i] === 'present' && !key.classList.contains('correct')) ||
                (evaluation[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present'))) {
                key.classList.add(evaluation[i]);
            }
        }, i * 200);
    }
    
    // Update game state
    gameState.board[currentRow] = currentWord.split('');
    gameState.evaluations[currentRow] = evaluation;
    
    // Check win/lose
    setTimeout(() => {
        if (currentWord === targetWord) {
            isGameOver = true;
            gameState.gameStatus = 'WIN';
            statistics.lastCompletedRow = currentRow;
            updateStatistics(true);
            showMessage(['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'][currentRow]);
            setTimeout(() => {
                updateStatisticsDisplay();
                openModal('stats-modal');
            }, 2000);
        } else if (currentRow === 5) {
            isGameOver = true;
            gameState.gameStatus = 'LOSE';
            updateStatistics(false);
            showMessage(targetWord);
            setTimeout(() => {
                updateStatisticsDisplay();
                openModal('stats-modal');
            }, 2000);
        } else {
            currentRow++;
            currentTile = 0;
            currentWord = '';
            gameState.currentRow = currentRow;
        }
        saveState();
    }, 1000);
}

// Evaluate a guess against the target word
function evaluateGuess(guess, target) {
    const evaluation = Array(5).fill('absent');
    const targetChars = target.split('');
    const guessChars = guess.split('');
    
    // First pass: mark correct letters
    for (let i = 0; i < 5; i++) {
        if (guessChars[i] === targetChars[i]) {
            evaluation[i] = 'correct';
            targetChars[i] = null;
            guessChars[i] = null;
        }
    }
    
    // Second pass: mark present letters
    for (let i = 0; i < 5; i++) {
        if (guessChars[i] !== null) {
            const targetIndex = targetChars.indexOf(guessChars[i]);
            if (targetIndex !== -1) {
                evaluation[i] = 'present';
                targetChars[targetIndex] = null;
            }
        }
    }
    
    return evaluation;
}

// Check if guess is valid in hard mode
function isValidHardModeGuess() {
    if (!settings.hardMode || currentRow === 0) return true;
    
    for (let row = 0; row < currentRow; row++) {
        for (let col = 0; col < 5; col++) {
            const evaluation = gameState.evaluations[row][col];
            const letter = gameState.board[row][col];
            
            if (evaluation === 'correct' && currentWord[col] !== letter) {
                showMessage(`${col + 1}${getOrdinalSuffix(col + 1)} letter must be ${letter}`);
                return false;
            }
            
            if (evaluation === 'present' && !currentWord.includes(letter)) {
                showMessage(`Guess must contain ${letter}`);
                return false;
            }
        }
    }
    
    return true;
}

// Get ordinal suffix
function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Shake animation for invalid word
function shakeRow() {
    for (let i = 0; i < 5; i++) {
        const tile = document.getElementById(`tile-${currentRow}-${i}`);
        tile.classList.add('shake');
        setTimeout(() => tile.classList.remove('shake'), 500);
    }
}

// Show message
function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 2000);
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

// Update statistics
function updateStatistics(won) {
    statistics.totalPlayed++;
    
    if (won) {
        statistics.totalWins++;
        statistics.currentStreak++;
        statistics.maxStreak = Math.max(statistics.maxStreak, statistics.currentStreak);
        statistics.guessDistribution[currentRow]++;
    } else {
        statistics.currentStreak = 0;
    }
    
    localStorage.setItem('wordleStatistics', JSON.stringify(statistics));
}

// Update statistics display
function updateStatisticsDisplay() {
    document.getElementById('total-played').textContent = statistics.totalPlayed;
    document.getElementById('win-percentage').textContent = 
        statistics.totalPlayed > 0 ? Math.round((statistics.totalWins / statistics.totalPlayed) * 100) : 0;
    document.getElementById('current-streak').textContent = statistics.currentStreak;
    document.getElementById('max-streak').textContent = statistics.maxStreak;
    
    // Guess distribution
    const distributionEl = document.getElementById('guess-distribution');
    distributionEl.innerHTML = '';
    
    const maxGuesses = Math.max(...statistics.guessDistribution, 1);
    
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'guess-distribution-row';
        
        const number = document.createElement('div');
        number.className = 'guess-number';
        number.textContent = i + 1;
        
        const bar = document.createElement('div');
        bar.className = 'guess-bar';
        if (i === statistics.lastCompletedRow) {
            bar.classList.add('highlight');
        }
        bar.style.width = `${(statistics.guessDistribution[i] / maxGuesses) * 100}%`;
        bar.textContent = statistics.guessDistribution[i] || '';
        
        row.appendChild(number);
        row.appendChild(bar);
        distributionEl.appendChild(row);
    }
}

// Share results
function shareResults() {
    const emojiGrid = gameState.evaluations
        .filter(row => row.some(cell => cell !== ''))
        .map(row => 
            row.map(cell => {
                if (cell === 'correct') return '🟩';
                if (cell === 'present') return '🟨';
                return '⬜';
            }).join('')
        ).join('\n');
    
    const text = `Wordle ${gameState.gameStatus === 'WIN' ? currentRow + 1 : 'X'}/6\n\n${emojiGrid}`;
    
    if (navigator.share) {
        navigator.share({ text });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showMessage('Results copied to clipboard');
    }
}

// Save game state
function saveState() {
    const state = {
        gameState,
        currentRow,
        currentTile,
        currentWord,
        isGameOver,
        targetWord,
        settings,
        date: new Date().toDateString()
    };
    localStorage.setItem('wordleGameState', JSON.stringify(state));
    localStorage.setItem('wordleSettings', JSON.stringify(settings));
}

// Load game state
function loadState() {
    // Load settings
    const savedSettings = localStorage.getItem('wordleSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        document.getElementById('dark-mode').checked = settings.darkMode;
        document.getElementById('hard-mode').checked = settings.hardMode;
        document.body.classList.toggle('dark-mode', settings.darkMode);
    }
    
    // Load statistics
    const savedStats = localStorage.getItem('wordleStatistics');
    if (savedStats) {
        statistics = JSON.parse(savedStats);
    }
    
    // Load game state
    const savedState = localStorage.getItem('wordleGameState');
    if (savedState) {
        const state = JSON.parse(savedState);
        
        // Check if it's a new day
        if (state.date !== new Date().toDateString()) {
            return; // Start fresh
        }
        
        // Restore state
        gameState = state.gameState;
        currentRow = state.currentRow;
        currentTile = state.currentTile;
        currentWord = state.currentWord;
        isGameOver = state.isGameOver;
        targetWord = state.targetWord;
        
        // Restore board
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 5; col++) {
                if (gameState.board[row][col]) {
                    const tile = document.getElementById(`tile-${row}-${col}`);
                    tile.textContent = gameState.board[row][col];
                    tile.classList.add('filled');
                    
                    if (gameState.evaluations[row][col]) {
                        tile.classList.add('reveal', gameState.evaluations[row][col]);
                        
                        // Update keyboard
                        const key = document.getElementById(`key-${gameState.board[row][col]}`);
                        const evaluation = gameState.evaluations[row][col];
                        if (evaluation === 'correct' || 
                            (evaluation === 'present' && !key.classList.contains('correct')) ||
                            (evaluation === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present'))) {
                            key.classList.add(evaluation);
                        }
                    }
                }
            }
        }
        
        // Show win/lose message if game is over
        if (isGameOver && gameState.gameStatus === 'LOSE') {
            setTimeout(() => showMessage(targetWord), 100);
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
