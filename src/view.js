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

    const highlightedSlot = model.player.carriedCard
      ? model.getClosestColliding(model.slots.filter((s) => !s.isSpace && !s.placedCard), 2)
      : null;

    const highlightedCard = !model.player.carriedCard
      ? model.getClosestColliding(model.deckCards.filter((c) => !c.isPlaced), 2)
      : null;

    // 1. FUNDO DA ARENA (Gramado claro e acolhedor com textura sutil)
    const arenaGrad = ctx.createLinearGradient(0, 0, 0, model.height);
    arenaGrad.addColorStop(0, "#bae6fd");
    arenaGrad.addColorStop(0.32, "#bbf7d0");
    arenaGrad.addColorStop(1, "#86efac");
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, 0, model.width, model.height);

    this.drawArenaDetails(model);

    // 2. QUADRO SUPERIOR AZUL SURDO (Frase + Slots)
    this.drawTopBoard(model, highlightedSlot);

    // 3. BANDEJA INFERIOR AZUL SURDO (Baralho de Cartas)
    this.drawBottomTray(model);

    // 4. CARTAS NO DECK E NOS SLOTS
    for (const card of model.deckCards) {
      if (model.player.carriedCard && model.player.carriedCard.id === card.id) continue;
      this.drawCard(card, highlightedCard === card);
    }

    // 5. PERSONAGEM
    this.drawPlayer(model.player);

    // 6. CARTA CARREGADA (por cima de tudo)
    if (model.player.carriedCard) {
      this.drawCard(model.player.carriedCard, true);
    }
  }

  drawArenaDetails(model) {
    const ctx = this.ctx;
    // Detalhes decorativos leves na arena para dar profundidade sem atrapalhar a leitura
    const tufts = [
      [110, 210], [240, 320], [680, 225], [790, 330],
      [160, 355], [520, 290], [380, 215], [610, 350]
    ];

    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    for (const [x, y] of tufts) {
      ctx.beginPath();
      ctx.moveTo(x - 6, y);
      ctx.lineTo(x - 9, y - 8);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 10);
      ctx.moveTo(x + 6, y);
      ctx.lineTo(x + 9, y - 8);
      ctx.stroke();
    }
  }

  drawTopBoard(model, highlightedSlot) {
    const ctx = this.ctx;
    const bx = 22;
    const by = 10;
    const bw = model.width - 44;
    const bh = 152;

    // Sombra 3D do quadro
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.roundRect(bx, by + 5, bw, bh, 22);
    ctx.fill();

    // Corpo do quadro em Azul Surdo claro
    ctx.fillStyle = "#93c5fd";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 22);
    ctx.fill();
    ctx.stroke();

    // Borda interna
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 18);
    ctx.stroke();

    // Pílula de feedback no topo do quadro
    ctx.fillStyle = "#fffbeb";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(model.width / 2 - 270, by + 8, 540, 26, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e3a8a";
    ctx.font = "bold 13.5px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.feedbackMessage, model.width / 2, by + 25);

    // Letras-alvo + Slots pontilhados
    for (const slot of model.slots) {
      if (slot.isSpace) continue;

      // Letra-alvo com contorno estilo cartoon (Amarelo e Branco)
      ctx.font = "bold 26px Fredoka, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#1e293b";
      ctx.strokeText(slot.char, slot.x + slot.width / 2, slot.y - 10);

      ctx.fillStyle = highlightedSlot === slot ? "#fde047" : "#ffffff";
      ctx.fillText(slot.char, slot.x + slot.width / 2, slot.y - 10);

      // Caixa do Slot
      let borderColor = "#3b82f6";
      let bgColor = "#ffffff";
      let isDashed = true;

      if (slot.status === "correct") {
        borderColor = "#16a34a";
        bgColor = "#dcfce7";
        isDashed = false;
      } else if (slot.status === "wrong") {
        borderColor = "#dc2626";
        bgColor = "#fee2e2";
        isDashed = false;
      } else if (highlightedSlot === slot) {
        borderColor = "#eab308";
        bgColor = "#fef9c3";
        isDashed = false;
      }

      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      if (isDashed) ctx.setLineDash([6, 4]);

      ctx.beginPath();
      ctx.roundRect(slot.x, slot.y, slot.width, slot.height, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Letra marca-d'água dentro do slot vazio
      if (!slot.placedCard) {
        ctx.fillStyle = "rgba(37, 99, 235, 0.18)";
        ctx.font = "bold 28px Fredoka, Segoe UI, sans-serif";
        ctx.fillText(slot.char, slot.x + slot.width / 2, slot.y + 44);
      }
    }
  }

  drawBottomTray(model) {
    const ctx = this.ctx;
    const tx = 22;
    const ty = 402;
    const tw = model.width - 44;
    const th = 126;

    // Bandeja Azul Surdo escuro
    ctx.fillStyle = "#1e3a8a";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 22);
    ctx.fill();
    ctx.stroke();

    // Borda interna azul vibrante
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tx + 5, ty + 5, tw - 10, th - 10, 18);
    ctx.stroke();

    // Etiqueta do baralho
    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 12px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BARALHO DE SINAIS EM LIBRAS", model.width / 2, ty + 21);
  }

  drawCard(card, highlight) {
    const ctx = this.ctx;
    const img = this.images[card.letter];

    // Sombra 3D da carta
    ctx.fillStyle = highlight ? "#ca8a04" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(card.x, card.y + 4, card.width, card.height, 12);
    ctx.fill();

    // Se a imagem inteira do Membro 2 já existir, desenha ela cheia
    if (img && img.loaded) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.clip();
      ctx.drawImage(img, card.x, card.y, card.width, card.height);
      ctx.restore();

      // Borda de destaque dourada quando o personagem encosta
      if (highlight) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(card.x, card.y, card.width, card.height, 12);
        ctx.stroke();
      }
      return;
    }

    // Fallback provisório enquanto as imagens não chegam
    const isYellow = card.colorTheme === "yellow";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = highlight ? "#facc15" : "#1e293b";
    ctx.lineWidth = highlight ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.width, card.height, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isYellow ? "#fde047" : "#bae6fd";
    ctx.beginPath();
    ctx.roundRect(card.x + 4, card.y + 4, card.width - 8, card.height - 8, 9);
    ctx.fill();

    ctx.fillStyle = isYellow ? "#854d0e" : "#1e3a8a";
    ctx.font = "bold 10px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIBRAS", card.x + card.width / 2, card.y + 18);

    ctx.font = "24px Segoe UI Emoji, sans-serif";
    ctx.fillText("🤟", card.x + card.width / 2, card.y + 45);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px Fredoka, Segoe UI, sans-serif";
    ctx.fillText(`[${card.letter}]`, card.x + card.width / 2, card.y + 62);
  }

  drawPlayer(player) {
    const ctx = this.ctx;
    const img = this.images["player"];

    // Sombra no chão
    ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
    ctx.beginPath();
    ctx.ellipse(
      player.x + player.width / 2,
      player.y + player.height - 2,
      player.width * 0.42,
      7,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    if (img && img.loaded) {
      ctx.drawImage(img, player.x, player.y, player.width, player.height);
    } else {
      // Personagem provisório estilizado (Azul Surdo + Boné Amarelo)
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;

      ctx.fillStyle = "#2563eb";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, player.width / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Viseira/Boné amarelo
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(cx, cy - 4, player.width / 2 - 4, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // Olhos expressivos
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx - 7, cy + 3, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + 7, cy + 3, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.arc(cx - 6, cy + 3, 2.2, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy + 3, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}   