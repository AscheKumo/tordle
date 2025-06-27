// Game state
let currentRow = 0;
let currentTile = 0;
let isGameOver = false;
let currentWord = '';
let targetWord = '';
let hintsUsed = 0;
let maxHints = 3;
let isFreeplayMode = false;
let dailyCompleted = false;
let gameState = {
    board: Array(6).fill().map(() => Array(5).fill('')),
    evaluations: Array(6).fill().map(() => Array(5).fill('')),
    currentRow: 0,
    gameStatus: 'IN_PROGRESS', // IN_PROGRESS, WIN, LOSE
    hintsUsed: 0,
    hintPositions: []
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
    checkDailyCompletion();
}

// Check if daily puzzle is completed
function checkDailyCompletion() {
    const completedDates = JSON.parse(localStorage.getItem('wordleCompletedDates') || '[]');
    const today = new Date().toDateString();
    dailyCompleted = completedDates.includes(today);
    
    if (dailyCompleted) {
        // Show freeplay button if daily is completed
        document.getElementById('freeplay-btn').classList.remove('hidden');
    }
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
    if (isFreeplayMode) {
        // Random word for freeplay
        const randomIndex = Math.floor(Math.random() * WORDS.length);
        targetWord = WORDS[randomIndex];
        console.log('Freeplay word selected');
        return;
    }
    
    // Don't select a new word if we're loading a saved game from today
    const savedState = localStorage.getItem('wordleGameState');
    if (savedState) {
        const state = JSON.parse(savedState);
        if (state.date === new Date().toDateString() && state.targetWord && !state.isFreeplayMode) {
            targetWord = state.targetWord;
            return;
        }
    }
    
    // Use a better date-based selection that handles any date properly
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Create a pseudo-random number based on the date
    // This ensures the same word for the entire day
    const dateString = `${year}-${month}-${day}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Make sure we get a positive index
    const wordIndex = Math.abs(hash) % WORDS.length;
    targetWord = WORDS[wordIndex];
    
    console.log('Daily word selected for', dateString); // Don't log the actual word in production
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
    
    // Hint button
    document.getElementById('hint-btn').addEventListener('click', useHint);
    
    // Restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
        if (isGameOver) {
            restartGame();
        } else {
            const message = document.getElementById('restart-message');
            if (isFreeplayMode) {
                message.textContent = 'Are you sure you want to restart this freeplay game?';
            } else {
                message.textContent = 'Are you sure you want to restart? This will count as a loss in your statistics.';
            }
            openModal('restart-modal');
        }
    });
    
    // Restart modal buttons
    document.getElementById('confirm-restart').addEventListener('click', () => {
        document.getElementById('restart-modal').classList.add('hidden');
        restartGame(!isFreeplayMode);
    });
    
    document.getElementById('cancel-restart').addEventListener('click', () => {
        document.getElementById('restart-modal').classList.add('hidden');
    });
    
    // Freeplay buttons
    document.getElementById('freeplay-btn').addEventListener('click', () => {
        document.getElementById('stats-modal').classList.add('hidden');
        if (dailyCompleted) {
            startFreeplay();
        } else {
            openModal('freeplay-modal');
        }
    });
    
    document.getElementById('start-freeplay').addEventListener('click', () => {
        document.getElementById('freeplay-modal').classList.add('hidden');
        startFreeplay();
    });
    
    document.getElementById('cancel-freeplay').addEventListener('click', () => {
        document.getElementById('freeplay-modal').classList.add('hidden');
    });
    
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

// Start freeplay mode
function startFreeplay() {
    isFreeplayMode = true;
    document.getElementById('mode-indicator').classList.remove('hidden');
    restartGame(false);
    showMessage('Freeplay mode started!');
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

// Use hint function
function useHint() {
    if (isGameOver) {
        showMessage('Game is over!');
        return;
    }
    
    if (hintsUsed >= maxHints) {
        showMessage('No more hints available!');
        return;
    }
    
    // Find positions that haven't been revealed yet
    const availablePositions = [];
    for (let i = 0; i < 5; i++) {
        if (!gameState.hintPositions.includes(i)) {
            let positionRevealed = false;
            for (let row = 0; row < currentRow; row++) {
                if (gameState.evaluations[row][i] === 'correct') {
                    positionRevealed = true;
                    break;
                }
            }
            if (!positionRevealed) {
                availablePositions.push(i);
            }
        }
    }
    
    if (availablePositions.length === 0) {
        showMessage('All letters already revealed!');
        return;
    }
    
    // Choose a random position to reveal
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    const positionToReveal = availablePositions[randomIndex];
    
    // Reveal the letter in the current row
    const tile = document.getElementById(`tile-${currentRow}-${positionToReveal}`);
    tile.textContent = targetWord[positionToReveal];
    tile.classList.add('filled', 'hint');
    
    // Update current word
    const wordArray = currentWord.padEnd(5, ' ').split('');
    wordArray[positionToReveal] = targetWord[positionToReveal];
    currentWord = wordArray.join('').trim();
    
    // Update tile position
    currentTile = Math.max(currentTile, positionToReveal + 1);
    
    // Mark this position as hinted
    gameState.hintPositions.push(positionToReveal);
    hintsUsed++;
    gameState.hintsUsed = hintsUsed;
    
    showMessage(`Hint ${hintsUsed}/${maxHints} used`);
    saveState();
}

// Restart game
function restartGame(countAsLoss = false) {
    if (countAsLoss && !isGameOver) {
        updateStatistics(false);
    }
    
    // Reset game state
    currentRow = 0;
    currentTile = 0;
    isGameOver = false;
    currentWord = '';
    hintsUsed = 0;
    gameState = {
        board: Array(6).fill().map(() => Array(5).fill('')),
        evaluations: Array(6).fill().map(() => Array(5).fill('')),
        currentRow: 0,
        gameStatus: 'IN_PROGRESS',
        hintsUsed: 0,
        hintPositions: []
    };
    
    // Clear board
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
            const tile = document.getElementById(`tile-${i}-${j}`);
            tile.textContent = '';
            tile.className = 'tile';
        }
    }
    
    // Reset keyboard
    document.querySelectorAll('.key').forEach(key => {
        key.className = key.classList.contains('wide') ? 'key wide' : 'key';
    });
    
    // Force a new word selection by clearing the saved date
    const savedState = localStorage.getItem('wordleGameState');
    if (savedState) {
        const state = JSON.parse(savedState);
        state.date = ''; // Clear the date to force new word selection
        localStorage.setItem('wordleGameState', JSON.stringify(state));
    }
    
    // Select new word
    targetWord = ''; // Clear the current word
    selectNewWord();
    
    // Save state
    saveState();
    
    showMessage('New game started!');
}

// Submit the current guess
function submitGuess() {
    // Fill in any missing letters with the hint letters if they exist
    if (currentTile < 5) {
        for (let i = currentTile; i < 5; i++) {
            const tile = document.getElementById(`tile-${currentRow}-${i}`);
            if (tile.textContent) {
                currentWord += tile.textContent;
            }
        }
    }
    
    if (currentWord.length !== 5) {
        shakeRow();
        showMessage('Not enough letters');
        return;
    }
    
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
            tile.classList.remove('hint'); // Remove hint class if it was there
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
            
            if (!isFreeplayMode) {
                updateStatistics(true);
                // Mark daily as completed
                const completedDates = JSON.parse(localStorage.getItem('wordleCompletedDates') || '[]');
                const today = new Date().toDateString();
                if (!completedDates.includes(today)) {
                    completedDates.push(today);
                    localStorage.setItem('wordleCompletedDates', JSON.stringify(completedDates));
                }
                dailyCompleted = true;
                document.getElementById('freeplay-btn').classList.remove('hidden');
            }
            
            const messages = isFreeplayMode ? 
                ['Nice!', 'Well done!', 'Great job!', 'Excellent!', 'Superb!', 'Fantastic!'] :
                ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'];
            showMessage(messages[currentRow]);
            
            setTimeout(() => {
                updateStatisticsDisplay();
                openModal('stats-modal');
                if (!isFreeplayMode && dailyCompleted) {
                    setTimeout(() => {
                        openModal('freeplay-modal');
                    }, 500);
                }
            }, 2000);
        } else if (currentRow === 5) {
            isGameOver = true;
            gameState.gameStatus = 'LOSE';
            
            if (!isFreeplayMode) {
                updateStatistics(false);
            }
            
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
        if (i === statistics.lastCompletedRow && !isFreeplayMode) {
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
    if (isFreeplayMode) {
        showMessage("Can't share freeplay results");
        return;
    }
    
    const emojiGrid = gameState.evaluations
        .filter(row => row.some(cell => cell !== ''))
        .map(row => 
            row.map(cell => {
                if (cell === 'correct') return '🟩';
                if (cell === 'present') return '🟨';
                return '⬜';
            }).join('')
        ).join('\n');
    
    const hintsText = hintsUsed > 0 ? ` (${hintsUsed} hints)` : '';
    const text = `Wordle ${gameState.gameStatus === 'WIN' ? currentRow + 1 : 'X'}/6${hintsText}\n\n${emojiGrid}`;
    
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
        hintsUsed,
        isFreeplayMode,
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
        
        // Check if it's a new day and we're not in freeplay
        if (state.date !== new Date().toDateString() && !state.isFreeplayMode) {
            return; // Start fresh
        }
        
        // Restore state
        gameState = state.gameState || gameState;
        currentRow = state.currentRow;
        currentTile = state.currentTile;
        currentWord = state.currentWord;
        isGameOver = state.isGameOver;
        targetWord = state.targetWord;
        hintsUsed = state.hintsUsed || 0;
        isFreeplayMode = state.isFreeplayMode || false;
        
        // Show freeplay indicator if needed
        if (isFreeplayMode) {
            document.getElementById('mode-indicator').classList.remove('hidden');
        }
        
        // Initialize hintPositions if it doesn't exist
        if (!gameState.hintPositions) {
            gameState.hintPositions = [];
        }
        
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
        
        // Restore hints
        if (gameState.hintPositions) {
            gameState.hintPositions.forEach(pos => {
                const tile = document.getElementById(`tile-${currentRow}-${pos}`);
                if (tile && tile.textContent && !tile.classList.contains('reveal')) {
                    tile.classList.add('hint');
                }
            });
        }
        
        // Show win/lose message if game is over
        if (isGameOver && gameState.gameStatus === 'LOSE') {
            setTimeout(() => showMessage(targetWord), 100);
        }
    }
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
