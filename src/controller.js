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
    document.getElementById("btn-start").addEventListener("click", () => this.startGame());
    document.getElementById("btn-restart").addEventListener("click", () => this.startGame());
    document.getElementById("btn-home").addEventListener("click", () => this.goHome());
    document.getElementById("btn-finish").addEventListener("click", () => this.endGame());
    document.getElementById("btn-verify").addEventListener("click", () => {
      this.model.verifyPhrase(() => this.updateHUD());
      this.updateHUD();
    });

    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }

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

  switchScreen(screenId) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    document.getElementById(screenId).classList.add("active");
  }

  goHome() {
    this.updateHUD();
    this.switchScreen("screen-start");
  }

  startGame() {
    this.model.resetGame();
    this.updateHUD();
    this.switchScreen("screen-game");

    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrameId);

    this.timerInterval = setInterval(() => {
      this.model.timeLeft--;
      this.updateHUD();

      if (this.model.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);

    const loop = () => {
      if (!this.model.isGameOver) {
        this.model.movePlayer(this.keys);
        this.view.render(this.model);
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };
    loop();
  }

  endGame() {
    this.model.isGameOver = true;
    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrameId);

    document.getElementById("final-score").textContent = this.model.score;
    document.getElementById("final-phrases").textContent = this.model.phrasesCompleted;
    document.getElementById("final-highscore").textContent = this.model.highScore;

    this.switchScreen("screen-gameover");
  }

  updateHUD() {
    const minutes = String(Math.floor(this.model.timeLeft / 60)).padStart(2, "0");
    const seconds = String(this.model.timeLeft % 60).padStart(2, "0");

    document.getElementById("hud-timer").textContent = `${minutes}:${seconds}`;
    document.getElementById("hud-score").textContent = this.model.score;
    document.getElementById("hud-level").textContent = this.model.currentPhraseIndex + 1;
    document.getElementById("hud-highscore").textContent = this.model.highScore;
    document.getElementById("start-highscore").textContent = this.model.highScore;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new GameController();
});