class GameController {
  constructor() {
    this.canvas = document.getElementById("game-canvas");
    this.model = new GameModel(this.canvas.width, this.canvas.height);
    this.view = new GameView(this.canvas);

    this.keys = {};
    this.timerInterval = null;
    this.animationFrameId = null;

    this.bindEvents();
    this.updateHUD();
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

    document.getElementById("btn-verify").addEventListener("click", () => {
      this.model.verifyPhrase(() => this.updateHUD());
      this.updateHUD();
    });

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

      // Tecla ESC pausa/despausa quando estiver na tela do jogo
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
    this.switchScreen("screen-start");
  }

  startGame() {
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

    const modeLabel = this.model.difficulty === "hard" ? "🔥 Difícil (1.5x)" : "🟢 Fácil";
    document.getElementById("final-mode").textContent = modeLabel;
    document.getElementById("final-score").textContent = this.model.score;
    document.getElementById("final-phrases").textContent = this.model.phrasesCompleted;
    document.getElementById("final-highscore").textContent = this.model.highScore;

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