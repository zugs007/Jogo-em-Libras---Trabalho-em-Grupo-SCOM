class GameModel {
  constructor(canvasWidth, canvasHeight, isCompact = false) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.isCompact = isCompact;

    // Adicione quantas palavras/frases quiser aqui (MAIÚSCULAS, sem acento/Ç e até 12 caracteres)
    this.phrases = [
      "AMOR",
      "VIDA",
      "CASA",
      "UNESP",
      "LIBRAS",
      "AMIGO",
      "ESCOLA",
      "BRASIL",
      "FUTURO",
      "OLA MUNDO",
      "INCLUSAO",
      "RESPEITO",
      "EDUCACAO",
      "APRENDER",
      "COMUNIDADE"
    ];

    // Catálogo de Skins (Base + 9 Professores = 10 cards, 5 por fileira)
    this.skins = [
      { id: "default", name: "Padrão", unlockScore: 0 },
      { id: "prof1", name: '"parsec"', unlockScore: 200 },
      { id: "prof2", name: '"skywalker"', unlockScore: 450 },
      { id: "prof3", name: '"eurística"', unlockScore: 700 },
      { id: "prof4", name: '"já fizeram?"', unlockScore: 1000 },
      { id: "prof5", name: '"cachaça"', unlockScore: 1350 },
      { id: "prof6", name: '"capacitivo"', unlockScore: 1750 },
      { id: "prof8", name: '"bonequinho"', unlockScore: 2200 },
      { id: "prof7", name: '"matlab"', unlockScore: 2700 },
      { id: "prof9", name: '"boss final"', unlockScore: 3300 }
    ];

    this.shuffledPhrases = [];
    this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    this.enemyManager = new EnemyManager();
    this.difficulty = "easy"; // "easy" | "hard"
    this.highScore = Number(localStorage.getItem("librasQuestHighScore")) || 0;

    const savedSkin = localStorage.getItem("librasQuestSelectedSkin") || "default";
    this.selectedSkin = this.isSkinUnlocked(savedSkin) ? savedSkin : "default";

    this.resetGame();
  }

  getLayoutMetrics() {
    const playerSize = this.isCompact ? 54 : 48;
    const trayH = this.isCompact ? 216 : 138;
    const trayY = this.height - trayH - 8;
    const minY = 128;
    const maxY = this.height - playerSize - 10;
    const centerArenaY = Math.round((192 + trayY) / 2 - playerSize / 2);

    return { playerSize, trayH, trayY, minY, maxY, centerArenaY };
  }

  setViewport(canvasWidth, canvasHeight, isCompact) {
    if (this.width === canvasWidth && this.height === canvasHeight && this.isCompact === isCompact) {
      return;
    }

    this.width = canvasWidth;
    this.height = canvasHeight;
    this.isCompact = isCompact;

    const { playerSize, minY, maxY, centerArenaY } = this.getLayoutMetrics();

    if (this.player) {
      this.player.width = playerSize;
      this.player.height = playerSize;
      this.player.x = Math.max(24, Math.min(this.width - playerSize - 24, this.width / 2 - playerSize / 2));
      this.player.y = Math.max(minY, Math.min(maxY, centerArenaY));
    }

    this.enemyManager.spawnForPhase(this);

    if (this.currentPhrase) {
      this.layoutPhraseItems(this.currentPhrase);
    }
  }

  isSkinUnlocked(skinId) {
    const skin = this.skins.find((s) => s.id === skinId);
    if (!skin) return false;
    return this.highScore >= skin.unlockScore;
  }

  selectSkin(skinId) {
    if (!this.isSkinUnlocked(skinId)) return false;
    this.selectedSkin = skinId;
    localStorage.setItem("librasQuestSelectedSkin", skinId);
    return true;
  }

  setHighScore(newScore) {
    const validScore = Math.max(0, Math.floor(Number(newScore) || 0));
    this.highScore = validScore;
    this.runStartHighScore = validScore;
    localStorage.setItem("librasQuestHighScore", String(this.highScore));

    if (!this.isSkinUnlocked(this.selectedSkin)) {
      this.selectedSkin = "default";
      localStorage.setItem("librasQuestSelectedSkin", "default");
    }
  }

  setDifficulty(mode) {
    this.difficulty = mode === "hard" ? "hard" : "easy";
  }

  shufflePhrases() {
    const list = [...this.phrases];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  resetGame() {
    this.score = 0;
    this.phrasesCompleted = 0;
    this.currentPhraseIndex = 0;
    this.shuffledPhrases = this.shufflePhrases();
    this.timeLeft = 300;
    this.phraseStartTime = 300;
    this.runStartHighScore = this.highScore;
    this.isGameOver = false;
    this.isChecking = false;
    this.isPaused = false;
    this.feedbackMessage =
      this.difficulty === "easy"
        ? "Modo Fácil: passe sobre a carta para ver a letra e desvie da nuvem!"
        : "Modo Difícil: identifique os sinais de memória e desvie das nuvens!";

    const { playerSize, centerArenaY } = this.getLayoutMetrics();

    this.player = {
      x: this.width / 2 - playerSize / 2,
      y: centerArenaY,
      width: playerSize,
      height: playerSize,
      speed: 5,
      carriedCard: null,
      invulnFrames: 0
    };

    this.enemyManager.spawnForPhase(this);

    this.slots = [];
    this.deckCards = [];
    this.loadPhrase(this.currentPhraseIndex);
  }

  togglePause() {
    if (this.isGameOver || this.isChecking) return this.isPaused;
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  skipPhaseForDebug() {
    if (this.isGameOver || this.isPaused) return;
    this.currentPhraseIndex++;
    this.loadPhrase(this.currentPhraseIndex);
    this.feedbackMessage = "⏭️ Fase pulada (modo teste — sem pontos).";
  }

  loadPhrase(index) {
    if (index > 0 && index % this.shuffledPhrases.length === 0) {
      this.shuffledPhrases = this.shufflePhrases();
    }

    const phrase = this.shuffledPhrases[index % this.shuffledPhrases.length];
    this.currentPhrase = phrase;
    this.phraseStartTime = this.timeLeft;
    this.isChecking = false;
    this.player.carriedCard = null;

    const requiredLetters = [];
    for (let i = 0; i < phrase.length; i++) {
      if (phrase[i] !== " ") {
        requiredLetters.push(phrase[i]);
      }
    }

    const extraCount = Math.min(4, 12 - requiredLetters.length);
    const poolLetters = [...requiredLetters];

    for (let i = 0; i < extraCount; i++) {
      const randomChar = this.alphabet[Math.floor(Math.random() * this.alphabet.length)];
      poolLetters.push(randomChar);
    }

    for (let i = poolLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolLetters[i], poolLetters[j]] = [poolLetters[j], poolLetters[i]];
    }

    this.deckCards = poolLetters.map((letter, idx) => ({
      id: idx,
      letter,
      colorTheme: idx % 2 === 0 ? "yellow" : "blue",
      x: 0,
      y: 0,
      homeX: 0,
      homeY: 0,
      width: 56,
      height: 68,
      homeW: 56,
      homeH: 68,
      isPlaced: false
    }));

    this.slots = phrase.split("").map((char) => ({
      isSpace: char === " ",
      char,
      x: 0,
      y: 102,
      width: 56,
      height: 68,
      placedCard: null,
      status: "empty"
    }));

    this.layoutPhraseItems(phrase);
    this.enemyManager.spawnForPhase(this);
  }

  layoutPhraseItems(phrase) {
    const gap = this.isCompact ? 6 : 10;
    const maxSlotsWidth = this.width - 68;
    const slotW = Math.min(58, Math.floor((maxSlotsWidth - (phrase.length - 1) * gap) / phrase.length));
    const slotH = this.isCompact ? Math.max(54, Math.min(70, Math.round(slotW * 1.22))) : 68;
    const totalWidth = phrase.length * (slotW + gap) - gap;
    const startX = (this.width - totalWidth) / 2;
    const slotY = 102;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.x = startX + i * (slotW + gap);
      slot.y = slotY;
      slot.width = slotW;
      slot.height = slotH;

      if (slot.placedCard) {
        slot.placedCard.width = slotW;
        slot.placedCard.height = slotH;
        slot.placedCard.x = slot.x;
        slot.placedCard.y = slot.y;
      }
    }

    const totalCards = this.deckCards.length;

    if (this.isCompact) {
      const cardW = 62;
      const cardH = 74;
      const cardGap = 12;
      const row1Count = Math.ceil(totalCards / 2);
      const row2Count = totalCards - row1Count;
      const row1Y = this.height - 196;
      const row2Y = this.height - 112;

      this.deckCards.forEach((card, idx) => {
        const isRow1 = idx < row1Count;
        const col = isRow1 ? idx : idx - row1Count;
        const colsInRow = isRow1 ? row1Count : row2Count;
        const rowWidth = colsInRow * (cardW + cardGap) - cardGap;
        const rowStartX = (this.width - rowWidth) / 2;

        card.homeX = rowStartX + col * (cardW + cardGap);
        card.homeY = isRow1 ? row1Y : row2Y;
        card.homeW = cardW;
        card.homeH = cardH;

        if (!card.isPlaced && this.player.carriedCard !== card) {
          card.x = card.homeX;
          card.y = card.homeY;
          card.width = cardW;
          card.height = cardH;
        }
      });
    } else {
      const cardW = 58;
      const cardH = 70;
      const cardGap = 14;
      const deckTotalWidth = totalCards * (cardW + cardGap) - cardGap;
      const deckStartX = (this.width - deckTotalWidth) / 2;
      const deckY = this.height - 118;

      this.deckCards.forEach((card, idx) => {
        card.homeX = deckStartX + idx * (cardW + cardGap);
        card.homeY = deckY;
        card.homeW = cardW;
        card.homeH = cardH;

        if (!card.isPlaced && this.player.carriedCard !== card) {
          card.x = card.homeX;
          card.y = card.homeY;
          card.width = cardW;
          card.height = cardH;
        }
      });
    }
  }

  returnCardToDeck(card) {
    card.width = card.homeW;
    card.height = card.homeH;
    card.x = card.homeX;
    card.y = card.homeY;
    card.isPlaced = false;
  }

  movePlayer(keys) {
    if (this.isGameOver || this.isChecking || this.isPaused) return;

    if (keys["ArrowUp"] || keys["KeyW"]) this.player.y -= this.player.speed;
    if (keys["ArrowDown"] || keys["KeyS"]) this.player.y += this.player.speed;
    if (keys["ArrowLeft"] || keys["KeyA"]) this.player.x -= this.player.speed;
    if (keys["ArrowRight"] || keys["KeyD"]) this.player.x += this.player.speed;

    const { minY, maxY } = this.getLayoutMetrics();
    this.player.x = Math.max(24, Math.min(this.width - this.player.width - 24, this.player.x));
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

    if (this.player.carriedCard) {
      this.player.carriedCard.x = this.player.x + (this.player.width - this.player.carriedCard.width) / 2;
      this.player.carriedCard.y = this.player.y - 38;
    }
  }

  updateObstacles() {
    this.enemyManager.update(this);
  }

  checkCollision(a, b, margin = 2) {
    return (
      a.x - margin < b.x + b.width &&
      a.x + a.width + margin > b.x &&
      a.y - margin < b.y + b.height &&
      a.y + a.height + margin > b.y
    );
  }

  getClosestColliding(items, margin = 2) {
    const pCenterX = this.player.x + this.player.width / 2;
    const pCenterY = this.player.y + this.player.height / 2;

    let closestItem = null;
    let minDistance = Infinity;

    for (const item of items) {
      if (this.checkCollision(this.player, item, margin)) {
        const iCenterX = item.x + item.width / 2;
        const iCenterY = item.y + item.height / 2;
        const dist = Math.hypot(pCenterX - iCenterX, pCenterY - iCenterY);

        if (dist < minDistance) {
          minDistance = dist;
          closestItem = item;
        }
      }
    }

    return closestItem;
  }

  interact() {
    if (this.isGameOver || this.isChecking || this.isPaused) return;

    if (!this.player.carriedCard) {
      const availableCards = this.deckCards.filter((c) => !c.isPlaced);
      const targetCard = this.getClosestColliding(availableCards, 2);

      if (targetCard) {
        this.player.carriedCard = targetCard;
        this.feedbackMessage = "Leve a carta até o espaço abaixo da letra e solte!";
        return;
      }

      const filledSlots = this.slots.filter((s) => !s.isSpace && s.placedCard);
      const targetSlot = this.getClosestColliding(filledSlots, 2);

      if (targetSlot) {
        const card = targetSlot.placedCard;
        targetSlot.placedCard = null;
        targetSlot.status = "empty";
        card.isPlaced = false;
        card.width = card.homeW;
        card.height = card.homeH;
        this.player.carriedCard = card;
        this.feedbackMessage = "Carta retirada! Reposicione ou solte para devolver.";
        return;
      }
    } else {
      const emptySlots = this.slots.filter((s) => !s.isSpace && !s.placedCard);
      const targetSlot = this.getClosestColliding(emptySlots, 2);

      if (targetSlot) {
        const card = this.player.carriedCard;
        card.width = targetSlot.width;
        card.height = targetSlot.height;
        card.x = targetSlot.x;
        card.y = targetSlot.y;
        card.isPlaced = true;
        targetSlot.placedCard = card;
        targetSlot.status = "filled";
        this.player.carriedCard = null;
        this.feedbackMessage = "Carta encaixada! Complete a frase e clique em Verificar.";
        return;
      }

      this.returnCardToDeck(this.player.carriedCard);
      this.player.carriedCard = null;
      this.feedbackMessage = "Carta devolvida ao baralho inferior.";
    }
  }

  verifyPhrase(onNextPhraseCallback) {
    if (this.isGameOver || this.isChecking || this.isPaused) return;

    const letterSlots = this.slots.filter((s) => !s.isSpace);
    const allFilled = letterSlots.every((s) => s.placedCard !== null);

    if (!allFilled) {
      this.feedbackMessage = "⚠️ Preencha todos os espaços antes de verificar!";
      return;
    }

    this.isChecking = true;
    let correctCount = 0;

    for (const slot of letterSlots) {
      if (slot.placedCard.letter === slot.char) {
        slot.status = "correct";
        correctCount++;
      } else {
        slot.status = "wrong";
      }
    }

    const isPerfect = correctCount === letterSlots.length;
    const timeSpent = Math.max(0, this.phraseStartTime - this.timeLeft);
    const speedBonus = isPerfect ? Math.max(0, 30 - timeSpent) * 2 : 0;
    const basePoints = correctCount * 20 + (isPerfect ? 50 : 0) + speedBonus;
    const multiplier = this.difficulty === "hard" ? 1.5 : 1;
    const earnedPoints = Math.round(basePoints * multiplier);

    this.score += earnedPoints;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("librasQuestHighScore", String(this.highScore));
    }

    if (isPerfect) {
      this.phrasesCompleted++;
      const hardTag = this.difficulty === "hard" ? " • Bônus Difícil 1.5x" : "";
      this.feedbackMessage = `✅ Perfeito! +${earnedPoints} pts (Agilidade: +${speedBonus}${hardTag})!`;
    } else {
      this.feedbackMessage = `❌ Você acertou ${correctCount}/${letterSlots.length} letras (+${earnedPoints} pts). Veja em vermelho o que errou!`;
    }

    setTimeout(() => {
      if (!this.isGameOver) {
        this.currentPhraseIndex++;
        this.loadPhrase(this.currentPhraseIndex);
        this.feedbackMessage = "Nova frase! Combine os sinais em Libras.";
        if (onNextPhraseCallback) onNextPhraseCallback();
      }
    }, 2000);
  }
}