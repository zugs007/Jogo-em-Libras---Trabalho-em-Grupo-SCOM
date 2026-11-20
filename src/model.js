class GameModel {
  constructor(canvasWidth, canvasHeight) {
    this.width = canvasWidth;
    this.height = canvasHeight;

    // Lista de frases ordenadas por dificuldade progressiva
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
    this.timeLeft = 300; // 5 minutos (300 segundos)
    this.isGameOver = false;
    this.isChecking = false;
    this.feedbackMessage = "Pegue a carta em Libras correspondente à letra!";

    this.player = {
      x: this.width / 2 - 24,
      y: 245,
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
    this.isChecking = false;
    this.player.carriedCard = null;

    // 1. Montar os slots da Zona Superior
    const slotW = 56;
    const slotH = 68;
    const gap = 10;
    const totalWidth = phrase.length * (slotW + gap) - gap;
    const startX = (this.width - totalWidth) / 2;
    const slotY = 75;

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
          status: "empty" // empty | filled | correct | wrong
        });
      }
    }

    // 2. Montar o Deck da Zona Inferior (letras necessárias + letras extras embaralhadas)
    const extraCount = Math.min(4, 12 - requiredLetters.length);
    const poolLetters = [...requiredLetters];

    for (let i = 0; i < extraCount; i++) {
      const randomChar = this.alphabet[Math.floor(Math.random() * this.alphabet.length)];
      poolLetters.push(randomChar);
    }

    // Embaralhar cartas
    for (let i = poolLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [poolLetters[i], poolLetters[j]] = [poolLetters[j], poolLetters[i]];
    }

    const cardW = 58;
    const cardH = 72;
    const cardGap = 14;
    const deckTotalWidth = poolLetters.length * (cardW + cardGap) - cardGap;
    const deckStartX = (this.width - deckTotalWidth) / 2;
    const deckY = 425;

    this.deckCards = poolLetters.map((letter, idx) => {
      const x = deckStartX + idx * (cardW + cardGap);
      return {
        id: idx,
        letter,
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

    // Limites da tela (abaixo do cabeçalho superior até o deck inferior)
    const minY = 145;
    const maxY = this.height - this.player.height - 10;
    this.player.x = Math.max(10, Math.min(this.width - this.player.width - 10, this.player.x));
    this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

    // Se estiver carregando uma carta, ela acompanha o personagem
    if (this.player.carriedCard) {
      this.player.carriedCard.x = this.player.x + (this.player.width - this.player.carriedCard.width) / 2;
      this.player.carriedCard.y = this.player.y - 36;
    }
  }

  checkCollision(a, b, margin = 8) {
    return (
      a.x - margin < b.x + b.width &&
      a.x + a.width + margin > b.x &&
      a.y - margin < b.y + b.height &&
      a.y + a.height + margin > b.y
    );
  }

  interact() {
    if (this.isGameOver || this.isChecking) return;

    // Caso 1: Jogador NÃO está segurando carta -> tenta pegar do deck ou retirar de um slot
    if (!this.player.carriedCard) {
      // Tenta pegar carta livre no deck
      for (const card of this.deckCards) {
        if (!card.isPlaced && this.checkCollision(this.player, card, 12)) {
          this.player.carriedCard = card;
          this.feedbackMessage = "Leve a carta até o espaço abaixo da letra e aperte Espaço!";
          return;
        }
      }

      // Tenta retirar carta já colocada em um slot (caso queira corrigir)
      for (const slot of this.slots) {
        if (!slot.isSpace && slot.placedCard && this.checkCollision(this.player, slot, 16)) {
          const card = slot.placedCard;
          slot.placedCard = null;
          slot.status = "empty";
          card.isPlaced = false;
          this.player.carriedCard = card;
          this.feedbackMessage = "Carta retirada do espaço. Reposicione ou solte no deck.";
          return;
        }
      }
    } else {
      // Caso 2: Jogador ESTÁ segurando carta -> tenta encaixar em um slot vazio
      for (const slot of this.slots) {
        if (!slot.isSpace && !slot.placedCard && this.checkCollision(this.player, slot, 18)) {
          const card = this.player.carriedCard;
          card.x = slot.x + (slot.width - card.width) / 2;
          card.y = slot.y + (slot.height - card.height) / 2;
          card.isPlaced = true;
          slot.placedCard = card;
          slot.status = "filled";
          this.player.carriedCard = null;
          this.feedbackMessage = "Carta posicionada! Complete a frase e aperte Enter para verificar.";
          return;
        }
      }

      // Se apertar Espaço longe dos slots, devolve a carta para o deck
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
      this.feedbackMessage = "⚠️ Preencha todos os espaços vazios antes de verificar!";
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

    const earnedPoints = correctCount * 20 + (correctCount === letterSlots.length ? 50 : 0);
    this.score += earnedPoints;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("librasQuestHighScore", String(this.highScore));
    }

    if (correctCount === letterSlots.length) {
      this.phrasesCompleted++;
      this.feedbackMessage = `✅ Perfeito! +${earnedPoints} pontos! Carregando próxima frase...`;
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