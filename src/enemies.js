class EnemyManager {
  constructor() {
    this.enemies = [];
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
    const bounds = this.getArenaBounds(model);
    const isHard = model.difficulty === "hard";

    const commonTypes = ["horizontal", "diagonal", "dash"];
    const pickRandom = () => commonTypes[Math.floor(Math.random() * commonTypes.length)];

    const typesToSpawn = isHard ? [pickRandom(), pickRandom()] : [pickRandom()];

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
        state: "patrol", // "patrol" | "aiming" | "dashing"
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

  update(model) {
    if (model.isGameOver || model.isChecking || model.isPaused || this.enemies.length === 0) {
      return;
    }

    if (model.player.invulnFrames > 0) {
      model.player.invulnFrames--;
    }

    const bounds = this.getArenaBounds(model);
    const playerLayout = model.getLayoutMetrics();

    for (const enemy of this.enemies) {
      if (enemy.type === "horizontal") {
        this.updateHorizontal(enemy, bounds);
      } else if (enemy.type === "diagonal") {
        this.updateDiagonal(enemy, bounds);
      } else if (enemy.type === "dash") {
        this.updateDash(enemy, bounds, model.player);
      }

      // Verifica colisão com o jogador (durante o dash o raio só acerta quando está correndo)
      const canHit = enemy.type !== "dash" || enemy.state === "dashing";
      if (canHit && model.player.invulnFrames <= 0 && model.checkCollision(model.player, enemy, -3)) {
        this.handlePlayerHit(model, enemy, playerLayout);
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
        // Mira na altura atual do jogador dentro da arena e avisa antes de disparar
        const targetY = player.y + player.height / 2 - enemy.height / 2;
        enemy.y = Math.max(bounds.minY, Math.min(bounds.maxY - enemy.height, targetY));
        enemy.state = "aiming";
        enemy.timer = 70; // ~1.15s de aviso visual
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