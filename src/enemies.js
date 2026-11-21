class EnemyManager {
  constructor() {
    this.enemies = [];
    this.puddles = [];
  }

  getArenaBounds(model) {
    const trayH = model.isCompact ? 216 : 138;
    const topBoardBottom = model.isCompact ? 192 : 188;

    return {
      minX: 30,
      maxX: model.width - 30,
      minY: topBoardBottom + 8,
      maxY: model.height - trayH - 14
    };
  }

  spawnForPhase(model) {
    this.enemies = [];
    this.puddles = [];
    const bounds = this.getArenaBounds(model);
    const isHard = model.difficulty === "hard";

    const commonTypes = ["horizontal", "diagonal", "dash", "thief", "puddle_cloud"];
    const pickRandom = () => commonTypes[Math.floor(Math.random() * commonTypes.length)];

    let typesToSpawn;
    if (isHard) {
      const first = pickRandom();
      let second = pickRandom();
      // Evita dois ladrões ao mesmo tempo para não poluir o baralho
      if (first === "thief" && second === "thief") {
        second = "diagonal";
      }
      typesToSpawn = [first, second];
    } else {
      typesToSpawn = [pickRandom()];
    }

    typesToSpawn.forEach((type, idx) => {
      this.enemies.push(this.createEnemy(type, idx, bounds, model.isCompact, isHard));
    });
  }

  createEnemy(type, idx, bounds, isCompact, isHard) {
    const arenaH = bounds.maxY - bounds.minY;
    const speedScale = isCompact ? 0.82 : 1;
    const hardScale = isHard ? 1.18 : 1;

    if (type === "diagonal") {
      const w = 56;
      const h = 34;
      const dirX = idx % 2 === 0 ? 1 : -1;
      const dirY = idx % 2 === 0 ? 1 : -1;

      return {
        type: "diagonal",
        x: dirX > 0 ? bounds.minX + 16 : bounds.maxX - w - 16,
        y: bounds.minY + arenaH * (idx === 0 ? 0.22 : 0.65),
        width: w,
        height: h,
        vx: 2.3 * dirX * speedScale * hardScale,
        vy: 1.9 * dirY * speedScale * hardScale
      };
    }

    if (type === "dash") {
      const w = 54;
      const h = 28;
      const startLeft = idx % 2 === 0;

      return {
        type: "dash",
        state: "patrol",
        timer: 75 + idx * 30,
        side: startLeft ? "left" : "right",
        x: startLeft ? bounds.minX + 4 : bounds.maxX - w - 4,
        y: bounds.minY + arenaH * 0.45,
        width: w,
        height: h,
        vy: 1.7 * (startLeft ? 1 : -1),
        dashSpeed: 10.5 * speedScale * hardScale
      };
    }

    if (type === "thief") {
      const w = 44;
      const h = 44;
      const startLeft = idx % 2 === 0;

      return {
        type: "thief",
        state: "seeking", // "seeking" | "fleeing_with_card" | "corner_idle" | "scared" | "cooldown"
        x: startLeft ? bounds.minX + 12 : bounds.maxX - w - 12,
        y: bounds.minY + arenaH * 0.35,
        width: w,
        height: h,
        speed: 2.35 * speedScale * hardScale,
        targetCard: null,
        stolenCard: null,
        cornerX: startLeft ? bounds.maxX - w - 18 : bounds.minX + 18,
        cornerY: bounds.minY + 14,
        cooldownTimer: 0
      };
    }

    if (type === "puddle_cloud") {
      const w = 64;
      const h = 34;
      const dir = idx % 2 === 0 ? 1 : -1;

      return {
        type: "puddle_cloud",
        x: dir > 0 ? bounds.minX + 40 : bounds.maxX - w - 40,
        y: bounds.minY + arenaH * 0.32,
        width: w,
        height: h,
        vx: 1.65 * dir * speedScale * hardScale,
        dropTimer: 95 // Solta a primeira poça rápido para já aparecer na arena
      };
    }

    // Padrão: "horizontal" (Nuvem de Confusão)
    const w = 64;
    const h = 32;
    const dir = idx % 2 === 0 ? 1 : -1;

    return {
      type: "horizontal",
      x: dir > 0 ? bounds.minX + 30 : bounds.maxX - w - 30,
      y: bounds.minY + arenaH * (idx === 0 ? 0.28 : 0.68),
      width: w,
      height: h,
      vx: 2.3 * dir * speedScale * hardScale
    };
  }

  isCardStolen(card) {
    return this.enemies.some((e) => e.type === "thief" && e.stolenCard === card);
  }

  getPlayerSpeedMultiplier(player) {
    for (const puddle of this.puddles) {
      const pFootX = player.x + player.width / 2;
      const pFootY = player.y + player.height * 0.85;
      const dx = (pFootX - puddle.x) / puddle.rx;
      const dy = (pFootY - puddle.y) / puddle.ry;
      if (dx * dx + dy * dy <= 1) {
        return 0.5;
      }
    }
    return 1;
  }

  update(model) {
    if (model.isGameOver || model.isChecking || model.isPaused) {
      return;
    }

    if (model.player.invulnFrames > 0) {
      model.player.invulnFrames--;
    }

    // Atualiza tempo de vida das poças temporárias
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      this.puddles[i].life--;
      if (this.puddles[i].life <= 0) {
        this.puddles.splice(i, 1);
      }
    }

    const bounds = this.getArenaBounds(model);
    const playerLayout = model.getLayoutMetrics();

    for (const enemy of this.enemies) {
      if (enemy.type === "horizontal") {
        this.updateHorizontal(enemy, bounds);
        if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -3)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "diagonal") {
        this.updateDiagonal(enemy, bounds);
        if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -3)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "dash") {
        this.updateDash(enemy, bounds, model.player);
        const canHit = enemy.state === "dashing";
        if (canHit && model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -3)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "thief") {
        this.updateThief(enemy, bounds, model);
      } else if (enemy.type === "puddle_cloud") {
        this.updatePuddleCloud(enemy, bounds, model);
      }
    }
  }

  updateHorizontal(enemy, bounds) {
    enemy.x += enemy.vx;
    if (enemy.x <= bounds.minX) {
      enemy.x = bounds.minX;
      enemy.vx = Math.abs(enemy.vx);
    } else if (enemy.x + enemy.width >= bounds.maxX) {
      enemy.x = bounds.maxX - enemy.width;
      enemy.vx = -Math.abs(enemy.vx);
    }
  }

  updateDiagonal(enemy, bounds) {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    if (enemy.x <= bounds.minX) {
      enemy.x = bounds.minX;
      enemy.vx = Math.abs(enemy.vx);
    } else if (enemy.x + enemy.width >= bounds.maxX) {
      enemy.x = bounds.maxX - enemy.width;
      enemy.vx = -Math.abs(enemy.vx);
    }

    if (enemy.y <= bounds.minY) {
      enemy.y = bounds.minY;
      enemy.vy = Math.abs(enemy.vy);
    } else if (enemy.y + enemy.height >= bounds.maxY) {
      enemy.y = bounds.maxY - enemy.height;
      enemy.vy = -Math.abs(enemy.vy);
    }
  }

  updateDash(enemy, bounds, player) {
    if (enemy.state === "patrol") {
      enemy.y += enemy.vy;
      if (enemy.y <= bounds.minY) {
        enemy.y = bounds.minY;
        enemy.vy = Math.abs(enemy.vy);
      } else if (enemy.y + enemy.height >= bounds.maxY) {
        enemy.y = bounds.maxY - enemy.height;
        enemy.vy = -Math.abs(enemy.vy);
      }

      enemy.timer--;
      if (enemy.timer <= 0) {
        const targetY = player.y + player.height / 2 - enemy.height / 2;
        enemy.y = Math.max(bounds.minY, Math.min(bounds.maxY - enemy.height, targetY));
        enemy.state = "aiming";
        enemy.timer = 70;
      }
    } else if (enemy.state === "aiming") {
      enemy.timer--;
      if (enemy.timer <= 0) {
        enemy.state = "dashing";
      }
    } else if (enemy.state === "dashing") {
      const dir = enemy.side === "left" ? 1 : -1;
      enemy.x += enemy.dashSpeed * dir;

      if (dir === 1 && enemy.x + enemy.width >= bounds.maxX - 4) {
        enemy.x = bounds.maxX - enemy.width - 4;
        enemy.side = "right";
        enemy.state = "patrol";
        enemy.timer = 95;
      } else if (dir === -1 && enemy.x <= bounds.minX + 4) {
        enemy.x = bounds.minX + 4;
        enemy.side = "left";
        enemy.state = "patrol";
        enemy.timer = 95;
      }
    }
  }

  updateThief(enemy, bounds, model) {
    if (enemy.state === "cooldown") {
      enemy.cooldownTimer--;
      if (enemy.cooldownTimer <= 0) {
        enemy.x = Math.random() < 0.5 ? bounds.minX + 12 : bounds.maxX - enemy.width - 12;
        enemy.y = bounds.minY + 20;
        enemy.state = "seeking";
      }
      return;
    }

    if (enemy.state === "scared") {
      // Corre para fora da arena pela lateral mais próxima
      const exitX = enemy.x + enemy.width / 2 < model.width / 2 ? -60 : model.width + 20;
      const dx = exitX - enemy.x;
      if (Math.abs(dx) < 10) {
        enemy.state = "cooldown";
        enemy.cooldownTimer = 360; // Volta só depois de 6 segundos
      } else {
        enemy.x += Math.sign(dx) * (enemy.speed * 2.1);
      }
      return;
    }

    // Se o jogador encostar no ladrão a qualquer momento, ele se assusta e solta a carta no chão
    if (model.checkCollision(model.player, enemy, 2)) {
      if (enemy.stolenCard) {
        const dropped = enemy.stolenCard;
        dropped.x = Math.max(bounds.minX + 12, Math.min(bounds.maxX - dropped.width - 12, enemy.x));
        dropped.y = Math.max(bounds.minY + 12, Math.min(bounds.maxY - dropped.height - 12, enemy.y + 10));
        enemy.stolenCard = null;
        model.feedbackMessage = "🦸 Você assustou o ladrão e recuperou a carta!";
      } else {
        model.feedbackMessage = "🦸 Você espantou o ladrão de cartas!";
      }
      enemy.targetCard = null;
      enemy.state = "scared";
      return;
    }

    if (enemy.state === "seeking") {
      // Escolhe uma carta livre no baralho se ainda não tem alvo válido
      if (
        !enemy.targetCard ||
        enemy.targetCard.isPlaced ||
        model.player.carriedCard === enemy.targetCard ||
        this.isCardStolen(enemy.targetCard)
      ) {
        const freeCards = model.deckCards.filter(
          (c) => !c.isPlaced && model.player.carriedCard !== c && !this.isCardStolen(c)
        );
        if (freeCards.length === 0) {
          // Patrulha no topo esperando alguma carta ficar livre
          enemy.x += Math.sin(performance.now() * 0.003) * 1.2;
          return;
        }
        enemy.targetCard = freeCards[Math.floor(Math.random() * freeCards.length)];
      }

      const tx = enemy.targetCard.x + enemy.targetCard.width / 2 - enemy.width / 2;
      const ty = enemy.targetCard.y - enemy.height * 0.45;
      const dx = tx - enemy.x;
      const dy = ty - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= enemy.speed + 2) {
        enemy.stolenCard = enemy.targetCard;
        enemy.targetCard = null;
        enemy.state = "fleeing_with_card";
        enemy.cornerX = enemy.x < model.width / 2 ? bounds.maxX - enemy.width - 18 : bounds.minX + 18;
        enemy.cornerY = bounds.minY + 14;
        model.feedbackMessage = "🦝 Um ladrão pegou uma carta! Encoste nele para recuperar!";
      } else {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }
    } else if (enemy.state === "fleeing_with_card") {
      const dx = enemy.cornerX - enemy.x;
      const dy = enemy.cornerY - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= enemy.speed + 2) {
        enemy.x = enemy.cornerX;
        enemy.y = enemy.cornerY;
        enemy.state = "corner_idle";
      } else {
        enemy.x += (dx / dist) * (enemy.speed * 1.15);
        enemy.y += (dy / dist) * (enemy.speed * 1.15);
      }

      if (enemy.stolenCard) {
        enemy.stolenCard.x = enemy.x + (enemy.width - enemy.stolenCard.width) / 2;
        enemy.stolenCard.y = enemy.y + enemy.height * 0.45;
      }
    } else if (enemy.state === "corner_idle") {
      // Balança levemente no canto segurando a carta até o jogador ir buscar
      enemy.y = enemy.cornerY + Math.sin(performance.now() * 0.006) * 3;
      if (enemy.stolenCard) {
        enemy.stolenCard.x = enemy.x + (enemy.width - enemy.stolenCard.width) / 2;
        enemy.stolenCard.y = enemy.y + enemy.height * 0.45;
      }
    }
  }

  updatePuddleCloud(enemy, bounds, model) {
    this.updateHorizontal(enemy, bounds);

    enemy.dropTimer--;
    if (enemy.dropTimer <= 0) {
      enemy.dropTimer = model.difficulty === "hard" ? 210 : 260;

      // Posiciona a poça no chão da arena abaixo da nuvem
      const puddleX = Math.max(bounds.minX + 42, Math.min(bounds.maxX - 42, enemy.x + enemy.width / 2));
      const rawY = enemy.y + enemy.height + 26;
      const puddleY = Math.max(bounds.minY + 24, Math.min(bounds.maxY - 24, rawY));

      this.puddles.push({
        x: puddleX,
        y: puddleY,
        rx: model.isCompact ? 38 : 44,
        ry: model.isCompact ? 20 : 22,
        life: 240, // 4 segundos a 60fps
        maxLife: 240
      });
    }
  }

  handlePlayerHit(model, enemy, playerLayout) {
    model.player.invulnFrames = 50;

    const pCenterY = model.player.y + model.player.height / 2;
    const eCenterY = enemy.y + enemy.height / 2;
    const pushDir = pCenterY < eCenterY ? -1 : 1;
    model.player.y = Math.max(
      playerLayout.minY,
      Math.min(playerLayout.maxY, model.player.y + pushDir * 30)
    );

    const hitNames = {
      horizontal: "nuvem de confusão",
      diagonal: "nuvem elétrica",
      dash: "raio veloz"
    };
    const label = hitNames[enemy.type] || "obstáculo";

    if (model.player.carriedCard) {
      model.returnCardToDeck(model.player.carriedCard);
      model.player.carriedCard = null;
      model.feedbackMessage = `💥 Esbarrou na ${label}! A carta voltou ao baralho.`;
    } else {
      model.feedbackMessage = `💥 Cuidado com a ${label}!`;
    }
  }
}