document.addEventListener('DOMContentLoaded', () => {
  // Элементы интерфейса
  const menuButtons = document.querySelectorAll('#menu button');
  const workspaceSections = document.querySelectorAll('#workspace section');
  const aboutSection = document.getElementById('about-section');
  const gameSection = document.getElementById('game-section');
  const resultsSection = document.getElementById('results-section');

  // Элементы игры
  const timeLeftDisplay = document.getElementById('time-left');
  const clickCountDisplay = document.getElementById('click-count');
  const startGameButton = document.getElementById('start-game-button');
  const clickableZone = document.getElementById('clickable-zone');
  const gameOverDialog = document.getElementById('game-over-dialog');
  const finalScoreDisplay = document.getElementById('final-score');
  const playerNameInput = document.getElementById('player-name');
  const saveScoreButton = document.getElementById('save-score-button');

  // Элементы таблицы рекордов
  const highscoreTableBody = document.getElementById('highscore-table-body');
  const loadingMessage = document.getElementById('loading-message');
  const rowsCountSelect = document.getElementById('rows-count');
  const tableHeaders = document.querySelectorAll('#highscore-table th[data-sort]');


  // Игровые переменные
  const GAME_DURATION = 10; // секунд
  let timeLeft = GAME_DURATION;
  let clickCount = 0;
  let gameInterval = null;
  let isGameActive = false;
  let currentHighscores = []; // для хранения загруженных рекордов и сортировки
  let currentSort = { column: 'score', direction: 'desc' };

  // --- Управление навигацией ---
  function showSection(sectionId) {
      workspaceSections.forEach(section => {
          section.classList.remove('active');
      });
      const activeSection = document.getElementById(sectionId + '-section');
      if (activeSection) {
          activeSection.classList.add('active');
      }
  }

  menuButtons.forEach(button => {
      button.addEventListener('click', () => {
          const sectionId = button.getAttribute('data-section');
          showSection(sectionId);
          if (sectionId === 'results') {
              fetchHighscores();
          }
      });
  });

  // --- Логика игры ---
  function startGame() {
      clickCount = 0;
      timeLeft = GAME_DURATION;
      isGameActive = true;

      clickCountDisplay.textContent = clickCount;
      timeLeftDisplay.textContent = timeLeft;

      startGameButton.style.display = 'none';
      clickableZone.classList.remove('hidden');
      gameOverDialog.classList.add('hidden');

      clickableZone.addEventListener('click', handleUserClick); // Добавляем слушатель только при старте

      gameInterval = setInterval(() => {
          timeLeft--;
          timeLeftDisplay.textContent = timeLeft;
          if (timeLeft <= 0) {
              endGame();
          }
      }, 1000);
  }

  function handleUserClick() {
      if (isGameActive) {
          clickCount++;
          clickCountDisplay.textContent = clickCount;
      }
  }

  function endGame() {
      clearInterval(gameInterval);
      isGameActive = false;
      clickableZone.removeEventListener('click', handleUserClick); // Удаляем слушатель
      clickableZone.classList.add('hidden');
      
      finalScoreDisplay.textContent = clickCount;
      gameOverDialog.classList.remove('hidden');
      startGameButton.style.display = 'block'; // Показать кнопку для новой игры
  }

  startGameButton.addEventListener('click', startGame);

  // --- Сохранение результата ---
  async function saveScore() {
      const playerName = playerNameInput.value.trim();
      if (!playerName) {
          alert('Пожалуйста, введите ваше имя.');
          return;
      }
      if (clickCount <= 0) {
          alert('Нечего сохранять, попробуйте сыграть!');
          gameOverDialog.classList.add('hidden');
          return;
      }

      saveScoreButton.disabled = true;
      saveScoreButton.textContent = 'Сохранение...';

      try {
          const response = await fetch('/api/scores', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: playerName, score: clickCount }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Не удалось сохранить результат');
          }
          
          alert('Результат сохранен!');
          playerNameInput.value = '';
          gameOverDialog.classList.add('hidden');
          // Опционально: перейти на вкладку рекордов и обновить их
          showSection('results');
          fetchHighscores();

      } catch (error) {
          console.error('Ошибка сохранения результата:', error);
          alert(`Ошибка: ${error.message}`);
      } finally {
          saveScoreButton.disabled = false;
          saveScoreButton.textContent = 'Сохранить результат';
      }
  }

  saveScoreButton.addEventListener('click', saveScore);

  // --- Таблица рекордов ---
  async function fetchHighscores() {
      loadingMessage.style.display = 'block';
      highscoreTableBody.innerHTML = ''; // Очистить старые данные

      try {
          const response = await fetch('/api/scores');
          if (!response.ok) {
              throw new Error('Не удалось загрузить рекорды');
          }
          currentHighscores = await response.json();
          renderHighscores();
      } catch (error) {
          console.error('Ошибка загрузки рекордов:', error);
          loadingMessage.textContent = 'Ошибка загрузки рекордов.';
      } finally {
          // loadingMessage.style.display = 'none'; // Скроем после рендеринга
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

          if (currentSort.direction === 'asc') {
              return valA > valB ? 1 : (valA < valB ? -1 : 0);
          } else { // desc
              // Для очков - по убыванию, для даты - по возрастанию (если primary sort по очкам)
              // Основная сортировка по умолчанию: очки (desc), затем дата (asc)
              if (currentSort.column === 'score') {
                  if (b.score !== a.score) return b.score - a.score;
                  return new Date(a.timestamp) - new Date(b.timestamp); // Вторичная по дате (asc)
              }
              if (currentSort.column === 'date') {
                   if (new Date(b.timestamp) !== new Date(a.timestamp)) return new Date(b.timestamp) - new Date(a.timestamp);
              }
              return valB > valA ? 1 : (valB < valA ? -1 : 0);
          }
      });
  }


  function renderHighscores() {
      sortHighscores(); // Сортируем перед рендерингом

      highscoreTableBody.innerHTML = ''; // Очищаем
      const rowsToShow = parseInt(rowsCountSelect.value, 10);
      
      const SlicedHighscores = currentHighscores.slice(0, rowsToShow);

      if (SlicedHighscores.length === 0) {
          loadingMessage.textContent = 'Рекордов пока нет. Сыграйте, чтобы стать первым!';
          loadingMessage.style.display = 'block';
          return;
      }
      loadingMessage.style.display = 'none';


      SlicedHighscores.forEach((record, index) => {
          const row = highscoreTableBody.insertRow();
          row.insertCell().textContent = index + 1; // Место
          row.insertCell().textContent = record.name;
          row.insertCell().textContent = record.score;
          row.insertCell().textContent = new Date(record.timestamp).toLocaleString('ru-RU');
      });
  }

  rowsCountSelect.addEventListener('change', renderHighscores);

  tableHeaders.forEach(header => {
      header.addEventListener('click', () => {
          const sortColumn = header.getAttribute('data-sort');
          if (sortColumn === 'rank') return; // Не сортируем по номеру

          if (currentSort.column === sortColumn) {
              currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
          } else {
              currentSort.column = sortColumn;
              currentSort.direction = (sortColumn === 'score' || sortColumn === 'date') ? 'desc' : 'asc'; // Очки и дату по убыванию сначала
          }
          renderHighscores();
      });
  });


  // --- Инициализация ---
  showSection('about'); // Показать "Об игре" при загрузке
});