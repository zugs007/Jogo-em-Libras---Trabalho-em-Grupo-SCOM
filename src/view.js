class GameView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    // Canvas auxiliar para piscar o personagem inteiro sem mostrar camadas internas
    this.playerBuffer = document.createElement("canvas");
    this.playerBuffer.width = 100;
    this.playerBuffer.height = 100;
    this.playerBufferCtx = this.playerBuffer.getContext("2d");

    this.images = {};
    this.loadImage("player", "assets/images/personagem.png");

    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter) => {
      this.loadImage(letter, `assets/images/${letter}.png`);
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
      ? model.getClosestColliding(
          model.deckCards.filter((c) => !c.isPlaced && !model.enemyManager.isCardStolen(c)),
          2
        )
      : null;

    // 1. FUNDO DA ARENA
    const arenaGrad = ctx.createLinearGradient(0, 0, 0, model.height);
    arenaGrad.addColorStop(0, "#bae6fd");
    arenaGrad.addColorStop(0.32, "#bbf7d0");
    arenaGrad.addColorStop(1, "#86efac");
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(0, 0, model.width, model.height);

    this.drawArenaDetails(model);
    this.drawPuddles(model.enemyManager.puddles);

    // 2. QUADRO SUPERIOR AZUL SURDO (Frase + Slots)
    this.drawTopBoard(model, highlightedSlot);

    // 3. BANDEJA INFERIOR AZUL SURDO (Baralho de Cartas)
    this.drawBottomTray(model);

    // 4. OBSTÁCULOS MÓVEIS (Nuvens de Confusão)
    this.drawObstacles(model.enemyManager.enemies, model);

    // 5. CARTAS NO DECK E NOS SLOTS (com destaque vermelho/verde na verificação)
    for (const card of model.deckCards) {
      if (model.player.carriedCard && model.player.carriedCard.id === card.id) continue;
      const parentSlot = model.slots.find((s) => s.placedCard === card);
      const slotStatus = parentSlot ? parentSlot.status : null;
      this.drawCard(card, highlightedCard === card, slotStatus);
    }

    // 6. PERSONAGEM (com a skin selecionada)
    const isSlowed = model.enemyManager.getPlayerSpeedMultiplier(model.player) < 1;
    this.drawPlayer(model.player, model.selectedSkin, isSlowed);

    // 7. DICA DO MODO FÁCIL EMBAIXO DA CARTA
    if (model.difficulty === "easy" && highlightedCard) {
      this.drawCardLetterHint(highlightedCard);
    }

    // 8. CARTA CARREGADA (por cima de tudo)
    if (model.player.carriedCard) {
      this.drawCard(model.player.carriedCard, true, null);
    }
  }

  drawArenaDetails(model) {
    const ctx = this.ctx;
    const relativeTufts = [
      [0.14, 0.42], [0.28, 0.58], [0.75, 0.44], [0.86, 0.60],
      [0.20, 0.64], [0.58, 0.52], [0.42, 0.43], [0.68, 0.61]
    ];

    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    for (const [rx, ry] of relativeTufts) {
      const x = model.width * rx;
      const y = model.height * ry;
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

  drawObstacles(obstacles, model) {
    const ctx = this.ctx;
    const time = performance.now() * 0.006;

    for (let idx = 0; idx < obstacles.length; idx++) {
      const obs = obstacles[idx];

      if (obs.type === "diagonal") {
        this.drawDiagonalCloud(ctx, obs, time, idx);
      } else if (obs.type === "dash") {
        this.drawDashEnemy(ctx, obs, model, time, idx);
      } else if (obs.type === "thief") {
        this.drawThiefEnemy(ctx, obs, time);
      } else if (obs.type === "puddle_cloud") {
        this.drawPuddleCloud(ctx, obs, time, idx);
      } else {
        this.drawHorizontalCloud(ctx, obs, time, idx);
      }
    }
  }

  drawHorizontalCloud(ctx, obs, time, idx) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const hover = Math.sin(time + idx * 2) * 2.5;
    const drawCy = cy + hover;

    ctx.save();

    ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, obs.y + obs.height + 7, obs.width * 0.42, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(obs.x + 15, drawCy + 2, 13, Math.PI * 0.5, Math.PI * 1.45);
    ctx.arc(obs.x + 27, drawCy - 5, 15, Math.PI * 1.05, Math.PI * 1.95);
    ctx.arc(obs.x + 42, drawCy - 4, 14, Math.PI * 1.15, Math.PI * 0.15);
    ctx.arc(obs.x + 51, drawCy + 3, 12, -Math.PI * 0.35, Math.PI * 0.5);
    ctx.closePath();

    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    const cloudGrad = ctx.createLinearGradient(0, drawCy - 18, 0, drawCy + 15);
    cloudGrad.addColorStop(0, "#64748b");
    cloudGrad.addColorStop(0.55, "#475569");
    cloudGrad.addColorStop(1, "#334155");
    ctx.fillStyle = cloudGrad;
    ctx.fill();

    const eyeY = drawCy + 3;
    const lookDir = obs.vx >= 0 ? 1.2 : -1.2;
    this.drawEnemyEyes(ctx, cx, eyeY, 10, lookDir);

    const badgeY = drawCy - 16 + Math.cos(time * 1.4 + idx) * 1.5;
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, badgeY, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px Fredoka, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("?", cx, badgeY + 4);

    ctx.restore();
  }

  drawDiagonalCloud(ctx, obs, time, idx) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const pulse = Math.sin(time * 2.2 + idx) * 1.5;

    ctx.save();

    // Sombra
    ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, obs.y + obs.height + 7, obs.width * 0.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo roxo-escuro elétrico
    ctx.beginPath();
    ctx.arc(obs.x + 14, cy + 2, 12 + pulse * 0.4, Math.PI * 0.5, Math.PI * 1.45);
    ctx.arc(obs.x + 28, cy - 5, 15, Math.PI * 1.05, Math.PI * 1.95);
    ctx.arc(obs.x + 42, cy + 2, 12 + pulse * 0.4, -Math.PI * 0.35, Math.PI * 0.5);
    ctx.closePath();

    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, cy - 18, 0, cy + 16);
    grad.addColorStop(0, "#6366f1");
    grad.addColorStop(1, "#312e81");
    ctx.fillStyle = grad;
    ctx.fill();

    // Olhos
    const lookDir = obs.vx >= 0 ? 1.3 : -1.3;
    this.drawEnemyEyes(ctx, cx, cy + 2, 9, lookDir);

    // Pequeno raio amarelo embaixo da nuvem
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy + 10);
    ctx.lineTo(cx - 5, cy + 19);
    ctx.lineTo(cx, cy + 19);
    ctx.lineTo(cx - 3, cy + 27);
    ctx.lineTo(cx + 6, cy + 17);
    ctx.lineTo(cx + 1, cy + 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  drawDashEnemy(ctx, obs, model, time) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const dir = obs.side === "left" ? 1 : -1;

    ctx.save();

    // 1. Linha de aviso pontilhada vermelha antes de disparar
    if (obs.state === "aiming") {
      const blink = Math.floor(performance.now() / 90) % 2 === 0;
      ctx.save();
      ctx.strokeStyle = blink ? "rgba(220, 38, 38, 0.85)" : "rgba(250, 204, 21, 0.9)";
      ctx.lineWidth = 3.5;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(dir === 1 ? obs.x + obs.width : obs.x, cy);
      ctx.lineTo(dir === 1 ? model.width - 30 : 30, cy);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Rastro luminoso quando está correndo
    if (obs.state === "dashing") {
      ctx.fillStyle = "rgba(250, 204, 21, 0.38)";
      ctx.beginPath();
      ctx.roundRect(
        dir === 1 ? obs.x - 28 : obs.x,
        obs.y + 4,
        obs.width + 28,
        obs.height - 8,
        999
      );
      ctx.fill();
    }

    // Tremor leve enquanto carrega o dash
    const shakeY = obs.state === "aiming" ? Math.sin(time * 14) * 2.5 : 0;
    const drawY = obs.y + shakeY;
    const drawCy = cy + shakeY;

    // 3. Cápsula / Dardo energético laranja e amarelo
    ctx.fillStyle = obs.state === "aiming" ? "#ef4444" : "#f97316";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(obs.x, drawY, obs.width, obs.height, 999);
    ctx.fill();
    ctx.stroke();

    // Ponta amarela indicando a direção do disparo
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    if (dir === 1) {
      ctx.moveTo(obs.x + obs.width - 18, drawY + 5);
      ctx.lineTo(obs.x + obs.width - 5, drawCy);
      ctx.lineTo(obs.x + obs.width - 18, drawY + obs.height - 5);
    } else {
      ctx.moveTo(obs.x + 18, drawY + 5);
      ctx.lineTo(obs.x + 5, drawCy);
      ctx.lineTo(obs.x + 18, drawY + obs.height - 5);
    }
    ctx.closePath();
    ctx.fill();

    // Selo "!" durante a mira
    if (obs.state === "aiming") {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, drawY - 11, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 12px Fredoka, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", cx, drawY - 7);
    }

    ctx.restore();
  }

  drawPuddles(puddles) {
    const ctx = this.ctx;
    const time = performance.now() * 0.005;

    for (const p of puddles) {
      const alpha = p.life < 45 ? p.life / 45 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Borda da poça d'água no gramado
      ctx.fillStyle = "rgba(14, 165, 233, 0.45)";
      ctx.strokeStyle = "#0284c7";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Brilho interno
      ctx.fillStyle = "rgba(186, 230, 253, 0.55)";
      ctx.beginPath();
      ctx.ellipse(p.x - p.rx * 0.25, p.y - p.ry * 0.2, p.rx * 0.42, p.ry * 0.35, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Ondinha animada no centro
      const ripple = (Math.sin(time * 2 + p.x) + 1) * 0.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx * (0.25 + ripple * 0.3), p.ry * (0.25 + ripple * 0.3), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  drawPuddleCloud(ctx, obs, time, idx) {
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const hover = Math.sin(time + idx * 2) * 2.5;
    const drawCy = cy + hover;

    ctx.save();

    // Sombra
    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, obs.y + obs.height + 7, obs.width * 0.4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nuvem azul-chuvosa
    ctx.beginPath();
    ctx.arc(obs.x + 15, drawCy + 2, 13, Math.PI * 0.5, Math.PI * 1.45);
    ctx.arc(obs.x + 28, drawCy - 5, 15, Math.PI * 1.05, Math.PI * 1.95);
    ctx.arc(obs.x + 43, drawCy - 4, 14, Math.PI * 1.15, Math.PI * 0.15);
    ctx.arc(obs.x + 51, drawCy + 3, 12, -Math.PI * 0.35, Math.PI * 0.5);
    ctx.closePath();

    ctx.lineJoin = "round";
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = "#1e293b";
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, drawCy - 18, 0, drawCy + 15);
    grad.addColorStop(0, "#7dd3fc");
    grad.addColorStop(1, "#0284c7");
    ctx.fillStyle = grad;
    ctx.fill();

    // Gotinhas caindo embaixo da nuvem
    ctx.fillStyle = "#38bdf8";
    for (let d = -1; d <= 1; d++) {
      const dropOffset = ((time * 8 + d * 4) % 10);
      ctx.beginPath();
      ctx.arc(cx + d * 12, drawCy + 14 + dropOffset, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const lookDir = obs.vx >= 0 ? 1.1 : -1.1;
    this.drawEnemyEyes(ctx, cx, drawCy + 2, 9, lookDir);

    ctx.restore();
  }

  drawThiefEnemy(ctx, obs, time) {
    if (obs.state === "cooldown") return;

    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    const r = obs.width / 2 - 2;
    const step = Math.sin(time * 3) * 3;

    ctx.save();

    // Sombra no chão
    ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, obs.y + obs.height + 2, obs.width * 0.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pezinhos correndo
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy + r - 1 + step, 6, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 8, cy + r - 1 - step, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo roxo-bandido redondo
    ctx.fillStyle = "#7c3aed";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Máscara preta de guaxinim/ladrão nos olhos
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.78, cy - r * 0.34, r * 1.56, r * 0.52, 8);
    ctx.fill();

    // Olhos brancos dentro da máscara
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.08, 4, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.32, cy - r * 0.08, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.08, 2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.32, cy - r * 0.08, 2, 0, Math.PI * 2);
    ctx.fill();

    // Alerta "!" quando assustado
    if (obs.state === "scared") {
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, obs.y - 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#dc2626";
      ctx.font = "bold 12px Fredoka, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", cx, obs.y - 6);
    }

    ctx.restore();
  }

  drawEnemyEyes(ctx, cx, eyeY, offsetX, lookDir) {
    const leftEyeX = cx - offsetX;
    const rightEyeX = cx + offsetX;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 4.5, 0, Math.PI * 2);
    ctx.arc(rightEyeX, eyeY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(leftEyeX + lookDir, eyeY + 0.5, 2.3, 0, Math.PI * 2);
    ctx.arc(rightEyeX + lookDir, eyeY + 0.5, 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.1;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(leftEyeX - 4, eyeY - 6);
    ctx.lineTo(leftEyeX + 3.5, eyeY - 3.8);
    ctx.moveTo(rightEyeX + 4, eyeY - 6);
    ctx.lineTo(rightEyeX - 3.5, eyeY - 3.8);
    ctx.stroke();
  }

  drawTopBoard(model, highlightedSlot) {
    const ctx = this.ctx;
    const bx = 22;
    const by = 10;
    const bw = model.width - 44;
    const bh = model.isCompact ? 182 : 178;

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

    // Faixa superior de aviso ampliada e bem legível
    const pillW = model.width - 66;
    const pillH = 38;
    const pillX = model.width / 2 - pillW / 2;
    const pillY = by + 10;

    ctx.fillStyle = "#fffbeb";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 999);
    ctx.fill();
    ctx.stroke();

    // Texto maior com auto-ajuste caso a mensagem seja muito comprida
    let fontSize = model.isCompact ? 14.5 : 17;
    ctx.font = `800 ${fontSize}px Nunito, Segoe UI, sans-serif`;
    while (ctx.measureText(model.feedbackMessage).width > pillW - 28 && fontSize > 11.5) {
      fontSize -= 0.5;
      ctx.font = `800 ${fontSize}px Nunito, Segoe UI, sans-serif`;
    }

    ctx.fillStyle = "#1e3a8a";
    ctx.textAlign = "center";
    ctx.fillText(model.feedbackMessage, model.width / 2, pillY + pillH / 2 + fontSize * 0.35);

    // Letras e Slots da palavra
    for (const slot of model.slots) {
      if (slot.isSpace) continue;

      const letterFontSize = slot.width < 48 ? 24 : 28;
      const letterY = slot.y - 11;

      // Destaque vermelho/verde atrás da letra quando verificada
      if (slot.status === "wrong" || slot.status === "correct") {
        ctx.fillStyle = slot.status === "wrong" ? "#dc2626" : "#16a34a";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(slot.x + slot.width / 2 - 16, letterY - letterFontSize + 3, 32, letterFontSize + 3, 8);
        ctx.fill();
        ctx.stroke();
      }

      ctx.font = `bold ${letterFontSize}px Fredoka, Segoe UI, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#1e293b";
      ctx.strokeText(slot.char, slot.x + slot.width / 2, letterY);

      ctx.fillStyle =
        slot.status === "wrong"
          ? "#fecaca"
          : slot.status === "correct"
          ? "#dcfce7"
          : highlightedSlot === slot
          ? "#fde047"
          : "#ffffff";
      ctx.fillText(slot.char, slot.x + slot.width / 2, letterY);

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
        ctx.font = `bold ${letterFontSize + 2}px Fredoka, Segoe UI, sans-serif`;
        ctx.fillText(slot.char, slot.x + slot.width / 2, slot.y + slot.height * 0.67);
      }
    }
  }

  drawBottomTray(model) {
    const ctx = this.ctx;
    const tx = 22;
    const th = model.isCompact ? 216 : 138;
    const ty = model.height - th - 8;
    const tw = model.width - 44;

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

  drawCard(card, highlight, slotStatus = null) {
    const ctx = this.ctx;
    const img = this.images[card.letter];
    const isYellow = card.colorTheme === "yellow";

    // Sombra da carta
    ctx.fillStyle =
      slotStatus === "wrong"
        ? "#991b1b"
        : slotStatus === "correct"
        ? "#15803d"
        : highlight
        ? "#ca8a04"
        : "#0f172a";
    ctx.beginPath();
    ctx.roundRect(card.x, card.y + 4, card.width, card.height, 12);
    ctx.fill();

    if (img && img.loaded) {
      // Fundo suave caso partes da imagem sejam transparentes
      ctx.fillStyle = isYellow ? "#fef9c3" : "#e0f2fe";
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.fill();

      // Desenha o PNG em tamanho total da carta para preservar a borda feita pelo seu amigo
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, 12);
      ctx.clip();
      ctx.drawImage(img, card.x, card.y, card.width, card.height);

      // Filtro vermelho/verde semitransparente na hora de corrigir a palavra
      if (slotStatus === "wrong") {
        ctx.fillStyle = "rgba(220, 38, 38, 0.30)";
        ctx.fillRect(card.x, card.y, card.width, card.height);
      } else if (slotStatus === "correct") {
        ctx.fillStyle = "rgba(22, 163, 74, 0.16)";
        ctx.fillRect(card.x, card.y, card.width, card.height);
      }
      ctx.restore();

      // Contorno de status (Vermelho = Errada | Verde = Certa | Amarelo = Selecionada)
      if (slotStatus === "wrong" || slotStatus === "correct" || highlight) {
        ctx.strokeStyle =
          slotStatus === "wrong"
            ? "#dc2626"
            : slotStatus === "correct"
            ? "#16a34a"
            : "#facc15";
        ctx.lineWidth = slotStatus ? 4 : 3.5;
        ctx.beginPath();
        ctx.roundRect(card.x, card.y, card.width, card.height, 12);
        ctx.stroke();
      }

      // Selo ✔ ou ✖ no canto superior direito da carta verificada
      if (slotStatus === "wrong" || slotStatus === "correct") {
        this.drawCardStatusBadge(card, slotStatus === "correct");
      }
      return;
    }

    // Fallback provisório caso alguma imagem falhe
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle =
      slotStatus === "wrong"
        ? "#dc2626"
        : slotStatus === "correct"
        ? "#16a34a"
        : highlight
        ? "#facc15"
        : "#1e293b";
    ctx.lineWidth = highlight || slotStatus ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.width, card.height, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle =
      slotStatus === "wrong"
        ? "#fecaca"
        : slotStatus === "correct"
        ? "#bbf7d0"
        : isYellow
        ? "#fde047"
        : "#bae6fd";
    ctx.beginPath();
    ctx.roundRect(card.x + 4, card.y + 4, card.width - 8, card.height - 8, 9);
    ctx.fill();

    ctx.fillStyle = isYellow ? "#854d0e" : "#1e3a8a";
    ctx.font = "bold 10px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LIBRAS", card.x + card.width / 2, card.y + 17);

    ctx.font = `${Math.round(card.height * 0.34)}px Segoe UI Emoji, sans-serif`;
    ctx.fillText("🤟", card.x + card.width / 2, card.y + card.height * 0.63);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px Fredoka, Segoe UI, sans-serif";
    ctx.fillText(`[${card.letter}]`, card.x + card.width / 2, card.y + card.height - 7);

    if (slotStatus === "wrong" || slotStatus === "correct") {
      this.drawCardStatusBadge(card, slotStatus === "correct");
    }
  }

  drawCardStatusBadge(card, isCorrect) {
    const ctx = this.ctx;
    const bx = card.x + card.width - 8;
    const by = card.y + 8;

    ctx.fillStyle = isCorrect ? "#16a34a" : "#dc2626";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Nunito, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isCorrect ? "✔" : "✖", bx, by + 4);
  }

  drawCardLetterHint(card) {
    const ctx = this.ctx;
    const badgeW = 68;
    const badgeH = 24;
    const bx = card.x + (card.width - badgeW) / 2;
    const by = card.y + card.height + 6;

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

  drawPlayer(player, skinId = "default", isSlowed = false) {
    const ctx = this.ctx;

    if (isSlowed) {
      ctx.save();
      ctx.strokeStyle = "#0284c7";
      ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(
        player.x + player.width / 2,
        player.y + player.height,
        player.width * 0.55,
        9,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const isBlinking = player.invulnFrames > 0 && Math.floor(player.invulnFrames / 5) % 2 === 0;

    if (isBlinking) {
      const bCtx = this.playerBufferCtx;
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;

      bCtx.clearRect(0, 0, this.playerBuffer.width, this.playerBuffer.height);
      this.drawPlayerComposite(bCtx, 50, 50, player, skinId);

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(this.playerBuffer, cx - 50, cy - 50);
      ctx.restore();
      return;
    }

    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    this.drawPlayerComposite(ctx, cx, cy, player, skinId);
  }

  drawPlayerComposite(targetCtx, cx, cy, player, skinId) {
    const radius = player.width / 2 - 2;

    targetCtx.fillStyle = "rgba(15, 23, 42, 0.25)";
    targetCtx.beginPath();
    targetCtx.ellipse(cx, cy + player.height / 2, player.width * 0.42, 6, 0, 0, Math.PI * 2);
    targetCtx.fill();

    this.drawSkinAvatar(targetCtx, cx, cy, radius, skinId);
  }

  // --- HELPERS DE CABELO, BARBA E ÓCULOS ---

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

  drawMediumBlondeHairBack(ctx, cx, cy, r) {
    ctx.fillStyle = "#fcd34d";
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = 2.3;

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

  drawShortMenHair(ctx, cx, cy, r, fillColor, strokeColor, detailColor, isVeryShort = false) {
    const topBump = isVeryShort ? r * 1.03 : r * 1.09;
    const foreheadY = isVeryShort ? cy - r * 0.66 : cy - r * 0.6;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.1;

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.95, cy - r * 0.06);
    ctx.lineTo(cx - r * 0.99, cy - r * 0.32);
    ctx.bezierCurveTo(
      cx - r * 0.96, -topBump + cy - r * 0.12,
      cx + r * 0.96, -topBump + cy - r * 0.12,
      cx + r * 0.99, cy - r * 0.32
    );
    ctx.lineTo(cx + r * 0.95, cy - r * 0.06);
    ctx.lineTo(cx + r * 0.85, cy - r * 0.26);
    ctx.quadraticCurveTo(cx + r * 0.45, foreheadY - r * 0.06, cx + r * 0.15, foreheadY);
    ctx.quadraticCurveTo(cx - r * 0.38, foreheadY - r * 0.05, cx - r * 0.85, cy - r * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

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

  drawLightBeard(ctx, cx, cy, r) {
    ctx.save();
    ctx.fillStyle = "rgba(148, 163, 184, 0.38)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.97, Math.PI * 0.22, Math.PI * 0.78);
    ctx.quadraticCurveTo(cx, cy + r * 0.66, cx + r * 0.77, cy + r * 0.62);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.3;
    ctx.lineCap = "round";
    ctx.beginPath();

    const mustacheOffsets = [-0.3, -0.2, -0.1, 0.1, 0.2, 0.3];
    for (const off of mustacheOffsets) {
      const mx = cx + r * off;
      const my = cy + r * (0.28 + Math.abs(off) * 0.35);
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + r * off * 0.18, my + r * 0.09);
    }

    for (let a = 0.28; a <= 0.72; a += 0.088) {
      const ang = Math.PI * a;
      ctx.moveTo(cx + Math.cos(ang) * r * 0.75, cy + Math.sin(ang) * r * 0.75);
      ctx.lineTo(cx + Math.cos(ang) * r * 0.92, cy + Math.sin(ang) * r * 0.92);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawShortBeard(ctx, cx, cy, r, fillColor, strokeColor) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.78, cy + r * 0.34);
    ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.64, cx, cy + r * 0.6);
    ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.64, cx + r * 0.78, cy + r * 0.34);
    ctx.arc(cx, cy, r, 0.36, Math.PI - 0.36, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

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

  drawSkinAvatar(ctx, cx, cy, r, skinId) {
    ctx.save();

    if (skinId === "prof1") {
      this.drawLongHairBack(ctx, cx, cy, r, "#18181b", "#09090b", "#3f3f46");
    } else if (skinId === "prof4") {
      this.drawLongHairBack(ctx, cx, cy, r, "#5c3317", "#3b1d08", "#854d27");
    } else if (skinId === "prof8") {
      this.drawMediumBlondeHairBack(ctx, cx, cy, r);
    }

    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(254, 249, 195, 0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.25, cy - r * 0.42, r * 0.3, r * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();

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

    switch (skinId) {
      case "prof1":
        this.drawLongHairFrontBangs(ctx, cx, cy, r, "#18181b");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof2":
        this.drawShortMenHair(ctx, cx, cy, r, "#cbd5e1", "#475569", "#f8fafc", false);
        this.drawLightBeard(ctx, cx, cy, r);
        break;

      case "prof3":
        this.drawShortMenHair(ctx, cx, cy, r, "#18181b", "#09090b", "#52525b", true);
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof4":
        this.drawLongHairFrontBangs(ctx, cx, cy, r, "#5c3317");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof5":
        this.drawTopete(ctx, cx, cy, r, "#18181b", "#09090b");
        this.drawGlasses(ctx, cx, eyeY, eyeOffsetX, r);
        break;

      case "prof6":
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

      case "prof7":
        this.drawTopete(ctx, cx, cy, r, "#18181b", "#09090b");
        this.drawShortBeard(ctx, cx, cy, r, "#18181b", "#09090b");
        break;

      case "prof8":
        this.drawMediumBlondeHairFront(ctx, cx, cy, r);
        break;

      case "prof9":
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