// game.js
// Complete Hand Cricket Client with Wickets Taken Feature

document.addEventListener('DOMContentLoaded', () => {
  console.log('🏏 Hand Cricket Game - Score/Balls Format with Wickets Taken');

  // ========== DOM Elements ==========
  const startScreen = document.getElementById('start-screen');
  const gameScreen = document.getElementById('game-screen');
  const resultScreen = document.getElementById('result-screen');
  const tossScreen = document.getElementById('toss-screen');

  const connectButton = document.getElementById('connect-button');
  const connectionStatus = document.getElementById('connection-status');
  const oversSelect = document.getElementById('overs');

  // Profile elements
  const playerNameInput = document.getElementById('player-name');
  const playerStatusSelect = document.getElementById('player-status');
  const avatarDisplay = document.getElementById('avatar-display');
  const avatarInitials = document.getElementById('avatar-initials');
  const avatarImage = document.getElementById('avatar-image');
  const avatarUpload = document.getElementById('avatar-upload');
  const uploadAvatarBtn = document.getElementById('upload-avatar-btn');
  const removeAvatarBtn = document.getElementById('remove-avatar-btn');
  const gamesPlayedStat = document.getElementById('games-played');
  const gamesWonStat = document.getElementById('games-won');
  const winRateStat = document.getElementById('win-rate');

  // Game HUD
  const roleInfo = document.getElementById('role-info');
  const scoreInfo = document.getElementById('score-info');
  const ballsInfo = document.getElementById('balls-info');
  const gameStatus = document.getElementById('game-status');
  const controls = document.getElementById('controls');
  const choiceButtons = document.querySelectorAll('.choice-btn');

  // Ball indicators container
  const ballsContainer = document.getElementById('balls-container');

  // Result elements
  const playAgainButton = document.getElementById('play-again-button');
  const exitButton = document.getElementById('exit-button');

  // Personal result popup
  const personalResultPopup = document.getElementById('personal-result-popup');
  const personalResultOk = document.getElementById('personal-result-ok');

  // Toss elements
  const tossChooseSide = document.getElementById('toss-choose-side');
  const tossFlip = document.getElementById('toss-flip');
  const tossWinnerChoose = document.getElementById('toss-winner-choose');

  const chooseHeadsBtn = document.getElementById('choose-heads');
  const chooseTailsBtn = document.getElementById('choose-tails');
  const tossSideStatus = document.getElementById('toss-side-status');

  const coinEl = document.getElementById('coin');
  const flipCoinBtn = document.getElementById('flip-coin-btn');
  const tossFlipStatus = document.getElementById('toss-flip-status');

  const tossWinnerText = document.getElementById('toss-winner-text');
  const chooseBattingBtn = document.getElementById('choose-batting');
  const chooseBowlingBtn = document.getElementById('choose-bowling');

  // ========== Game State Variables ==========
  let ws = null;
  let isConnected = false;
  let myId = null;
  let gameOver = false;
  let myRole = null;
  let isFlipper = false;
  let myTossSide = null;

  // Ball tracking
  let currentOverBalls = 0;
  let currentOver = 1;
  let totalBallsInInnings = 0;

  // Ball indicator state
  let currentBallIndex = 0;
  let ballsInCurrentOver = [];

  // Player profile
  let playerProfile = {
    name: '',
    status: 'ready',
    avatar: null,
    gamesPlayed: 0,
    gamesWon: 0,
    winRate: 0
  };

  // Player stats tracking
  let playerStats = {
    myStats: {
      battingRuns: 0,
      ballsFaced: 0,
      wicketsLost: 0,
      bowlingWickets: 0,
      runsConceded: 0,
      ballsBowled: 0
    },
    opponentStats: {
      battingRuns: 0,
      ballsFaced: 0,
      wicketsLost: 0,
      bowlingWickets: 0,
      runsConceded: 0,
      ballsBowled: 0
    }
  };

  let currentInnings = 1;
  let matchData = null;
  let firstInningsBattingTeam = null;
  let opponentName = 'Opponent';

  // ========== Ball Indicator Functions ==========
  function initializeBallIndicators(totalBalls = 6) {
    if (!ballsContainer) return;
    
    ballsContainer.innerHTML = '';
    ballsInCurrentOver = [];
    currentBallIndex = 0;
    
    for (let i = 0; i < totalBalls; i++) {
      const ballElement = document.createElement('div');
      ballElement.className = 'ball-indicator unplayed';
      ballElement.title = `Ball ${i + 1} - Not played`;
      ballsContainer.appendChild(ballElement);
      ballsInCurrentOver.push({ element: ballElement, played: false, runs: null });
    }
    
    console.log(`🔴 Initialized ${totalBalls} red ball indicators`);
  }

  function updateBallIndicator(runs, isWicket = false) {
    if (currentBallIndex >= ballsInCurrentOver.length) return;
    
    const ballData = ballsInCurrentOver[currentBallIndex];
    const ballElement = ballData.element;
    
    // Add update animation
    ballElement.classList.add('updating');
    
    setTimeout(() => {
      // Remove previous classes
      ballElement.classList.remove('unplayed', 'scored-0', 'scored-1', 'scored-2', 
          'scored-3', 'scored-4', 'scored-5', 'scored-6', 'wicket');
      
      if (isWicket) {
        ballElement.classList.add('wicket');
        ballElement.textContent = 'W';
        ballElement.title = `Ball ${currentBallIndex + 1} - Wicket!`;
        console.log('🔴 Ball changed to: WICKET');
      } else {
        ballElement.classList.add(`scored-${runs}`);
        ballElement.textContent = runs;
        ballElement.title = `Ball ${currentBallIndex + 1} - ${runs} run${runs !== 1 ? 's' : ''}`;
        console.log(`🔴 Ball changed to: ${runs} runs`);
      }
      
      // Update ball data
      ballData.played = true;
      ballData.runs = isWicket ? 'W' : runs;
      
      // Remove animation class
      ballElement.classList.remove('updating');
      
      currentBallIndex++;
    }, 250);
  }

  function resetBallIndicators() {
    if (!ballsContainer) return;
    
    ballsContainer.innerHTML = '';
    ballsInCurrentOver = [];
    currentBallIndex = 0;
    
    console.log('🔴 Ball indicators reset');
  }

  // ========== Profile Management Functions ==========
  function loadProfile() {
    const savedProfile = localStorage.getItem('handCricketProfile');
    if (savedProfile) {
      try {
        playerProfile = JSON.parse(savedProfile);
        updateProfileDisplay();
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
  }

  function saveProfile() {
    localStorage.setItem('handCricketProfile', JSON.stringify(playerProfile));
  }

  function updateProfileDisplay() {
    if (playerNameInput && playerProfile.name) {
      playerNameInput.value = playerProfile.name;
    }

    if (playerStatusSelect && playerProfile.status) {
      playerStatusSelect.value = playerProfile.status;
    }

    updateAvatarDisplay();

    if (gamesPlayedStat) gamesPlayedStat.textContent = playerProfile.gamesPlayed;
    if (gamesWonStat) gamesWonStat.textContent = playerProfile.gamesWon;
    if (winRateStat) winRateStat.textContent = playerProfile.winRate + '%';
  }

  function updateAvatarDisplay() {
    const name = playerProfile.name || 'Player';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (avatarInitials) avatarInitials.textContent = initials;
    if (avatarImage && playerProfile.avatar) {
      avatarImage.src = playerProfile.avatar;
      avatarImage.classList.remove('hidden');
      avatarInitials.style.display = 'none';
      removeAvatarBtn?.classList.remove('hidden');
    } else {
      if (avatarImage) avatarImage.classList.add('hidden');
      if (avatarInitials) avatarInitials.style.display = 'flex';
      removeAvatarBtn?.classList.add('hidden');
    }

    updateAvatarInScreen('toss');
    updateAvatarInScreen('game');
    updateAvatarInScreen('result');
  }

  function updateAvatarInScreen(screenType) {
    const initialsEl = document.getElementById(`${screenType}-avatar-initials`);
    const imageEl = document.getElementById(`${screenType}-avatar-image`);
    const nameEl = document.getElementById(`${screenType}-player-name`);

    if (initialsEl) {
      const name = playerProfile.name || 'Player';
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      initialsEl.textContent = initials;
    }

    if (imageEl && playerProfile.avatar) {
      imageEl.src = playerProfile.avatar;
      imageEl.classList.remove('hidden');
      if (initialsEl) initialsEl.style.display = 'none';
    } else {
      if (imageEl) imageEl.classList.add('hidden');
      if (initialsEl) initialsEl.style.display = 'flex';
    }

    if (nameEl) {
      nameEl.textContent = playerProfile.name || 'Player';
    }
  }

  function updateGameStats(won) {
    playerProfile.gamesPlayed++;
    if (won) {
      playerProfile.gamesWon++;
    }
    playerProfile.winRate = Math.round((playerProfile.gamesWon / playerProfile.gamesPlayed) * 100);
    saveProfile();
    updateProfileDisplay();
  }

  // ========== Profile Event Listeners ==========
  playerNameInput?.addEventListener('input', (e) => {
    playerProfile.name = e.target.value.trim();
    saveProfile();
    updateAvatarDisplay();
    updateConnectionStatus();
  });

  playerStatusSelect?.addEventListener('change', (e) => {
    playerProfile.status = e.target.value;
    saveProfile();
  });

  uploadAvatarBtn?.addEventListener('click', () => {
    avatarUpload?.click();
  });

  removeAvatarBtn?.addEventListener('click', () => {
    playerProfile.avatar = null;
    saveProfile();
    updateAvatarDisplay();
  });

  avatarUpload?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        playerProfile.avatar = event.target.result;
        saveProfile();
        updateAvatarDisplay();
      };
      reader.readAsDataURL(file);
    }
  });

  function updateConnectionStatus() {
    const name = playerProfile.name.trim();
    if (!name) {
      if (connectionStatus) {
        connectionStatus.textContent = 'Please enter your name before connecting.';
      }
      if (connectButton) connectButton.disabled = true;
    } else {
      if (connectionStatus) {
        connectionStatus.textContent = `Ready to connect as ${name}. Select overs and click Connect to Play.`;
      }
      if (connectButton) connectButton.disabled = false;
    }
  }

  // ========== Game Flow Functions ==========
  function setStatus(text, cls = null) {
    if (gameStatus) {
      gameStatus.textContent = text || '';
      gameStatus.classList.remove('success', 'warning', 'danger');
      if (cls) gameStatus.classList.add(cls);
    }
  }

  function enableControls(enabled) {
    choiceButtons.forEach(b => b.disabled = !enabled);
  }

  function goToStart() {
    if (startScreen) startScreen.classList.remove('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (tossScreen) tossScreen.classList.add('hidden');
    hidePersonalResultPopup();
    
    updateConnectionStatus();
  }

  function goToToss() {
    if (startScreen) startScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (tossScreen) tossScreen.classList.remove('hidden');

    updateAvatarInScreen('toss');

    tossChooseSide?.classList.remove('hidden');
    tossFlip?.classList.add('hidden');
    tossWinnerChoose?.classList.add('hidden');

    if (tossSideStatus) tossSideStatus.textContent = 'Pick a side. The two players must pick different sides.';
    if (flipCoinBtn) flipCoinBtn.disabled = true;
    if (chooseHeadsBtn) chooseHeadsBtn.disabled = false;
    if (chooseTailsBtn) chooseTailsBtn.disabled = false;
    
    myTossSide = null;
    isFlipper = false;
  }

  function goToGame() {
    if (tossScreen) tossScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (gameScreen) gameScreen.classList.remove('hidden');
    if (controls) controls.classList.remove('hidden');

    updateAvatarInScreen('game');
  }

  function goToResult(data) {
    if (gameScreen) gameScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.remove('hidden');

    updateAvatarInScreen('result');
    populatePersonalResultScreen(data);
  }

  function resetHUD() {
    if (roleInfo) roleInfo.textContent = '';
    if (scoreInfo) scoreInfo.textContent = 'Score: 0/0';
    if (ballsInfo) ballsInfo.textContent = 'Balls: 0 / 6';
    setStatus('');
    enableControls(false);
    resetBallIndicators();
  }

  // ========== Stats Functions ==========
  function updatePlayerStats(data) {
    console.log('Updating player stats:', { 
      outcome: data.outcome, 
      myRole, 
      currentInnings 
    });
    
    if (data.outcome === 'out') {
      if (myRole === 'batting') {
        playerStats.myStats.wicketsLost++;
        playerStats.myStats.ballsFaced++;
        playerStats.opponentStats.bowlingWickets++;
        playerStats.opponentStats.ballsBowled++;
      } else {
        playerStats.opponentStats.wicketsLost++;
        playerStats.opponentStats.ballsFaced++;
        playerStats.myStats.bowlingWickets++;
        playerStats.myStats.ballsBowled++;
      }
    } else if (data.outcome === 'score') {
      const runs = data.runs || 0;
      
      if (myRole === 'batting') {
        playerStats.myStats.battingRuns += runs;
        playerStats.myStats.ballsFaced++;
        playerStats.opponentStats.runsConceded += runs;
        playerStats.opponentStats.ballsBowled++;
      } else {
        playerStats.opponentStats.battingRuns += runs;
        playerStats.opponentStats.ballsFaced++;
        playerStats.myStats.runsConceded += runs;
        playerStats.myStats.ballsBowled++;
      }
    }
    
    console.log('Updated player stats:', playerStats);
  }

  function calculateStrikeRate(runs, ballsFaced) {
    if (ballsFaced === 0) return 0;
    return ((runs / ballsFaced) * 100).toFixed(2);
  }

  // ========== SCORE-BASED WINNER/LOSER DETERMINATION ==========
  function determinePlayerResult(matchResult, finalScores) {
    const myFinalScore = playerStats.myStats.battingRuns;
    const opponentFinalScore = playerStats.opponentStats.battingRuns;
    
    console.log(`📊 Score Comparison: Me: ${myFinalScore}, Opponent: ${opponentFinalScore}`);
    
    if (myFinalScore === opponentFinalScore) {
      console.log('🤝 Match tied - equal scores');
      return { yourResult: 'tie', opponentResult: 'tie' };
    }
    
    if (myFinalScore > opponentFinalScore) {
      console.log('🏆 You won');
      return { yourResult: 'winner', opponentResult: 'loser' };
    } else {
      console.log('😔 You lost');
      return { yourResult: 'loser', opponentResult: 'winner' };
    }
  }

  // ========== UPDATED: Player Performance with Score/Balls Format ==========
  function populatePlayerPerformance(playerType, stats, totalRuns) {
    // UPDATED: Batting Stats with Score/Balls Format
    const runsEl = document.getElementById(`${playerType}-runs`);
    const ballsEl = document.getElementById(`${playerType}-balls`);
    const strikeRateEl = document.getElementById(`${playerType}-strike-rate`);
    const wicketsLostEl = document.getElementById(`${playerType}-wickets-lost`);
    
    if (runsEl) runsEl.textContent = totalRuns;
    if (ballsEl) ballsEl.textContent = stats.ballsFaced;
    if (strikeRateEl) strikeRateEl.textContent = calculateStrikeRate(totalRuns, stats.ballsFaced);
    if (wicketsLostEl) wicketsLostEl.textContent = stats.wicketsLost;
    
    // Bowling Stats (unchanged)
    const wicketsTakenEl = document.getElementById(`${playerType}-wickets-taken`);
    const runsConcededEl = document.getElementById(`${playerType}-runs-conceded`);
    const economyEl = document.getElementById(`${playerType}-economy`);
    const oversBowledEl = document.getElementById(`${playerType}-overs-bowled`);
    
    if (wicketsTakenEl) wicketsTakenEl.textContent = stats.bowlingWickets;
    if (runsConcededEl) runsConcededEl.textContent = stats.runsConceded;
    if (oversBowledEl) oversBowledEl.textContent = (stats.ballsBowled / 6).toFixed(1);
    
    // Calculate Economy Rate (runs per over)
    if (economyEl) {
      const economy = stats.ballsBowled > 0 
        ? ((stats.runsConceded / stats.ballsBowled) * 6).toFixed(2)
        : '0.00';
      economyEl.textContent = economy;
    }
    
    console.log(`📊 Updated ${playerType} performance: ${totalRuns}/${stats.ballsFaced}, ${stats.bowlingWickets} wickets taken`);
  }

  // ========== IMPROVED: Player vs Opponent Result Screen Population ==========
  function populatePersonalResultScreen(data) {
    console.log('🏏 Populating result screen:', data);
    
    matchData = data;
    
    const results = determinePlayerResult(data.result);
    const won = results.yourResult === 'winner';
    updateGameStats(won);
    
    const final = data.final || {};
    const playerName = playerProfile.name || 'You';
    const opponentPlayerName = opponentName || 'Opponent';
    const myScore = playerStats.myStats.battingRuns;
    const opponentScore = playerStats.opponentStats.battingRuns;
    
    // Update match header
    const matchFormat = document.getElementById('match-format');
    if (matchFormat) {
      const overs = Math.ceil((final.ballsUsed1 || 6) / 6);
      matchFormat.textContent = `T${overs} • ${overs} Over Match`;
    }
    
    // Update match result banner
    const matchResultBanner = document.getElementById('match-result-banner');
    const resultIcon = document.getElementById('result-icon');
    const winnerAnnouncement = document.getElementById('winner-announcement');
    const matchMargin = document.getElementById('match-margin');
    const matchOutcomeText = document.getElementById('match-outcome-text');
    
    // Remove previous classes
    if (matchResultBanner) {
      matchResultBanner.classList.remove('winner', 'loser', 'tie');
    }
    
    if (results.yourResult === 'winner') {
      const margin = myScore - opponentScore;
      if (matchResultBanner) matchResultBanner.classList.add('winner');
      if (resultIcon) resultIcon.textContent = '🏆';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `${playerName} Won!`;
      if (matchMargin) matchMargin.textContent = `Won by ${margin} runs`;
    } else if (results.yourResult === 'loser') {
      const margin = opponentScore - myScore;
      if (matchResultBanner) matchResultBanner.classList.add('loser');
      if (resultIcon) resultIcon.textContent = '😔';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `${opponentPlayerName} Won!`;
      if (matchMargin) matchMargin.textContent = `Lost by ${margin} runs`;
    } else {
      if (matchResultBanner) matchResultBanner.classList.add('tie');
      if (resultIcon) resultIcon.textContent = '🤝';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `Match Tied!`;
      if (matchMargin) matchMargin.textContent = `Both scored ${myScore} runs`;
      if (matchOutcomeText) matchOutcomeText.textContent = `Both players scored exactly ${myScore} runs each`;
    }
    
    // Update player names
    const yourNameDisplay = document.getElementById('your-name-display');
    const opponentNameDisplay = document.getElementById('opponent-name-display');
    
    if (yourNameDisplay) yourNameDisplay.textContent = playerName;
    if (opponentNameDisplay) opponentNameDisplay.textContent = opponentPlayerName;
    
    // Populate YOUR performance (with new format)
    populatePlayerPerformance('your', playerStats.myStats, myScore);
    
    // Populate OPPONENT performance (with new format)
    populatePlayerPerformance('opponent', playerStats.opponentStats, opponentScore);
    
    // Update match highlights
    updateMatchHighlights(results.yourResult, playerName, opponentPlayerName);
    
    // Show popup after delay
    setTimeout(() => {
      showPersonalResultPopup();
    }, 1000);
    
    console.log('Result screen populated with score/balls format');
  }

  function updateMatchHighlights(result, playerName, opponentName) {
    const playerOfMatch = document.getElementById('player-of-match');
    const bestBowlingFigures = document.getElementById('best-bowling-figures');
    
    // Player of the Match
    if (playerOfMatch) {
      if (result === 'winner') {
        playerOfMatch.textContent = playerName;
      } else if (result === 'loser') {
        playerOfMatch.textContent = opponentName;
      } else {
        // For tie, give it to better bowling figures
        if (playerStats.myStats.bowlingWickets >= playerStats.opponentStats.bowlingWickets) {
          playerOfMatch.textContent = playerName;
        } else {
          playerOfMatch.textContent = opponentName;
        }
      }
    }
    
    // Best Bowling Figures (format: wickets/runs)
    if (bestBowlingFigures) {
      const myFigures = `${playerStats.myStats.bowlingWickets}/${playerStats.myStats.runsConceded}`;
      const oppFigures = `${playerStats.opponentStats.bowlingWickets}/${playerStats.opponentStats.runsConceded}`;
      
      if (playerStats.myStats.bowlingWickets > playerStats.opponentStats.bowlingWickets) {
        bestBowlingFigures.textContent = `${playerName}: ${myFigures}`;
      } else if (playerStats.opponentStats.bowlingWickets > playerStats.myStats.bowlingWickets) {
        bestBowlingFigures.textContent = `${opponentName}: ${oppFigures}`;
      } else {
        // Same wickets, compare runs conceded (lower is better)
        if (playerStats.myStats.runsConceded <= playerStats.opponentStats.runsConceded) {
          bestBowlingFigures.textContent = `${playerName}: ${myFigures}`;
        } else {
          bestBowlingFigures.textContent = `${opponentName}: ${oppFigures}`;
        }
      }
    }
  }

  // ========== UPDATED: Score-based Result Popup with Wickets Taken ==========
  function showPersonalResultPopup() {
    console.log('🏏 Showing result popup with wickets taken');
    
    if (!personalResultPopup) return;
    
    const results = determinePlayerResult(matchData.result);
    const playerName = playerProfile.name || 'You';
    const myScore = playerStats.myStats.battingRuns;
    const opponentScore = playerStats.opponentStats.battingRuns;
    
    // Update popup content
    const personalResultHeading = document.getElementById('personal-result-heading');
    const personalResultMessage = document.getElementById('personal-result-message');
    const personalResultIcon = document.getElementById('personal-result-icon');
    const winnerAnnouncement = document.getElementById('winner-announcement');
    const yourFinalScore = document.getElementById('your-final-score');
    const opponentFinalScore = document.getElementById('opponent-final-score');
    const celebrationContainer = document.querySelector('.celebration-container.personal-result');
    
    // Update scores in popup
    if (yourFinalScore) yourFinalScore.textContent = myScore;
    if (opponentFinalScore) opponentFinalScore.textContent = opponentScore;
    
    // Remove previous result classes
    if (celebrationContainer) {
      celebrationContainer.classList.remove('winner-result', 'loser-result', 'tie-result');
    }
    
    if (results.yourResult === 'winner') {
      if (personalResultHeading) personalResultHeading.textContent = '🏆 You Won!';
      if (personalResultMessage) personalResultMessage.textContent = `${playerName} scored higher and won!`;
      if (personalResultIcon) personalResultIcon.textContent = '🏆';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `🏆 ${playerName} Won! (${myScore} > ${opponentScore})`;
      if (celebrationContainer) celebrationContainer.classList.add('winner-result');
    } else if (results.yourResult === 'loser') {
      if (personalResultHeading) personalResultHeading.textContent = '😔 You Lost';
      if (personalResultMessage) personalResultMessage.textContent = `${opponentName} scored higher.`;
      if (personalResultIcon) personalResultIcon.textContent = '😔';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `😔 ${opponentName} Lost! (${opponentScore} > ${myScore})`;
      if (celebrationContainer) celebrationContainer.classList.add('loser-result');
    } else {
      if (personalResultHeading) personalResultHeading.textContent = '🤝 Match Tied!';
      if (personalResultMessage) personalResultMessage.textContent = `Both scored equally!`;
      if (personalResultIcon) personalResultIcon.textContent = '🤝';
      if (winnerAnnouncement) winnerAnnouncement.textContent = `🤝 Match Tied! (${myScore} = ${opponentScore})`;
      if (celebrationContainer) celebrationContainer.classList.add('tie-result');
    }
    
    // UPDATED: Update quick stats with separated wickets showing WICKETS TAKEN
    const quickRuns = document.getElementById('quick-runs');
    const quickBalls = document.getElementById('quick-balls');
    const quickWickets = document.getElementById('quick-wickets');
    
    if (quickRuns) quickRuns.textContent = playerStats.myStats.battingRuns;
    if (quickBalls) quickBalls.textContent = playerStats.myStats.ballsFaced;
    
    // UPDATED: Show wickets taken by the player (bowling wickets) - This is the key change
    if (quickWickets) quickWickets.textContent = playerStats.myStats.bowlingWickets;
    
    console.log(`📊 Player batting: ${playerStats.myStats.battingRuns}/${playerStats.myStats.ballsFaced}`);
    console.log(`📊 Player bowling wickets taken: ${playerStats.myStats.bowlingWickets}`);
    
    personalResultPopup.classList.remove('hidden');
    personalResultPopup.classList.add('visible');
    personalResultPopup.style.display = 'flex';
  }

  function hidePersonalResultPopup() {
    if (personalResultPopup) {
      personalResultPopup.classList.add('hidden');
      personalResultPopup.classList.remove('visible');
      personalResultPopup.style.display = 'none';
    }
  }

  // ========== Reset Functions ==========
  function resetPlayerStats() {
    playerStats = {
      myStats: {
        battingRuns: 0,
        ballsFaced: 0,
        wicketsLost: 0,
        bowlingWickets: 0,
        runsConceded: 0,
        ballsBowled: 0
      },
      opponentStats: {
        battingRuns: 0,
        ballsFaced: 0,
        wicketsLost: 0,
        bowlingWickets: 0,
        runsConceded: 0,
        ballsBowled: 0
      }
    };
    currentInnings = 1;
    firstInningsBattingTeam = null;
    console.log('Player stats reset');
  }

  function closeWebSocketConnection() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('Closing WebSocket connection');
      ws.close();
    }
    ws = null;
    isConnected = false;
  }

  function resetGameState() {
    console.log('Resetting game state');
    
    closeWebSocketConnection();
    
    myId = null;
    gameOver = false;
    myRole = null;
    isFlipper = false;
    myTossSide = null;
    matchData = null;
    opponentName = 'Opponent';
    
    resetPlayerStats();
    resetHUD();
    
    if (startScreen) startScreen.classList.remove('hidden');
    if (gameScreen) gameScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (tossScreen) tossScreen.classList.add('hidden');
    
    hidePersonalResultPopup();
    updateConnectionStatus();
    if (oversSelect) oversSelect.value = '1';
  }

  function initializeGame() {
    console.log('Initializing Hand Cricket game with wickets taken feature...');
    
    loadProfile();
    resetHUD();
    resetPlayerStats();
    
    if (startScreen) {
      startScreen.classList.remove('hidden');
      console.log('Start screen shown');
    }
    if (gameScreen) gameScreen.classList.add('hidden');
    if (resultScreen) resultScreen.classList.add('hidden');
    if (tossScreen) tossScreen.classList.add('hidden');
    
    hidePersonalResultPopup();
    updateConnectionStatus();
    
    if (oversSelect) {
      oversSelect.value = '1';
    }
    
    console.log('Game initialization complete with wickets taken feature');
  }

  // ========== WebSocket Connection ==========
  connectButton?.addEventListener('click', () => {
    if (!playerProfile.name.trim()) {
      alert('Please enter your name before connecting.');
      playerNameInput?.focus();
      return;
    }

    if (isConnected || ws) return;

    connectionStatus.textContent = 'Connecting...';
    connectButton.disabled = true;

    const url = 'ws://localhost:8080';
    ws = new WebSocket(url);

    ws.onopen = () => {
      isConnected = true;
      connectionStatus.textContent = 'Connected! Sending overs selection...';
      
      const overs = parseInt(oversSelect?.value || '1', 10);
      ws.send(JSON.stringify({ 
        type: 'setOvers', 
        overs, 
        playerName: playerProfile.name || 'Anonymous Player' 
      }));
    };

    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      switch (data.type) {
        case 'hello':
          connectionStatus.textContent = data.message || 'Connected.';
          if (data.id) myId = data.id;
          console.log('Player ID assigned:', myId);
          break;

        case 'status':
          connectionStatus.textContent = data.message || '';
          break;

        case 'oversAccepted':
          connectionStatus.textContent = `${data.overs} over(s) selected. Waiting for opponent...`;
          break;

        case 'full':
          alert(data.message || 'Room is full. Try again later.');
          connectionStatus.textContent = 'Room full.';
          connectButton.disabled = false;
          try { ws.close(); } catch {}
          return;

        case 'tossStart':
          goToToss();
          break;

        case 'tossSideAck':
          if (data.ok) {
            myTossSide = data.yourSide;
            if (tossSideStatus) {
              const waitFor = myTossSide === 'heads' ? 'tails' : 'heads';
              tossSideStatus.textContent = `You chose ${myTossSide}. Waiting for opponent to pick ${waitFor}...`;
            }
            if (chooseHeadsBtn) chooseHeadsBtn.disabled = true;
            if (chooseTailsBtn) chooseTailsBtn.disabled = true;
          } else {
            if (tossSideStatus) tossSideStatus.textContent = data.message || 'Side already taken. Choose the other side.';
          }
          break;

        case 'tossSidesLocked':
          tossChooseSide?.classList.add('hidden');
          tossFlip?.classList.remove('hidden');
          isFlipper = !!data.youAreFlipper;
          if (tossFlipStatus) {
            tossFlipStatus.textContent = isFlipper ? 'You will flip the coin.' : 'Opponent will flip the coin.';
          }
          if (flipCoinBtn) flipCoinBtn.disabled = !isFlipper;
          break;

        case 'tossResult':
          if (coinEl) {
            coinEl.classList.remove('flip-anim');
            void coinEl.offsetWidth;
            coinEl.classList.add('flip-anim');
            setTimeout(() => {
              coinEl.style.transform = data.outcome === 'heads' ? 'rotateY(0deg)' : 'rotateY(180deg)';
            }, 1100);
          }
          if (tossFlipStatus) {
            tossFlipStatus.textContent = `Result: ${String(data.outcome).toUpperCase()}`;
            if (data.winnerId !== myId) {
              tossFlipStatus.textContent += '. Waiting for toss winner to choose batting/bowling...';
            }
          }
          
          const winnerSide = data.winnerSide || data.outcome;
          
          if (data.winnerId === myId) {
            tossFlip?.classList.add('hidden');
            tossWinnerChoose?.classList.remove('hidden');
            if (tossWinnerText) {
              tossWinnerText.textContent = `You won the toss (picked ${winnerSide})! Choose to bat or bowl first.`;
            }
          }
          break;

        case 'rolesAssigned':
          myRole = data.yourRole;
          if (roleInfo) roleInfo.textContent = `You are ${myRole}.`;
          
          if (currentInnings === 1) {
            firstInningsBattingTeam = myRole === 'batting' ? 'batting' : 'bowling';
          }
          
          console.log('Role assigned:', myRole);
          console.log('First innings batting team:', firstInningsBattingTeam);
          
          goToGame();
          setStatus('Make your move!');
          enableControls(true);
          
          // Initialize ball indicators for new innings
          initializeBallIndicators(6);
          break;

        case 'inningsChange':
          currentInnings = 2;
          console.log('Innings changed to:', currentInnings);
          setStatus(data.message || 'Innings 2 begins.');
          enableControls(false);
          
          resetBallIndicators();
          setTimeout(() => initializeBallIndicators(6), 1000);
          break;

        case 'update': {
          if (typeof data.innings !== 'undefined') {
            currentInnings = data.innings;
            const inningsText = data.innings === 1 
              ? 'Innings 1 in progress' 
              : `Innings 2 - Target: ${data.target || 0}`;
            setStatus(inningsText);
            
            if (data.innings === 2 && data.target && data.score < data.target) {
              const need = data.target - data.score;
              const ballsLeft = data.ballsLimit - data.ballsUsed;
              setStatus(`${inningsText} | Need ${need} in ${ballsLeft} balls`, 'warning');
            }
          }
          
          if (scoreInfo) scoreInfo.textContent = `Score: ${data.score}/${data.wickets}`;
          if (ballsInfo) ballsInfo.textContent = `Balls: ${data.ballsUsed} / ${data.ballsLimit}`;
          
          if (!gameOver) enableControls(true);
          break;
        }

        case 'result':
          if (data.outcome === 'out') {
            setStatus(`OUT! Both chose ${data.batsmanChoice}.`, 'danger');
            updateBallIndicator(0, true);
          } else {
            const runs = data.runs || 0;
            setStatus(`${runs} run(s) scored! (Bat: ${data.batsmanChoice}, Ball: ${data.bowlerChoice})`, 'success');
            updateBallIndicator(runs, false);
            
            // Special messages for boundaries
            if (runs === 4) {
              setTimeout(() => setStatus('🏏 FOUR! Boundary!', 'success'), 1000);
            } else if (runs === 6) {
              setTimeout(() => setStatus('🏏 SIX! Maximum!', 'success'), 1000);
            }
          }
          
          currentOverBalls++;
          totalBallsInInnings++;
          
          if (currentOverBalls >= 6) {
            currentOver++;
            currentOverBalls = 0;
            
            setTimeout(() => {
              if (!gameOver) {
                setTimeout(() => initializeBallIndicators(6), 1000);
              }
            }, 500);
          }
          
          updatePlayerStats(data);
          
          enableControls(false);
          setTimeout(() => { if (!gameOver) enableControls(true); }, 800);
          break;

        case 'matchOver':
          console.log('Match over received:', data);
          gameOver = true;
          enableControls(false);
          
          if (data.playerNames) {
            const myPlayerKey = myId === 1 ? 'player1' : 'player2';
            const opponentKey = myId === 1 ? 'player2' : 'player1';
            opponentName = data.playerNames[opponentKey] || 'Opponent';
          }
          
          closeWebSocketConnection();
          goToResult(data);
          
          console.log('Match ended. Connection closed.');
          break;

        case 'reset':
          alert(data.message || 'Opponent disconnected.');
          resetGameState();
          goToStart();
          break;

        case 'error':
          setStatus(data.message || 'Server error.', 'danger');
          break;
      }
    };

    ws.onclose = () => {
      isConnected = false;
      if (!gameOver) {
        connectionStatus.textContent = 'Disconnected. Please reconnect.';
      }
      enableControls(false);
      updateConnectionStatus();
      ws = null;
    };

    ws.onerror = () => {
      connectionStatus.textContent = 'Connection failed. Is the server running?';
      enableControls(false);
      updateConnectionStatus();
    };
  });

  // ========== Toss Event Handlers ==========
  chooseHeadsBtn?.addEventListener('click', () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tossChooseSide', side: 'heads' }));
    }
  });

  chooseTailsBtn?.addEventListener('click', () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tossChooseSide', side: 'tails' }));
    }
  });

  flipCoinBtn?.addEventListener('click', () => {
    if (ws?.readyState === WebSocket.OPEN && isFlipper) {
      flipCoinBtn.disabled = true;
      if (tossFlipStatus) tossFlipStatus.textContent = 'Flipping...';
      ws.send(JSON.stringify({ type: 'tossFlip' }));
    }
  });

  chooseBattingBtn?.addEventListener('click', () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tossChooseRole', role: 'batting' }));
    }
  });

  chooseBowlingBtn?.addEventListener('click', () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'tossChooseRole', role: 'bowling' }));
    }
  });

  // ========== Game Choice Event Handlers ==========
  choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!ws || ws.readyState !== WebSocket.OPEN || gameOver) return;

      const choice = parseInt(button.textContent, 10);
      if (!Number.isInteger(choice) || choice < 0 || choice > 6) return;

      ws.send(JSON.stringify({ type: 'choice', value: choice }));
      setStatus('Move sent! Waiting for opponent...', 'warning');
      enableControls(false);
    });
  });

  // ========== Result Popup Event Handlers ==========
  personalResultOk?.addEventListener('click', () => {
    hidePersonalResultPopup();
  });

  personalResultPopup?.addEventListener('click', (e) => {
    if (e.target === personalResultPopup) {
      hidePersonalResultPopup();
    }
  });

  playAgainButton?.addEventListener('click', () => {
    console.log('Play again clicked - resetting for new match');
    resetGameState();
    goToStart();
  });

  exitButton?.addEventListener('click', () => {
    console.log('Exit button clicked - returning to home screen');
    resetGameState();
    goToStart();
  });

  // ========== Initialize Game ==========
  setTimeout(() => {
    initializeGame();
  }, 100);
  
  console.log('🏏 Hand Cricket Game setup complete with Wickets Taken Feature');
  console.log('🔴 Features: Ball indicators, Score/Balls format, Wickets Taken display');
  console.log('📊 Wickets Section: Red background, shows bowling wickets taken by player');
  console.log('❌ No spellcheck attributes in profile inputs');
});
