class EnemyManager {
  constructor() {
    this.enemies = [];
    this.puddles = [];
    this.projectiles = [];
    this.activeBoss = null;
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

  hasActiveBoss() {
    return this.activeBoss !== null;
  }

  spawnForPhase(model) {
    // Interrompe efeitos longos da fase anterior (ex: vento do Tornado)
    if (model.sound) {
      model.sound.stopAllSfx();
    }

    this.enemies = [];
    this.puddles = [];
    this.projectiles = [];
    this.activeBoss = null;

    const bounds = this.getArenaBounds(model);
    const isHard = model.difficulty === "hard";
    const phaseNumber = model.currentPhraseIndex + 1;
    const bossInterval = isHard ? 3 : 5;

    // Fases de Boss: 3, 6, 9... no Difícil | 5, 10, 15... no Fácil
    if (phaseNumber % bossInterval === 0) {
      const bossRotation = ["boss_chaser", "boss_megaphone", "boss_tornado"];
      const bossIndex = Math.floor(phaseNumber / bossInterval - 1) % bossRotation.length;
      const bossType = bossRotation[bossIndex];
      const boss = this.createBoss(bossType, bounds, model.isCompact, isHard);

      this.activeBoss = boss;
      this.enemies.push(boss);
      model.feedbackMessage = boss.alertText;
      return;
    }

    // Inimigos comuns aleatórios
    const commonTypes = ["horizontal", "diagonal", "dash", "thief", "puddle_cloud"];
    const pickRandom = () => commonTypes[Math.floor(Math.random() * commonTypes.length)];

    let typesToSpawn;
    if (isHard) {
      const first = pickRandom();
      let second = pickRandom();
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

  createBoss(type, bounds, isCompact, isHard) {
    const speedScale = isCompact ? 0.85 : 1;
    const hardScale = isHard ? 1.15 : 1;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const arenaH = bounds.maxY - bounds.minY;

    if (type === "boss_chaser") {
      const w = 66;
      const h = 66;
      return {
        type: "boss_chaser",
        alertText: "⚠️ CHEFE: Sombra da Ansiedade! Despiste ela (+100 pts bônus)!",
        x: centerX - w / 2,
        y: bounds.minY + 18,
        width: w,
        height: h,
        speed: 2.55 * speedScale * hardScale
      };
    }

    if (type === "boss_megaphone") {
      const w = 78;
      const h = 52;
      return {
        type: "boss_megaphone",
        alertText: "⚠️ CHEFE: Megafone Gigante! Desvie das ondas (+100 pts bônus)!",
        x: centerX - w / 2,
        y: bounds.minY + 14,
        width: w,
        height: h,
        vx: 2.1 * speedScale * hardScale,
        shootTimer: 95,
        aimAngle: Math.PI / 2
      };
    }

    // Padrão: "boss_tornado" (Tornado da Confusão - Puxa o jogador e solta folhas)
    const w = 74;
    const h = 84;
    return {
      type: "boss_tornado",
      alertText: "⚠️ CHEFE: Tornado da Confusão! Lute contra o vento (+100 pts bônus)!",
      x: centerX - w / 2,
      y: bounds.minY + arenaH * 0.28,
      baseY: bounds.minY + arenaH * 0.28,
      width: w,
      height: h,
      vx: 1.55 * speedScale * hardScale,
      pullStrength: (isHard ? 1.35 : 1.1) * speedScale,
      throwTimer: 75,
      throwAngle: 0.4
    };
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
        state: "seeking",
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
        dropTimer: 95
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

    // Atualiza poças temporárias
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      this.puddles[i].life--;
      if (this.puddles[i].life <= 0) {
        this.puddles.splice(i, 1);
      }
    }

    const bounds = this.getArenaBounds(model);
    const playerLayout = model.getLayoutMetrics();

    // Atualiza projéteis dos bosses
    this.updateProjectiles(model, bounds, playerLayout);

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
        this.updateDash(enemy, bounds, model);
        const canHit = enemy.state === "dashing";
        if (canHit && model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -3)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "thief") {
        this.updateThief(enemy, bounds, model);
      } else if (enemy.type === "puddle_cloud") {
        this.updatePuddleCloud(enemy, bounds, model);
      } else if (enemy.type === "boss_chaser") {
        this.updateChaserBoss(enemy, bounds, model.player);
        if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -5)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "boss_megaphone") {
        this.updateMegaphoneBoss(enemy, bounds, model);
        if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -4)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      } else if (enemy.type === "boss_tornado") {
        this.updateTornadoBoss(enemy, bounds, model, playerLayout);
        if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -10)) {
          this.handlePlayerHit(model, enemy, playerLayout);
        }
      }
    }
  }

  updateProjectiles(model, bounds, playerLayout) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.spin !== undefined) {
        proj.spin += 0.14;
      }

      if (
        proj.x + proj.width < bounds.minX - 10 ||
        proj.x > bounds.maxX + 10 ||
        proj.y > bounds.maxY + 12 ||
        proj.y + proj.height < bounds.minY - 20
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Margem negativa (-3) deixa a hitbox um pouco mais justa que o desenho
      if (model.player.invulnFrames <= 0 && model.checkCollision(model.player, proj, -3)) {
        this.projectiles.splice(i, 1);
        this.handlePlayerHit(model, proj, playerLayout);
      }
    }
  }

  updateChaserBoss(boss, bounds, player) {
    const bCenterX = boss.x + boss.width / 2;
    const bCenterY = boss.y + boss.height / 2;
    const pCenterX = player.x + player.width / 2;
    const pCenterY = player.y + player.height / 2;

    const dx = pCenterX - bCenterX;
    const dy = pCenterY - bCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
      boss.x += (dx / dist) * boss.speed;
      boss.y += (dy / dist) * boss.speed;
    }

    boss.x = Math.max(bounds.minX, Math.min(bounds.maxX - boss.width, boss.x));
    boss.y = Math.max(bounds.minY, Math.min(bounds.maxY - boss.height, boss.y));
  }

  updateMegaphoneBoss(boss, bounds, model) {
    this.updateHorizontal(boss, bounds);

    const bCenterX = boss.x + boss.width / 2;
    const bCenterY = boss.y + boss.height / 2;
    const pCenterX = model.player.x + model.player.width / 2;
    const pCenterY = model.player.y + model.player.height / 2;

    boss.aimAngle = Math.atan2(pCenterY - bCenterY, pCenterX - bCenterX);

    boss.shootTimer--;
    if (boss.shootTimer <= 0) {
      if (model.sound) model.sound.playSfx("megaphoneShoot");

      boss.shootTimer = model.difficulty === "hard" ? 105 : 130;
      const projSpeed = model.isCompact ? 3.5 : 4.1;
      const spreadAngles = [-0.28, 0, 0.28];

      // Hitbox ajustada (18x18) para bater certinho com o desenho das ondas
      const hitSize = 18;

      for (const offset of spreadAngles) {
        const angle = boss.aimAngle + offset;
        this.projectiles.push({
          type: "soundwave",
          x: bCenterX - hitSize / 2,
          y: bCenterY - hitSize / 2,
          width: hitSize,
          height: hitSize,
          vx: Math.cos(angle) * projSpeed,
          vy: Math.sin(angle) * projSpeed,
          angle
        });
      }
    }
  }

  updateTornadoBoss(boss, bounds, model, playerLayout) {
    // Desliza devagar na horizontal com leve oscilação vertical
    boss.x += boss.vx;
    const minTornadoX = bounds.minX + 60;
    const maxTornadoX = bounds.maxX - boss.width - 60;

    if (boss.x <= minTornadoX) {
      boss.x = minTornadoX;
      boss.vx = Math.abs(boss.vx);
    } else if (boss.x >= maxTornadoX) {
      boss.x = maxTornadoX;
      boss.vx = -Math.abs(boss.vx);
    }
    boss.y = boss.baseY + Math.sin(performance.now() * 0.0025) * 14;

    const tCenterX = boss.x + boss.width / 2;
    const tCenterY = boss.y + boss.height / 2;
    const pCenterX = model.player.x + model.player.width / 2;
    const pCenterY = model.player.y + model.player.height / 2;

    // 1. Efeito de vento puxando o jogador suavemente em direção ao tornado
    const dx = tCenterX - pCenterX;
    const dy = tCenterY - pCenterY;
    const dist = Math.hypot(dx, dy);

    if (dist > 14 && model.player.invulnFrames <= 0) {
      model.player.x += (dx / dist) * boss.pullStrength;
      model.player.y += (dy / dist) * boss.pullStrength;

      model.player.x = Math.max(24, Math.min(model.width - model.player.width - 24, model.player.x));
      model.player.y = Math.max(playerLayout.minY, Math.min(playerLayout.maxY, model.player.y));

      if (model.player.carriedCard) {
        model.player.carriedCard.x =
          model.player.x + (model.player.width - model.player.carriedCard.width) / 2;
        model.player.carriedCard.y = model.player.y - 38;
      }
    }

    // 2. Arremessa folhas de caderno girando em direções alternadas
    boss.throwTimer--;
    if (boss.throwTimer <= 0) {
      if (model.sound) model.sound.playSfx("tornado");

      boss.throwTimer = model.difficulty === "hard" ? 68 : 88;
      boss.throwAngle += 1.15;

      const projSpeed = model.isCompact ? 2.7 : 3.2;
      const size = 20;

      this.projectiles.push({
        type: "paper_swirl",
        x: tCenterX - size / 2,
        y: tCenterY - size / 2,
        width: size,
        height: size,
        vx: Math.cos(boss.throwAngle) * projSpeed,
        vy: Math.sin(boss.throwAngle) * projSpeed,
        spin: 0
      });
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

  updateDash(enemy, bounds, model) {
    const player = model.player;

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
        if (model.sound) model.sound.playSfx("dash");
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
      const exitX = enemy.x + enemy.width / 2 < model.width / 2 ? -60 : model.width + 20;
      const dx = exitX - enemy.x;
      if (Math.abs(dx) < 10) {
        enemy.state = "cooldown";
        enemy.cooldownTimer = 360;
      } else {
        enemy.x += Math.sign(dx) * (enemy.speed * 2.1);
      }
      return;
    }

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
        if (model.sound) model.sound.playSfx("pickCard");
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

      const puddleX = Math.max(bounds.minX + 42, Math.min(bounds.maxX - 42, enemy.x + enemy.width / 2));
      const rawY = enemy.y + enemy.height + 26;
      const puddleY = Math.max(bounds.minY + 24, Math.min(bounds.maxY - 24, rawY));

      this.puddles.push({
        x: puddleX,
        y: puddleY,
        rx: model.isCompact ? 38 : 44,
        ry: model.isCompact ? 20 : 22,
        life: 240,
        maxLife: 240
      });
    }
  }

  handlePlayerHit(model, hazard, playerLayout) {
    model.player.invulnFrames = 50;

    // Se encostou no Tornado, empurra o jogador para longe do centro do redemoinho
    if (hazard.type === "boss_tornado") {
      const pCenterX = model.player.x + model.player.width / 2;
      const pCenterY = model.player.y + model.player.height / 2;
      const hCenterX = hazard.x + hazard.width / 2;
      const hCenterY = hazard.y + hazard.height / 2;
      const dx = pCenterX - hCenterX;
      const dy = pCenterY - hCenterY;
      const dist = Math.max(1, Math.hypot(dx, dy));

      model.player.x = Math.max(
        24,
        Math.min(model.width - model.player.width - 24, model.player.x + (dx / dist) * 44)
      );
      model.player.y = Math.max(
        playerLayout.minY,
        Math.min(playerLayout.maxY, model.player.y + (dy / dist) * 44)
      );
    } else {
      const pCenterY = model.player.y + model.player.height / 2;
      const hCenterY = hazard.y + hazard.height / 2;
      const pushDir = pCenterY < hCenterY ? -1 : 1;
      model.player.y = Math.max(
        playerLayout.minY,
        Math.min(playerLayout.maxY, model.player.y + pushDir * 30)
      );
    }

    const hitNames = {
      horizontal: "nuvem de confusão",
      diagonal: "nuvem elétrica",
      dash: "raio veloz",
      boss_chaser: "Sombra da Ansiedade",
      boss_megaphone: "Megafone Gigante",
      boss_tornado: "Tornado da Confusão",
      soundwave: "onda sonora",
      paper_swirl: "folha no redemoinho"
    };
    const label = hitNames[hazard.type] || "obstáculo";

    if (model.player.carriedCard) {
      model.returnCardToDeck(model.player.carriedCard);
      model.player.carriedCard = null;
      model.feedbackMessage = `💥 Atingido por ${label}! A carta voltou ao baralho.`;
    } else {
      model.feedbackMessage = `💥 Cuidado com ${label}!`;
    }
  }
}