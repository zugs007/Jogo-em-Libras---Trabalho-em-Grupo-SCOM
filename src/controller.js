class GameController {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    const viewport = this.getTargetCanvasSize();
    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;

    this.model = new GameModel(viewport.width, viewport.height, viewport.isCompact);
    this.view = new GameView(this.canvas);

    this.keys = {};
    this.timerInterval = null;
    this.animationFrameId = null;

    this.bindEvents();
    this.updateHUD();
    this.renderSkinsMenu();
  }

  getTargetCanvasSize() {
    const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    return isMobilePortrait
      ? { width: 560, height: 725, isCompact: true }
      : { width: 920, height: 585, isCompact: false };
  }

  applyResponsiveCanvas() {
    const viewport = this.getTargetCanvasSize();
    if (this.canvas.width !== viewport.width || this.canvas.height !== viewport.height) {
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
    }
    if (this.model) {
      this.model.setViewport(viewport.width, viewport.height, viewport.isCompact);
      if (!this.model.isGameOver) {
        this.view.render(this.model);
      }
    }
  }

  bindEvents() {
    const modeButtons = document.querySelectorAll(".mode-btn");
    modeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeButtons.forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.model.setDifficulty(btn.dataset.mode);
      });
    });

    document.getElementById("btn-start").addEventListener("click", () => this.startGame());
    document.getElementById("btn-restart").addEventListener("click", () => this.startGame());
    document.getElementById("btn-home").addEventListener("click", () => this.goHome());
    document.getElementById("btn-finish").addEventListener("click", () => this.endGame());

    // Controles de Pause
    document.getElementById("btn-pause").addEventListener("click", () => this.handleTogglePause());
    document.getElementById("btn-resume").addEventListener("click", () => this.handleTogglePause());
    document.getElementById("btn-pause-restart").addEventListener("click", () => this.startGame());
    document.getElementById("btn-pause-home").addEventListener("click", () => this.goHome());
    
    const btnSkipPhase = document.getElementById("btn-skip-phase");
    if (btnSkipPhase) {
      btnSkipPhase.addEventListener("click", () => {
        this.model.skipPhaseForDebug();
        this.updateHUD();
      });
    }

    document.getElementById("btn-verify").addEventListener("click", () => {
      this.model.verifyPhrase(() => this.updateHUD());
      this.updateHUD();
    });

    this.bindDebugEvents();
    this.bindAlphabetEvents();
    this.bindTouchEvents();

    window.addEventListener("resize", () => this.applyResponsiveCanvas());

    window.addEventListener("keydown", (e) => {
      if (e.code === "F2") {
        e.preventDefault();
        this.toggleDebugModal();
        return;
      }

      const debugOverlay = document.getElementById("debug-overlay");
      if (debugOverlay && !debugOverlay.classList.contains("hidden")) {
        if (e.code === "Escape") {
          this.toggleDebugModal(false);
        }
        return;
      }

      const alphabetOverlay = document.getElementById("alphabet-overlay");
      if (alphabetOverlay && !alphabetOverlay.classList.contains("hidden")) {
        if (e.code === "Escape") {
          this.toggleAlphabetModal(false);
        }
        return;
      }

      this.keys[e.code] = true;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === "Escape" && document.getElementById("screen-game").classList.contains("active")) {
        this.handleTogglePause();
        return;
      }

      if (this.model.isPaused) return;

      if (e.code === "Space") {
        this.model.interact();
      } else if (e.code === "Enter") {
        this.model.verifyPhrase(() => this.updateHUD());
        this.updateHUD();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });
  }

  bindDebugEvents() {
    const input = document.getElementById("debug-highscore-input");
    const btnApply = document.getElementById("btn-debug-apply");
    const btnClose = document.getElementById("btn-debug-close");

    if (!input || !btnApply || !btnClose) return;

    btnApply.addEventListener("click", () => this.applyDebugScore(input.value));
    btnClose.addEventListener("click", () => this.toggleDebugModal(false));

    input.addEventListener("keydown", (e) => {
      if (e.code === "Enter") {
        e.preventDefault();
        this.applyDebugScore(input.value);
      }
    });

    document.querySelectorAll(".debug-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        input.value = btn.dataset.score;
        this.applyDebugScore(btn.dataset.score);
      });
    });
  }

  toggleDebugModal(forceState) {
    const overlay = document.getElementById("debug-overlay");
    const input = document.getElementById("debug-highscore-input");
    if (!overlay || !input) return;

    const shouldOpen = typeof forceState === "boolean" ? forceState : overlay.classList.contains("hidden");

    if (shouldOpen) {
      this.keys = {};
      input.value = this.model.highScore;
      overlay.classList.remove("hidden");
      input.focus();
      input.select();
    } else {
      overlay.classList.add("hidden");
    }
  }

  applyDebugScore(value) {
    this.model.setHighScore(value);
    this.updateHUD();
    this.renderSkinsMenu();
    this.toggleDebugModal(false);
  }

  bindAlphabetEvents() {
    const btnOpen = document.getElementById("btn-alphabet");
    const btnClose = document.getElementById("btn-alphabet-close");
    const overlay = document.getElementById("alphabet-overlay");

    if (!btnOpen || !btnClose || !overlay) return;

    btnOpen.addEventListener("click", () => this.toggleAlphabetModal(true));
    btnClose.addEventListener("click", () => this.toggleAlphabetModal(false));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        this.toggleAlphabetModal(false);
      }
    });
  }

  toggleAlphabetModal(forceState) {
    const overlay = document.getElementById("alphabet-overlay");
    if (!overlay) return;

    const shouldOpen = typeof forceState === "boolean" ? forceState : overlay.classList.contains("hidden");

    if (shouldOpen) {
      this.renderAlphabetGrid();
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }

  renderAlphabetGrid() {
    const grid = document.getElementById("alphabet-grid");
    if (!grid) return;
    grid.innerHTML = "";

    for (const letter of this.model.alphabet) {
      const card = document.createElement("div");
      card.className = "alphabet-card";

      const signBox = document.createElement("div");
      signBox.className = "alphabet-sign-box";

      const img = document.createElement("img");
      img.src = `assets/images/${letter}.png`;
      img.alt = `Sinal da letra ${letter} em Libras`;

      const fallback = document.createElement("div");
      fallback.className = "alphabet-fallback";
      fallback.innerHTML = `🤟<small>Sinal ${letter}</small>`;
      fallback.style.display = "none";

      img.onerror = () => {
        img.style.display = "none";
        fallback.style.display = "flex";
      };

      signBox.appendChild(img);
      signBox.appendChild(fallback);

      const badge = document.createElement("span");
      badge.className = "alphabet-letter";
      badge.textContent = letter;

      card.appendChild(signBox);
      card.appendChild(badge);
      grid.appendChild(card);
    }
  }

  bindTouchEvents() {
    const touchButtons = document.querySelectorAll(".touch-btn");
    const btnInteract = document.getElementById("btn-touch-interact");

    touchButtons.forEach((btn) => {
      const key = btn.dataset.key;

      const press = (e) => {
        e.preventDefault();
        if (this.model.isPaused) return;
        this.keys[key] = true;
        btn.classList.add("pressed");
      };

      const release = (e) => {
        e.preventDefault();
        this.keys[key] = false;
        btn.classList.remove("pressed");
      };

      btn.addEventListener("touchstart", press, { passive: false });
      btn.addEventListener("touchend", release, { passive: false });
      btn.addEventListener("touchcancel", release, { passive: false });

      btn.addEventListener("mousedown", press);
      btn.addEventListener("mouseup", release);
      btn.addEventListener("mouseleave", release);
    });

    if (btnInteract) {
      btnInteract.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          if (!this.model.isPaused) {
            this.model.interact();
          }
        },
        { passive: false }
      );

      btnInteract.addEventListener("click", () => {
        if (!this.model.isPaused) {
          this.model.interact();
        }
      });
    }
  }

  renderSkinsMenu() {
    const grid = document.getElementById("skins-grid");
    if (!grid) return;
    grid.innerHTML = "";

    for (const skin of this.model.skins) {
      const unlocked = this.model.isSkinUnlocked(skin.id);
      const isSelected = this.model.selectedSkin === skin.id;

      const card = document.createElement("button");
      card.type = "button";
      card.className = `skin-card${unlocked ? "" : " locked"}${isSelected ? " selected" : ""}`;

      const preview = document.createElement("canvas");
      preview.width = 58;
      preview.height = 54;
      preview.className = "skin-preview";
      this.view.renderSkinPreview(preview, skin.id);

      const title = document.createElement("span");
      title.className = "skin-title";
      title.textContent = unlocked ? skin.name : `🔒 ${skin.name}`;

      const status = document.createElement("span");
      status.className = `skin-status ${
        isSelected ? "status-equipped" : unlocked ? "status-unlocked" : "status-locked"
      }`;
      status.textContent = isSelected
        ? "✔ Equipada"
        : unlocked
        ? "Selecionar"
        : `${skin.unlockScore} pts`;

      card.appendChild(preview);
      card.appendChild(title);
      card.appendChild(status);

      if (unlocked) {
        card.addEventListener("click", () => {
          this.model.selectSkin(skin.id);
          this.renderSkinsMenu();
        });
      }

      grid.appendChild(card);
    }
  }

  handleTogglePause() {
    const paused = this.model.togglePause();
    const overlay = document.getElementById("pause-overlay");
    const btnPause = document.getElementById("btn-pause");
    const btnVerify = document.getElementById("btn-verify");

    if (paused) {
      overlay.classList.remove("hidden");
      btnPause.textContent = "▶ Continuar";
      btnVerify.disabled = true;
      this.view.render(this.model);
    } else {
      overlay.classList.add("hidden");
      btnPause.textContent = "⏸️ Pausar";
      btnVerify.disabled = false;
    }
  }

  syncPauseUI() {
    document.getElementById("pause-overlay").classList.add("hidden");
    document.getElementById("btn-pause").textContent = "⏸️ Pausar";
    document.getElementById("btn-verify").disabled = false;
  }

  switchScreen(screenId) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
  }

  goHome() {
    this.model.isGameOver = true;
    this.model.isPaused = false;
    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrameId);
    this.syncPauseUI();
    this.updateHUD();
    this.renderSkinsMenu();
    this.switchScreen("screen-start");
  }

  startGame() {
    this.applyResponsiveCanvas();
    this.model.resetGame();
    this.syncPauseUI();
    this.updateHUD();
    this.switchScreen("screen-game");

    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrameId);

    this.timerInterval = setInterval(() => {
      if (this.model.isPaused) return;

      this.model.timeLeft--;
      this.updateHUD();

      if (this.model.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    const loop = () => {
      if (!this.model.isGameOver) {
        if (!this.model.isPaused) {
          this.model.movePlayer(this.keys);
          this.model.updateObstacles();
        }
        this.view.render(this.model);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  endGame() {
    this.model.isGameOver = true;
    this.model.isPaused = false;
    this.syncPauseUI();
    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrameId);

    const newlyUnlocked = this.model.skins.filter(
      (s) => s.unlockScore > this.model.runStartHighScore && this.model.highScore >= s.unlockScore
    );

    const unlockBanner = document.getElementById("unlock-banner");
    if (newlyUnlocked.length > 0) {
      const names = newlyUnlocked.map((s) => s.name).join(", ");
      unlockBanner.textContent = `🎉 Nova Skin Desbloqueada: ${names}!`;
      unlockBanner.classList.remove("hidden");
    } else {
      unlockBanner.classList.add("hidden");
    }

    const modeLabel = this.model.difficulty === "hard" ? "🔥 Difícil (1.5x)" : "🟢 Fácil";
    document.getElementById("final-mode").textContent = modeLabel;
    document.getElementById("final-score").textContent = this.model.score;
    document.getElementById("final-phrases").textContent = this.model.phrasesCompleted;
    document.getElementById("final-highscore").textContent = this.model.highScore;

    this.renderSkinsMenu();
    this.switchScreen("screen-gameover");
  }

  updateHUD() {
    const minutes = String(Math.floor(this.model.timeLeft / 60)).padStart(2, "0");
    const seconds = String(Math.floor(this.model.timeLeft % 60)).padStart(2, "0");
    const modeLabel = this.model.difficulty === "hard" ? "🔥 Difícil" : "🟢 Fácil";

    document.getElementById("hud-timer").textContent = `${minutes}:${seconds}`;
    document.getElementById("hud-score").textContent = this.model.score;
    document.getElementById("hud-level").textContent = this.model.currentPhraseIndex + 1;
    document.getElementById("hud-mode").textContent = modeLabel;
    document.getElementById("hud-highscore").textContent = this.model.highScore;
    document.getElementById("start-highscore").textContent = this.model.highScore;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new GameController();
});