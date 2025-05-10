document.addEventListener('DOMContentLoaded', () => {
    // Элементы интерфейса
    const menuButtons = document.querySelectorAll('#menu button[data-section-anchor]');
    
    // --- Управление навигацией (Scroll-to functionality for menu buttons) ---
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.getAttribute('data-section-anchor');
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Space Invaders Game Logic & Elements ---
    const gameSection = document.getElementById('game-section');
    const startInvadersButton = document.getElementById('start-invaders-button');
    const invadersGameActiveElements = document.getElementById('invaders-game-active-elements');
    
    const grid = gameSection ? gameSection.querySelector(".grid") : null;
    const resultDisplay = gameSection ? gameSection.querySelector(".results") : null;
    const reloadBarProgressElement = document.getElementById("reload-bar-progress");
    const elapsedTimeDisplayElement = document.getElementById("game-timer"); // Timer display element
    
    // Elements for Invaders Win Dialog
    const invadersWinDialog = document.getElementById('invaders-win-dialog');
    const finalInvadersScoreDisplay = document.getElementById('final-invaders-score');
    const finalInvadersTimeDisplay = document.getElementById('final-invaders-time');
    const invaderPlayerNameInput = document.getElementById('invader-player-name');
    const saveInvadersScoreButton = document.getElementById('save-invaders-score-button');
    const playAgainFromWinButton = document.getElementById('play-again-from-win-button'); // New button

    let currentShooterIndex = 202;
    const width = 15;
    let aliensRemoved = [];
    let invadersId = null; // Initialize to null
    let isGoingRight = true;
    let direction = 1;
    let results = 0;

    let laserCooldown = false;
    const cooldownDuration = 500; 
    let reloadInterval = null;

    let gameStartTime = 0; // To store game start time
    let gameTimerIntervalId = null; // ID for the timer interval

    let squares = []; 
    let alienInvaders = [];

    let isInvadersGameActive = false; // Game active state

    // Function declarations moved to the root of the DOMContentLoaded scope
    function draw() {
        for (let i = 0; i < alienInvaders.length; i++) {
            if (!aliensRemoved.includes(i) && squares[alienInvaders[i]]) { // Added check for square existence
                squares[alienInvaders[i]].classList.add("invader");
            }
        }
    }

    function remove() {
        for (let i = 0; i < alienInvaders.length; i++) {
            if (squares[alienInvaders[i]]) { // Added check for square existence
                squares[alienInvaders[i]].classList.remove("invader");
            }
        }
    }

    function moveShooter(e) {
        if (!isInvadersGameActive || !squares[currentShooterIndex]) return; 
        
        let moved = false;
        switch (e.key) {
            case "ArrowLeft":
                if (currentShooterIndex % width !== 0) {
                    squares[currentShooterIndex].classList.remove("shooter");
                    currentShooterIndex -= 1;
                    moved = true;
                }
                e.preventDefault(); 
                break;
            case "ArrowRight":
                if (currentShooterIndex % width < width - 1) {
                    squares[currentShooterIndex].classList.remove("shooter");
                    currentShooterIndex += 1;
                    moved = true;
                }
                e.preventDefault(); 
                break;
        }
        if (moved && squares[currentShooterIndex]) { 
             squares[currentShooterIndex].classList.add("shooter");
        }
    }

    function moveInvaders() {
        if (!isInvadersGameActive || !alienInvaders.length || !squares.length) return; 

        const leftEdge = alienInvaders[0] % width === 0;
        const rightEdge = alienInvaders[alienInvaders.length - 1] % width === width - 1;
        remove();

        if (rightEdge && isGoingRight) {
            for (let i = 0; i < alienInvaders.length; i++) {
                alienInvaders[i] += width + 1;
            }
            direction = -1;
            isGoingRight = false;
        } else if (leftEdge && !isGoingRight) { 
            for (let i = 0; i < alienInvaders.length; i++) {
                alienInvaders[i] += width - 1;
            }
            direction = 1;
            isGoingRight = true;
        }

        for (let i = 0; i < alienInvaders.length; i++) {
            alienInvaders[i] += direction;
        }

        draw();

        if (squares[currentShooterIndex] && squares[currentShooterIndex].classList.contains("invader")) {
            if(resultDisplay) resultDisplay.innerHTML = "ПОГЛОЩЕНЫ БЕЗДНОЙ"; // Thematic game over
            isInvadersGameActive = false;
            clearInterval(invadersId);
            if(gameTimerIntervalId) clearInterval(gameTimerIntervalId); // Stop timer on game over
            if(startInvadersButton) startInvadersButton.style.display = 'block'; // Show start button
        }

        if (aliensRemoved.length === alienInvaders.length && alienInvaders.length > 0) { 
            if(resultDisplay) resultDisplay.innerHTML = "ПОБЕДА!"; // Thematic win
            isInvadersGameActive = false;
            clearInterval(invadersId);
            if(gameTimerIntervalId) clearInterval(gameTimerIntervalId);

            // Show Win Dialog & hide game elements
            if (invadersWinDialog && finalInvadersScoreDisplay && finalInvadersTimeDisplay && invadersGameActiveElements && startInvadersButton) {
                finalInvadersScoreDisplay.textContent = results;
                finalInvadersTimeDisplay.textContent = elapsedTimeDisplayElement.textContent.replace("Time: ", ""); // Reuse current time string
                invadersGameActiveElements.classList.add('hidden');
                invadersWinDialog.classList.remove('hidden');
                invaderPlayerNameInput.focus();
                startInvadersButton.style.display = 'none'; // Keep start button hidden until dialog is closed
            } else {
                // Fallback if dialog elements aren't found, just show start button
                if(startInvadersButton) startInvadersButton.style.display = 'block';
            }
        }
    }
    
    function shoot(e) {
        if (!isInvadersGameActive || e.key !== "ArrowUp") return; 
        e.preventDefault();

        if (laserCooldown) return;

        laserCooldown = true; 
        if (reloadBarProgressElement) {
            reloadBarProgressElement.style.width = '0%';
            reloadBarProgressElement.style.backgroundColor = '#b33a3a'; 
        }

        if (reloadInterval) clearInterval(reloadInterval);

        let progress = 0;
        const updateInterval = 50; 
        const steps = cooldownDuration / updateInterval;
        const increment = 100 / steps;

        reloadInterval = setInterval(() => {
            progress += increment;
            if (progress <= 100 && reloadBarProgressElement) {
                reloadBarProgressElement.style.width = progress + '%';
            } else {
                clearInterval(reloadInterval);
                if (reloadBarProgressElement) reloadBarProgressElement.style.width = '100%'; 
            }
        }, updateInterval);

        setTimeout(() => {
            laserCooldown = false;
            if (reloadBarProgressElement) {
                reloadBarProgressElement.style.width = '100%'; 
                reloadBarProgressElement.style.backgroundColor = '#7F8C5A'; 
            }
            clearInterval(reloadInterval);
        }, cooldownDuration);

        let laserId;
        let currentLaserIndex = currentShooterIndex;

        function moveLaser() {
            if (!squares[currentLaserIndex]) { 
                 clearInterval(laserId);
                 return;
            }
            squares[currentLaserIndex].classList.remove("laser");
            currentLaserIndex -= width;

            if (!squares[currentLaserIndex]) { 
                clearInterval(laserId);
                return;
            }
            squares[currentLaserIndex].classList.add("laser");

            if (squares[currentLaserIndex].classList.contains("invader")) {
                squares[currentLaserIndex].classList.remove("laser");
                squares[currentLaserIndex].classList.remove("invader");
                squares[currentLaserIndex].classList.add("boom");

                setTimeout(() => {
                    if(squares[currentLaserIndex]) squares[currentLaserIndex].classList.remove("boom");
                }, 300);
                clearInterval(laserId);

                const alienIndex = alienInvaders.indexOf(currentLaserIndex);
                if (alienIndex > -1 && !aliensRemoved.includes(alienIndex)) {
                    aliensRemoved.push(alienIndex);
                    results++;
                    if(resultDisplay) resultDisplay.innerHTML = results;
                }
            }
        }
        laserId = setInterval(moveLaser, 100);
    }

    function initializeInvadersGame() {
        if (!grid || !resultDisplay || !reloadBarProgressElement || !elapsedTimeDisplayElement) {
            console.error("Required game elements not found for initialization.");
            return;
        }

        isInvadersGameActive = true;

        grid.innerHTML = '';
        if (invadersId) clearInterval(invadersId);
        if (reloadInterval) clearInterval(reloadInterval);
        if (gameTimerIntervalId) clearInterval(gameTimerIntervalId);
        document.removeEventListener("keydown", moveShooter);
        document.removeEventListener('keydown', shoot);

        squares = [];
        alienInvaders = [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
            15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
            30, 31, 32, 33, 34, 35, 36, 37, 38, 39
        ];
        aliensRemoved.length = 0; 
        currentShooterIndex = 202;
        isGoingRight = true;
        direction = 1;
        results = 0;
        laserCooldown = false;

        if(resultDisplay) resultDisplay.innerHTML = results; 
        elapsedTimeDisplayElement.textContent = "Time: 0.0s"; 

        for (let i = 0; i < width * width; i++) {
            const square = document.createElement("div");
            grid.appendChild(square);
        }
        squares = Array.from(document.querySelectorAll(".grid div"));

        if (squares[currentShooterIndex]) { 
            squares[currentShooterIndex].classList.add("shooter");
        }
        draw(); 

        reloadBarProgressElement.style.width = '100%';
        reloadBarProgressElement.style.backgroundColor = '#7F8C5A';

        gameStartTime = Date.now(); 
        gameTimerIntervalId = setInterval(() => {
            if (!isInvadersGameActive) {
                clearInterval(gameTimerIntervalId);
                return;
            }
            const elapsedMilliseconds = Date.now() - gameStartTime;
            const elapsedSeconds = (elapsedMilliseconds / 1000).toFixed(1); 
            elapsedTimeDisplayElement.textContent = `Time: ${elapsedSeconds}s`;
        }, 40); 

        invadersId = setInterval(moveInvaders, 600);
        document.addEventListener("keydown", moveShooter);
        document.addEventListener('keydown', shoot);
    }

    if (startInvadersButton) {
        startInvadersButton.addEventListener('click', () => {
            if (invadersGameActiveElements) invadersGameActiveElements.classList.remove('hidden');
            startInvadersButton.style.display = 'none';
            if (invadersWinDialog) invadersWinDialog.classList.add('hidden'); // Ensure win dialog is hidden
            initializeInvadersGame();
        });
    } else {
        if (grid) {
            console.warn("Start button not found. Game will not auto-initialize without it.") 
        } else {
            console.warn("Space Invaders grid not found. Game will not initialize.");
        }
    }
  
    const highscoreTableBody = document.getElementById('highscore-table-body');
    const loadingMessage = document.getElementById('loading-message');
    const rowsCountSelect = document.getElementById('rows-count');
    const tableHeaders = document.querySelectorAll('#highscore-table th[data-sort]');
    
    let currentHighscores = [];
    let currentSort = { column: 'score', direction: 'desc' };

    async function fetchHighscores() {
        if (!loadingMessage || !highscoreTableBody) return; 
        loadingMessage.style.display = 'block';
        loadingMessage.textContent = 'Летописи загружаются из бездны...';
        highscoreTableBody.innerHTML = ''; 
  
        try {
            const response = await fetch('/api/scores');
            if (!response.ok) {
                throw new Error('Не удалось призвать летописи из бездны');
            }
            currentHighscores = await response.json();
            renderHighscores();
        } catch (error) {
            console.error('Ошибка загрузки летописей:', error);
            loadingMessage.textContent = 'Ошибка: Летописи не откликаются.';
        }
    }
    
    function sortHighscores() {
        currentHighscores.sort((a, b) => {
            let valA, valB;
  
            if (currentSort.column === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (currentSort.column === 'score') {
                valA = a.score;
                valB = b.score;
            } else if (currentSort.column === 'date') {
                valA = new Date(a.timestamp);
                valB = new Date(b.timestamp);
            }
  
            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
  
            if (currentSort.direction === 'desc') {
                comparison *= -1;
            }
  
            if (comparison === 0) {
                if (currentSort.column !== 'score' && b.score !== a.score) {
                    return b.score - a.score;
                }
                if (currentSort.column !== 'date' && new Date(a.timestamp).getTime() !== new Date(b.timestamp).getTime()) {
                    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                }
            }
            return comparison;
        });
    }
  
    function renderHighscores() {
        if (!highscoreTableBody || !rowsCountSelect || !loadingMessage) return;
        sortHighscores(); 
  
        highscoreTableBody.innerHTML = ''; 
        const rowsToShow = parseInt(rowsCountSelect.value, 10);
        
        const SlicedHighscores = currentHighscores.slice(0, rowsToShow);
  
        if (SlicedHighscores.length === 0) {
            loadingMessage.textContent = 'Летописи пусты. Отрази вторжение, чтобы стать первым!'; // Updated text
            loadingMessage.style.display = 'block';
            return;
        }
        loadingMessage.style.display = 'none';
  
        SlicedHighscores.forEach((record, index) => {
            const row = highscoreTableBody.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = record.name;
            row.insertCell().textContent = record.score;
            row.insertCell().textContent = new Date(record.timestamp).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'medium'});
        });
  
        if(tableHeaders) {
            tableHeaders.forEach(th => {
                th.classList.remove('sort-asc', 'sort-desc');
                if (th.dataset.sort === currentSort.column) {
                    th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
                }
            });
        }
    }
  
    if(rowsCountSelect) rowsCountSelect.addEventListener('change', renderHighscores);
  
    if(tableHeaders) {
        tableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortColumn = header.getAttribute('data-sort');
                if (sortColumn === 'rank') return; 
    
                if (currentSort.column === sortColumn) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = sortColumn;
                    currentSort.direction = (sortColumn === 'score' || sortColumn === 'date') ? 'desc' : 'asc';
                }
                renderHighscores();
            });
        });
    }
  
    if (document.getElementById('results-section')) { 
        fetchHighscores(); 
    }

    async function handleSaveInvadersScore() {
        if (!invaderPlayerNameInput || !saveInvadersScoreButton || !finalInvadersScoreDisplay) return;

        const playerName = invaderPlayerNameInput.value.trim();
        const scoreToSave = results; 

        if (!playerName) {
            alert('Пожалуйста, начертайте ваше имя, Страж!'); // Thematic alert
            return;
        }
        // Check if it was a win scenario and score is positive or if it's a game over with some score.
        // The original check was for clickCount > 0 for the clicker game.
        // For invaders, `results` (aliens killed) is the score.
        // The win condition is `aliensRemoved.length === alienInvaders.length`.
        if (scoreToSave <= 0 && aliensRemoved.length < alienInvaders.length) { 
             alert('Нет подвигов для запечатления. Вторжение не было полностью отражено.');
             if(invadersWinDialog) invadersWinDialog.classList.add('hidden');
             if(startInvadersButton) startInvadersButton.style.display = 'block';
             return;
        }

        saveInvadersScoreButton.disabled = true;
        saveInvadersScoreButton.textContent = 'Запечатление...';

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: playerName, score: scoreToSave }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Не удалось запечатать подвиг в летописи');
            }
            
            alert('Подвиг запечатан в вечности!');
            invaderPlayerNameInput.value = ''; 
            if(invadersWinDialog) invadersWinDialog.classList.add('hidden');
            if(startInvadersButton) startInvadersButton.style.display = 'block'; 
            if (document.getElementById('results-section')) { 
                fetchHighscores(); 
            }

        } catch (error) {
            console.error('Ошибка запечатления подвига:', error);
            alert(`Ошибка: ${error.message}`);
        } finally {
            saveInvadersScoreButton.disabled = false;
            saveInvadersScoreButton.textContent = 'Запечатать Подвиг';
        }
    }

    if (saveInvadersScoreButton) {
        saveInvadersScoreButton.addEventListener('click', handleSaveInvadersScore);
    }

    if (playAgainFromWinButton) {
        playAgainFromWinButton.addEventListener('click', () => {
            if (invadersWinDialog) invadersWinDialog.classList.add('hidden');
            if (startInvadersButton) {
                startInvadersButton.style.display = 'block';
                // Optional: Focus the start button to allow easy restart with Enter/Space
                // startInvadersButton.focus();
            }
            if (invaderPlayerNameInput) invaderPlayerNameInput.value = '';
        });
    }
});