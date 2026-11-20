class GameView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.images = {};
    this.loadImage("player", "assets/imagens/personagem.png");

    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
      this.loadImage(letter, `assets/imagens/${letter}.png`);
    });
  }

  loadImage(key, src) {
    const img = new Image();
    img.loaded = false;
    img.onload = () => {
      img.loaded = true;
    };
    img.src = src;
    this.images[key] = img;
  }

  render(model) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, model.width, model.height);

    // Identifica o único slot ou carta-alvo mais próximo para destacar
    const highlightedSlot = model.player.carriedCard
      ? model.getClosestColliding(model.slots.filter((s) => !s.isSpace && !s.placedCard), 2)
      : null;

    const highlightedCard = !model.player.carriedCard
      ? model.getClosestColliding(model.deckCards.filter((c) => !c.isPlaced), 2)
      : null;

    // 1. ZONA SUPERIOR (Frase e Slots)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, model.width, 160);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.feedbackMessage, model.width / 2, 24);

    for (const slot of model.slots) {
      if (slot.isSpace) continue;

      ctx.fillStyle = "#facc15";
      ctx.font = "bold 24px Segoe UI, sans-serif";
      ctx.fillText(slot.char, slot.x + slot.width / 2, slot.y - 10);

      let borderColor = "#64748b";
      let bgColor = "#0f172a";

      if (slot.status === "correct") {
        borderColor = "#22c55e";
        bgColor = "rgba(34, 197, 94, 0.25)";
      } else if (slot.status === "wrong") {
        borderColor = "#ef4444";
        bgColor = "rgba(239, 68, 68, 0.25)";
      } else if (highlightedSlot === slot) {
        borderColor = "#facc15";
      }

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 8);
      ctx.fill();
      ctx.stroke();
    }

    // 2. ZONA CENTRAL (Arena de Movimentação)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 160, model.width, 240);

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 400);
    ctx.lineTo(model.width, 400);
    ctx.stroke();

    // 3. ZONA INFERIOR (Deck de Cartas)
    ctx.fillStyle = "#162032";
    ctx.fillRect(0, 400, model.width, model.height - 400);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px Segoe UI, sans-serif";
    ctx.fillText("BARALHO DE SINAIS EM LIBRAS", model.width / 2, 416);

    for (const card of model.deckCards) {
      if (model.player.carriedCard && model.player.carriedCard.id === card.id) continue;
      this.drawCard(card, highlightedCard === card);
    }

    this.drawPlayer(model.player);

    if (model.player.carriedCard) {
      this.drawCard(model.player.carriedCard, true);
    }
  }

  drawCard(card, highlight) {
    const ctx = this.ctx;
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = highlight ? "#facc15" : "#38bdf8";
    ctx.lineWidth = highlight ? 3 : 2;

    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.width, card.height, 8);
    ctx.fill();
    ctx.stroke();

    const img = this.images[card.letter];
    if (img && img.loaded) {
      ctx.drawImage(img, card.x + 4, card.y + 4, card.width - 8, card.height - 8);
    } else {
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LIBRAS", card.x + card.width / 2, card.y + 22);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 22px Segoe UI, sans-serif";
      ctx.fillText("🤟", card.x + card.width / 2, card.y + 48);

      ctx.fillStyle = "#64748b";
      ctx.font = "10px Segoe UI, sans-serif";
      ctx.fillText(`[${card.letter}]`, card.x + card.width / 2, card.y + 64);
    }
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    const img = this.images["player"];

    if (img && img.loaded) {
      ctx.drawImage(img, player.x, player.y, player.width, player.height);
    } else {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(
        player.x + player.width / 2,
        player.y + player.height / 2,
        player.width / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.arc(player.x + 16, player.y + 18, 4, 0, Math.PI * 2);
      ctx.arc(player.x + 32, player.y + 18, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}