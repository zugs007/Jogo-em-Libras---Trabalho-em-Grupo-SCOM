class GameModel {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;

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

    this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    this.highScore = Number(localStorage.getItem("librasQuestHighScore")) || 0;

    this.resetGame();
  }

  resetGame() {
    this.score = 0;
    this.phrasesCompleted = 0;
    this.currentPhraseIndex = 0;
    this.timeLeft = 300;
    this.phraseStartTime = 300;
    this.isGameOver = false;
    this.isChecking = false;
    this.feedbackMessage = "Pegue o sinal em Libras correspondente à letra!";

    this.player = {
      x: this.width / 2 - 24,
      y: 250,
      width: 48,
      height: 48,
      speed: 5,
      carriedCard: null
    };

    this.slots = [];
    this.deckCards = [];
    this.loadPhrase(this.currentPhraseIndex);
  }

  loadPhrase(index) {
    const phrase = this.phrases[index % this.phrases.length];
    this.currentPhrase = phrase;
    this.phraseStartTime = this.timeLeft;
    this.isChecking = false;
    this.player.carriedCard = null;

    // 1. Slots da Zona Superior (alinhados ao quadro Azul Surdo)
    const slotW = 56;
    const slotH = 66;
    const gap = 10;
    const totalWidth = phrase.length * (slotW + gap) - gap;
    const startX = (this.width - totalWidth) / 2;
    const slotY = 82;

    this.slots = [];
    const requiredLetters = [];

    for (let i = 0; i < phrase.length; i++) {
      const char = phrase[i];
      const x = startX + i * (slotW + gap);
      if (char === " ") {
        this.slots.push({ isSpace: true, x, y: slotY, width: slotW, height: slotH });
      } else {
        requiredLetters.push(char);
        this.slots.push({
          isSpace: false,
          char,
          x,
          y: slotY,
          width: slotW,
          height: slotH,
          placedCard: null,
          status: "empty"
        });
      }
    }

    // 2. Deck da Zona Inferior (letras da frase + letras extras embaralhadas)
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

    const cardW = 58;
    const cardH = 72;
    const cardGap = 14;
    const deckTotalWidth = poolLetters.length * (cardW + cardGap) - cardGap;
    const deckStartX = (this.width - deckTotalWidth) / 2;
    const deckY = 432;

    this.deckCards = poolLetters.map((letter, idx) => {
      const x = deckStartX + idx * (cardW + cardGap);
      return {
        id: idx,
        letter,
        colorTheme: idx % 2 === 0 ? "yellow" : "blue",
        x,
        y: deckY,
        homeX: x,
        homeY: deckY,
        width: cardW,
        height: cardH,
        isPlaced: false
      };
    });
  }

  movePlayer(keys) {
    if (this.isGameOver || this.isChecking) return;

    if (keys["ArrowUp"] || keys["KeyW"]) this.player.y -= this.player.speed;
    if (keys["ArrowDown"] || keys["KeyS"]) this.player.y += this.player.speed;
    if (keys["ArrowLeft"] || keys["KeyA"]) this.player.x -= this.player.speed;
    if (keys["ArrowRight"] || keys["KeyD"]) this.player.x += this.player.speed;

    // Permite alcançar tanto os slots superiores quanto o baralho inferior
    const minY = 112;
    const maxY = this.height - this.player.height - 10;
    this.player.x = Math.max(24, Math.min(this.width - this.player.width - 24, this.player.x));
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

    if (this.player.carriedCard) {
      this.player.carriedCard.x = this.player.x + (this.player.width - this.player.carriedCard.width) / 2;
      this.player.carriedCard.y = this.player.y - 38;
    }
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
    if (this.isGameOver || this.isChecking) return;

    if (!this.player.carriedCard) {
      const availableCards = this.deckCards.filter((c) => !c.isPlaced);
      const targetCard = this.getClosestColliding(availableCards, 2);

      if (targetCard) {
        this.player.carriedCard = targetCard;
        this.feedbackMessage = "Leve a carta até o espaço abaixo da letra e aperte Espaço!";
        return;
      }

      const filledSlots = this.slots.filter((s) => !s.isSpace && s.placedCard);
      const targetSlot = this.getClosestColliding(filledSlots, 2);

      if (targetSlot) {
        const card = targetSlot.placedCard;
        targetSlot.placedCard = null;
        targetSlot.status = "empty";
        card.isPlaced = false;
        this.player.carriedCard = card;
        this.feedbackMessage = "Carta retirada! Reposicione ou aperte Espaço para devolver.";
        return;
      }
    } else {
      const emptySlots = this.slots.filter((s) => !s.isSpace && !s.placedCard);
      const targetSlot = this.getClosestColliding(emptySlots, 2);

      if (targetSlot) {
        const card = this.player.carriedCard;
        card.x = targetSlot.x + (targetSlot.width - card.width) / 2;
        card.y = targetSlot.y + (targetSlot.height - card.height) / 2;
        card.isPlaced = true;
        targetSlot.placedCard = card;
        targetSlot.status = "filled";
        this.player.carriedCard = null;
        this.feedbackMessage = "Carta encaixada! Complete a frase e aperte Enter para verificar.";
        return;
      }

      const card = this.player.carriedCard;
      card.x = card.homeX;
      card.y = card.homeY;
      this.player.carriedCard = null;
      this.feedbackMessage = "Carta devolvida ao baralho inferior.";
    }
  }

  verifyPhrase(onNextPhraseCallback) {
    if (this.isGameOver || this.isChecking) return;

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
    const earnedPoints = correctCount * 20 + (isPerfect ? 50 : 0) + speedBonus;

    this.score += earnedPoints;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("librasQuestHighScore", String(this.highScore));
    }

    if (isPerfect) {
      this.phrasesCompleted++;
      this.feedbackMessage = `✅ Perfeito! +${earnedPoints} pts (Bônus agilidade: +${speedBonus})!`;
    } else {
      this.feedbackMessage = `Você acertou ${correctCount}/${letterSlots.length} letras (+${earnedPoints} pts). Próxima frase...`;
    }

    setTimeout(() => {
      if (!this.isGameOver) {
        this.currentPhraseIndex++;
        this.loadPhrase(this.currentPhraseIndex);
        this.feedbackMessage = "Nova frase! Combine os sinais em Libras.";
        if (onNextPhraseCallback) onNextPhraseCallback();
      }
    }, 1600);
  }
}