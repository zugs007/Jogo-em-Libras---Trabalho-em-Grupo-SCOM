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

    // Proteção extra: enquanto pausado, não desenha letras nem cartas no Canvas
    if (model.isPaused) {
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(0, 0, model.width, model.height);
      return;
    }

    const highlightedSlot = model.player.carriedCard
      ? model.getClosestColliding(model.slots.filter((s) => !s.isSpace && !s.placedCard), 2)
      : null;

    const highlightedCard = !model.player.carriedCard
      ? model.getClosestColliding(model.deckCards.filter((c) => !c.isPlaced), 2)
      : null;

    // 1. FUNDO DA ARENA
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

    // 4. OBSTÁCULOS MÓVEIS
    this.drawObstacles(model.obstacles);

    // 5. CARTAS NO DECK E NOS SLOTS
    for (const card of model.deckCards) {
      if (model.player.carriedCard && model.player.carriedCard.id === card.id) continue;
      this.drawCard(card, highlightedCard === card);
    }

    // 6. PERSONAGEM (com a skin selecionada)
    this.drawPlayer(model.player, model.selectedSkin);

    // 7. DICA DO MODO FÁCIL EMBAIXO DA CARTA
    if (model.difficulty === "easy" && highlightedCard) {
      this.drawCardLetterHint(highlightedCard);
    }

    // 8. CARTA CARREGADA (por cima de tudo)
    if (model.player.carriedCard) {
      this.drawCard(model.player.carriedCard, true);
    }
  }

  drawArenaDetails(model) {
    const ctx = this.ctx;
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

  drawObstacles(obstacles) {
    const ctx = this.ctx;
    for (const obs of obstacles) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y + 5, obs.width, obs.height, 999);
      ctx.fill();

      ctx.fillStyle = "#f97316";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 999);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fdba74";
      ctx.beginPath();
      ctx.roundRect(obs.x + 8, obs.y + 4, obs.width - 16, 7, 999);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px Fredoka, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡ RUÍDO", obs.x + obs.width / 2, obs.y + 22);
    }
  }

  drawTopBoard(model, highlightedSlot) {
    const ctx = this.ctx;
    const bx = 22;
    const by = 10;
    const bw = model.width - 44;
    const bh = 152;

    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.roundRect(bx, by + 5, bw, bh, 22);
    ctx.fill();

    ctx.fillStyle = "#93c5fd";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 22);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bx + 4, by + 4, bw - 8, bh - 8, 18);
    ctx.stroke();

    ctx.fillStyle = "#fffbeb";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(model.width / 2 - 275, by + 8, 550, 26, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e3a8a";
    ctx.font = "bold 13.5px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(model.feedbackMessage, model.width / 2, by + 25);

    for (const slot of model.slots) {
      if (slot.isSpace) continue;

      ctx.font = "bold 26px Fredoka, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#1e293b";
      ctx.strokeText(slot.char, slot.x + slot.width / 2, slot.y - 10);

      ctx.fillStyle = highlightedSlot === slot ? "#fde047" : "#ffffff";
      ctx.fillText(slot.char, slot.x + slot.width / 2, slot.y - 10);

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
    const ty = 396;
    const tw = model.width - 44;
    const th = 136;

    ctx.fillStyle = "#1e3a8a";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 22);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(tx + 5, ty + 5, tw - 10, th - 10, 18);
    ctx.stroke();

    ctx.fillStyle = "#93c5fd";
    ctx.font = "bold 12px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BARALHO DE SINAIS EM LIBRAS", model.width / 2, ty + 20);
  }

  drawCard(card, highlight) {
    const ctx = this.ctx;
    const img = this.images[card.letter];

    ctx.fillStyle = highlight ? "#ca8a04" : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(card.x, card.y + 4, card.width, card.height, 12);
    ctx.fill();

    if (img && img.loaded) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.clip();
      ctx.drawImage(img, card.x, card.y, card.width, card.height);
      ctx.restore();

      if (highlight) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.roundRect(card.x, card.y, card.width, card.height, 12);
        ctx.stroke();
      }
      return;
    }

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

    ctx.font = "23px Segoe UI Emoji, sans-serif";
    ctx.fillText("🤟", card.x + card.width / 2, card.y + 43);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px Fredoka, Segoe UI, sans-serif";
    ctx.fillText(`[${card.letter}]`, card.x + card.width / 2, card.y + 60);
  }

  drawCardLetterHint(card) {
    const ctx = this.ctx;
    const badgeW = 68;
    const badgeH = 24;
    const bx = card.x + (card.width - badgeW) / 2;
    const by = card.y + card.height + 7;

    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, badgeW, badgeH, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 13px Fredoka, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Letra: ${card.letter}`, bx + badgeW / 2, by + 16);
  }

  drawPlayer(player, skinId = "default") {
    const ctx = this.ctx;

    if (player.invulnFrames > 0 && Math.floor(player.invulnFrames / 5) % 2 === 0) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      this.drawPlayerSprite(player, skinId);
      ctx.restore();
      return;
    }

    this.drawPlayerSprite(player, skinId);
  }

  drawPlayerSprite(player, skinId) {
    const ctx = this.ctx;
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    const radius = player.width / 2 - 2;

    // Sombra no chão
    ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, player.y + player.height, player.width * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    this.drawSkinAvatar(ctx, cx, cy, radius, skinId);
  }

  // --- HELPERS DE CABELO, BARBA E ÓCULOS ---

  // Cabelo feminino longo (prof1 e prof4)
  drawLongHairBack(ctx, cx, cy, r, mainColor, strokeColor, shineColor) {
    ctx.fillStyle = mainColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.3;

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.92, cy - r * 0.35);
    ctx.bezierCurveTo(
      cx - r * 1.25, cy - r * 1.15,
      cx + r * 1.25, cy - r * 1.15,
      cx + r * 0.92, cy - r * 0.35
    );
    ctx.quadraticCurveTo(cx + r * 1.22, cy + r * 0.55, cx + r * 1.05, cy + r * 1.22);
    ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 1.32, cx, cy + r * 1.18);
    ctx.quadraticCurveTo(cx - r * 0.55, cy + r * 1.32, cx - r * 1.05, cy + r * 1.22);
    ctx.quadraticCurveTo(cx - r * 1.22, cy + r * 0.55, cx - r * 0.92, cy - r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = shineColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.95, cy + r * 0.1);
    ctx.quadraticCurveTo(cx - r * 1.02, cy + r * 0.65, cx - r * 0.9, cy + r * 1.05);
    ctx.moveTo(cx + r * 0.95, cy + r * 0.1);
    ctx.quadraticCurveTo(cx + r * 1.02, cy + r * 0.65, cx + r * 0.9, cy + r * 1.05);
    ctx.stroke();
  }

  drawLongHairFrontBangs(ctx, cx, cy, r, mainColor) {
    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.86, cy - r * 0.32);
    ctx.quadraticCurveTo(cx - r * 0.45, cy - r * 1.02, cx + r * 0.12, cy - r * 0.96);
    ctx.quadraticCurveTo(cx - r * 0.35, cy - r * 0.52, cx - r * 0.86, cy - r * 0.32);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + r * 0.86, cy - r * 0.32);
    ctx.quadraticCurveTo(cx + r * 0.48, cy - r * 1.0, cx + r * 0.05, cy - r * 0.96);
    ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.55, cx + r * 0.86, cy - r * 0.32);
    ctx.fill();
  }

  // Cabelo feminino médio loiro penteado para trás ("bonequinho" - prof8)
  drawMediumBlondeHairBack(ctx, cx, cy, r) {
    ctx.fillStyle = "#fcd34d";
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2.3;

    // Volume atrás da cabeça descendo até a altura dos ombros (cy + 0.68r)
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.9, cy - r * 0.35);
    ctx.bezierCurveTo(
      cx - r * 1.18, cy - r * 1.15,
      cx + r * 1.18, cy - r * 1.15,
      cx + r * 0.9, cy - r * 0.35
    );
    ctx.quadraticCurveTo(cx + r * 1.24, cy + r * 0.25, cx + r * 1.02, cy + r * 0.66);
    ctx.quadraticCurveTo(cx + r * 0.55, cy + r * 0.78, cx, cy + r * 0.68);
    ctx.quadraticCurveTo(cx - r * 0.55, cy + r * 0.78, cx - r * 1.02, cy + r * 0.66);
    ctx.quadraticCurveTo(cx - r * 1.24, cy + r * 0.25, cx - r * 0.9, cy - r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fios loiros claros penteados para trás
    ctx.strokeStyle = "#fef9c3";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.94, cy - r * 0.05);
    ctx.quadraticCurveTo(cx - r * 1.05, cy + r * 0.28, cx - r * 0.9, cy + r * 0.55);
    ctx.moveTo(cx + r * 0.94, cy - r * 0.05);
    ctx.quadraticCurveTo(cx + r * 1.05, cy + r * 0.28, cx + r * 0.9, cy + r * 0.55);
    ctx.stroke();
  }

  drawMediumBlondeHairFront(ctx, cx, cy, r) {
    ctx.fillStyle = "#fcd34d";
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 1.8;

    // Mechas laterais puxadas para trás na linha da testa
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.92, cy - r * 0.18);
    ctx.quadraticCurveTo(cx - r * 0.95, cy - r * 0.95, cx, cy - r * 1.04);
    ctx.quadraticCurveTo(cx + r * 0.95, cy - r * 0.95, cx + r * 0.92, cy - r * 0.18);
    ctx.quadraticCurveTo(cx + r * 0.76, cy - r * 0.64, cx + r * 0.2, cy - r * 0.72);
    ctx.quadraticCurveTo(cx - r * 0.35, cy - r * 0.78, cx - r * 0.76, cy - r * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Corte masculino curto natural com costeletas e linha da testa orgânica ("skywalker" e "eurística")
  drawShortMenHair(ctx, cx, cy, r, fillColor, strokeColor, detailColor, isVeryShort = false) {
    const topBump = isVeryShort ? r * 1.03 : r * 1.09;
    const foreheadY = isVeryShort ? cy - r * 0.66 : cy - r * 0.6;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.1;

    ctx.beginPath();
    // Costeleta esquerda
    ctx.moveTo(cx - r * 0.95, cy - r * 0.06);
    ctx.lineTo(cx - r * 0.99, cy - r * 0.32);
    // Topo arredondado natural
    ctx.bezierCurveTo(
      cx - r * 0.96, -topBump + cy - r * 0.12,
      cx + r * 0.96, -topBump + cy - r * 0.12,
      cx + r * 0.99, cy - r * 0.32
    );
    // Costeleta direita
    ctx.lineTo(cx + r * 0.95, cy - r * 0.06);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.26);
    // Linha natural da testa (leve risca lateral suave)
    ctx.quadraticCurveTo(cx + r * 0.45, foreheadY - r * 0.06, cx + r * 0.15, foreheadY);
    ctx.quadraticCurveTo(cx - r * 0.38, foreheadY - r * 0.05, cx - r * 0.85, cy - r * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Textura sutil de fios curtos
    ctx.strokeStyle = detailColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (isVeryShort) {
      for (let off = -0.45; off <= 0.45; off += 0.22) {
        ctx.moveTo(cx + r * off, cy - r * 0.88);
        ctx.lineTo(cx + r * (off + 0.03), cy - r * 0.77);
      }
    } else {
      ctx.moveTo(cx - r * 0.45, cy - r * 0.86);
      ctx.quadraticCurveTo(cx - r * 0.1, cy - r * 0.92, cx + r * 0.3, cy - r * 0.82);
      ctx.moveTo(cx - r * 0.25, cy - r * 0.75);
      ctx.quadraticCurveTo(cx + r * 0.1, cy - r * 0.8, cx + r * 0.48, cy - r * 0.72);
    }
    ctx.stroke();
  }

  drawGlasses(ctx, cx, eyeY, eyeOffsetX, r) {
    const lensW = r * 0.64;
    const lensH = r * 0.46;
    const lensY = eyeY - lensH / 2;
    const leftLensX = cx - eyeOffsetX - lensW / 2;
    const rightLensX = cx + eyeOffsetX - lensW / 2;

    ctx.fillStyle = "rgba(224, 242, 254, 0.38)";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.roundRect(leftLensX, lensY, lensW, lensH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(rightLensX, lensY, lensW, lensH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(leftLensX + lensW, eyeY - 1);
    ctx.lineTo(rightLensX, eyeY - 1);
    ctx.moveTo(leftLensX, eyeY - 1);
    ctx.lineTo(cx - r * 0.92, eyeY - 3);
    ctx.moveTo(rightLensX + lensW, eyeY - 1);
    ctx.lineTo(cx + r * 0.92, eyeY - 3);
    ctx.stroke();
  }

  drawTopete(ctx, cx, cy, r, fillColor, strokeColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.82, cy - r * 0.48);
    ctx.quadraticCurveTo(cx - r * 0.95, cy - r * 1.15, cx - r * 0.25, cy - r * 1.12);
    ctx.quadraticCurveTo(cx + r * 0.15, cy - r * 1.48, cx + r * 0.68, cy - r * 1.25);
    ctx.quadraticCurveTo(cx + r * 0.95, cy - r * 0.95, cx + r * 0.84, cy - r * 0.48);
    ctx.quadraticCurveTo(cx + r * 0.32, cy - r * 0.78, cx - r * 0.15, cy - r * 0.7);
    ctx.quadraticCurveTo(cx - r * 0.55, cy - r * 0.74, cx - r * 0.82, cy - r * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Barba ralinha com pelinhos curtos (para o "skywalker")
  drawLightBeard(ctx, cx, cy, r) {
    ctx.save();
    // Sombra rala no queixo e maxilar inferior
    ctx.fillStyle = "rgba(148, 163, 184, 0.38)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.97, Math.PI * 0.22, Math.PI * 0.78);
    ctx.quadraticCurveTo(cx, cy + r * 0.66, cx + r * 0.77, cy + r * 0.62);
    ctx.closePath();
    ctx.fill();

    // Pelinhos ralos (traços curtos inclinados para não parecer boca)
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();

    // Bigode ralinho curvando para baixo
    const mustacheOffsets = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3];
    for (const off of mustacheOffsets) {
      const mx = cx + r * off;
      const my = cy + r * (0.28 + Math.abs(off) * 0.35);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + r * off * 0.18, my + r * 0.09);
    }

    // Fios ralos no contorno do queixo
    for (let a = 0.28; a <= 0.72; a += 0.088) {
      const ang = Math.PI * a;
      ctx.moveTo(cx + Math.cos(ang) * r * 0.75, cy + Math.sin(ang) * r * 0.75);
      ctx.lineTo(cx + Math.cos(ang) * r * 0.92, cy + Math.sin(ang) * r * 0.92);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Barba curta aparada + bigode curvado para baixo (para "matlab" e "boss final")
  drawShortBeard(ctx, cx, cy, r, fillColor, strokeColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;

    // Barba concentrada na borda inferior do queixo
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.78, cy + r * 0.34);
    ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.64, cx, cy + r * 0.6);
    ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.64, cx + r * 0.78, cy + r * 0.34);
    ctx.arc(cx, cy, r, 0.36, Math.PI - 0.36, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bigode curvado (arqueado no centro e caído nas pontas)
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.46);
    ctx.quadraticCurveTo(cx - r * 0.22, cy + r * 0.24, cx, cy + r * 0.28);
    ctx.quadraticCurveTo(cx + r * 0.22, cy + r * 0.24, cx + r * 0.42, cy + r * 0.46);
    ctx.quadraticCurveTo(cx + r * 0.22, cy + r * 0.37, cx, cy + r * 0.39);
    ctx.quadraticCurveTo(cx - r * 0.22, cy + r * 0.37, cx - r * 0.42, cy + r * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Método principal de renderização de todas as skins
  drawSkinAvatar(ctx, cx, cy, r, skinId) {
    ctx.save();

    // 1. CAMADA DE TRÁS (Cabelos médios/longos)
    if (skinId === "prof1") {
      this.drawLongHairBack(ctx, cx, cy, r, "#18181b", "#09090b", "#3f3f46");
    } else if (skinId === "prof4") {
      this.drawLongHairBack(ctx, cx, cy, r, "#5c3317", "#3b1d08", "#854d27");
    } else if (skinId === "prof8") {
      this.drawMediumBlondeHairBack(ctx, cx, cy, r);
    }

    // 2. CORPO BASE (Bolinha inteira amarela)
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Brilho suave no topo da esfera
    ctx.fillStyle = "rgba(254, 249, 195, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.42, r * 0.3, r * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. OLHOS EXPRESSIVOS
    const hasBeard = skinId === "prof2" || skinId === "prof7" || skinId === "prof9";
    const eyeY = hasBeard ? cy - r * 0.08 : cy - r * 0.02;
    const eyeOffsetX = r * 0.32;
    const eyeR = Math.max(3, r * 0.19);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(cx - eyeOffsetX + 0.8, eyeY, eyeR * 0.52, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffsetX + 0.8, eyeY, eyeR * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // 4. DETALHES DA FRENTE POR PROFESSOR
    switch (skinId) {
      case "prof1": // "parsec" - cabelo longo preto + óculos
        this.drawLongHairFrontBangs(ctx, cx, cy, r, "#18181b");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof2": // "skywalker" - cabelo curto natural e barba ralinha grisalhos
        this.drawShortMenHair(ctx, cx, cy, r, "#cbd5e1", "#475569", "#f8fafc", false);
        this.drawLightBeard(ctx, cx, cy, r);
        break;

      case "prof3": // "eurística" - cabelo preto bem curto natural + óculos
        this.drawShortMenHair(ctx, cx, cy, r, "#18181b", "#09090b", "#52525b", true);
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof4": // "já fizeram?" - cabelo longo castanho + óculos
        this.drawLongHairFrontBangs(ctx, cx, cy, r, "#5c3317");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof5": // "cachaça" - topete preto + óculos
        this.drawTopete(ctx, cx, cy, r, "#18181b", "#09090b");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof6": // "capacitivo" - cabelo preto curto-médio + óculos
        ctx.fillStyle = "#18181b";
        ctx.strokeStyle = "#09090b";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.94, cy - r * 0.25);
        ctx.quadraticCurveTo(cx - r * 1.04, cy - r * 1.05, cx, cy - r * 1.08);
        ctx.quadraticCurveTo(cx + r * 1.04, cy - r * 1.05, cx + r * 0.94, cy - r * 0.25);
        ctx.quadraticCurveTo(cx + r * 0.65, cy - r * 0.56, cx + r * 0.25, cy - r * 0.54);
        ctx.quadraticCurveTo(cx - r * 0.15, cy - r * 0.65, cx - r * 0.55, cy - r * 0.52);
        ctx.quadraticCurveTo(cx - r * 0.78, cy - r * 0.48, cx - r * 0.94, cy - r * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof7": // "matlab" - topete preto + barba curta aparada
        this.drawTopete(ctx, cx, cy, r, "#18181b", "#09090b");
        this.drawShortBeard(ctx, cx, cy, r, "#18181b", "#09090b");
        break;

      case "prof8": // "bonequinho" - cabelo loiro médio penteado para trás
        this.drawMediumBlondeHairFront(ctx, cx, cy, r);
        break;

      case "prof9": // "boss final" - topete grisalho + óculos + barba grisalha
        this.drawTopete(ctx, cx, cy, r, "#cbd5e1", "#475569");
        this.drawShortBeard(ctx, cx, cy, r, "#cbd5e1", "#475569");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;
    }

    ctx.restore();
  }

  renderSkinPreview(previewCanvas, skinId) {
    const pCtx = previewCanvas.getContext("2d");
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    this.drawSkinAvatar(pCtx, previewCanvas.width / 2, previewCanvas.height / 2 + 2, 16, skinId);
  }
}