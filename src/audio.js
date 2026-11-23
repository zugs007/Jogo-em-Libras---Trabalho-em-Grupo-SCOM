class SoundManager {
  constructor(basePath = "assets/sounds/") {
    this.basePath = basePath;
    this.isMuted = false;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.65;

    this.currentMusicKey = null;
    this.desiredMusicKey = null;
    this.pendingMusicKey = null;
    this.isAudioUnlocked = false;

    // Músicas de fundo (BGM)
    this.musicFiles = {
      hub: "Som hub.mp4",
      easy: "Som gameplay fácil.mp3",
      hard: "Som gameplay difícil.wav",
      boss_chaser: "Tema chefe sombra.mp4",
      boss_megaphone: "Tema chefe megafone.wav",
      boss_tornado: "Tema chefe tornado.mp3"
    };

    // Efeitos sonoros (SFX)
    this.sfxFiles = {
      dash: "Dash seta.wav",
      dashAlert: "Som alerta dash.wav",
      damage: "Som dano.wav",
      pickCard: "Pega carta.wav",
      megaphoneShoot: "Tiro megafone.mp4",
      tornado: "Tornado.flac",
      verify: "Verifica frase.wav"
    };

    // Ajuste individual de volume por efeito
    this.sfxVolumeScale = {
      dash: 0.85,
      dashAlert: 0.85,
      damage: 0.9,
      pickCard: 0.9,
      placeCard: 0.9,
      megaphoneShoot: 0.85,
      tornado: 0.32,
      verify: 0.9
    };

    // Player único <video playsinline> oculto: garante compatibilidade com .mp4, .mp3 e .wav
    // no iOS/Android e mantém o desbloqueio de áudio ao trocar de música entre fases
    this.bgmPlayer = document.createElement("video");
    this.bgmPlayer.playsInline = true;
    this.bgmPlayer.setAttribute("playsinline", "");
    this.bgmPlayer.setAttribute("webkit-playsinline", "");
    this.bgmPlayer.loop = true;
    this.bgmPlayer.preload = "auto";
    this.bgmPlayer.style.display = "none";
    if (document.body) {
      document.body.appendChild(this.bgmPlayer);
    }

    this.sfxBuffers = {};
    this.sfxFallbackCache = {};
    this.activeSfx = new Set();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = AudioCtx ? new AudioCtx() : null;

    this.preloadAll();
  }

  unlockAudioContext() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  unlockAudio() {
    this.unlockAudioContext();
    if (!this.isMuted && this.desiredMusicKey) {
      this.playMusic(this.desiredMusicKey);
    }
  }

  createReversedBuffer(audioBuffer) {
    if (!this.audioCtx || !audioBuffer) return audioBuffer;

    const reversed = this.audioCtx.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
      const src = audioBuffer.getChannelData(ch);
      const dst = reversed.getChannelData(ch);
      for (let i = 0, len = src.length; i < len; i++) {
        dst[i] = src[len - 1 - i];
      }
    }

    return reversed;
  }

  preloadAll() {
    // Pré-carrega efeitos sonoros na memória (Web Audio API)
    for (const [key, filename] of Object.entries(this.sfxFiles)) {
      const url = encodeURI(this.basePath + filename);

      const fallbackAudio = new Audio(url);
      fallbackAudio.preload = "auto";
      this.sfxFallbackCache[key] = fallbackAudio;
      if (key === "pickCard") {
        this.sfxFallbackCache["placeCard"] = fallbackAudio;
      }

      if (this.audioCtx) {
        fetch(url)
          .then((res) => res.arrayBuffer())
          .then((buf) => this.audioCtx.decodeAudioData(buf))
          .then((decoded) => {
            this.sfxBuffers[key] = decoded;
            if (key === "pickCard") {
              this.sfxBuffers["placeCard"] = this.createReversedBuffer(decoded);
            }
          })
          .catch(() => {});
      }
    }
  }

  playMusic(key) {
    this.desiredMusicKey = key;
    const filename = this.musicFiles[key];
    if (!filename || this.isMuted) return;

    const targetUrl = new URL(encodeURI(this.basePath + filename), window.location.href).href;

    // Já está tocando essa mesma faixa
    if (
      this.currentMusicKey === key &&
      this.bgmPlayer.src === targetUrl &&
      !this.bgmPlayer.paused
    ) {
      return;
    }

    if (this.pendingMusicKey === key && this.bgmPlayer.src === targetUrl) {
      return;
    }

    if (this.bgmPlayer.src !== targetUrl) {
      this.bgmPlayer.pause();
      this.bgmPlayer.src = targetUrl;
      this.bgmPlayer.load();
    }

    this.currentMusicKey = key;
    this.pendingMusicKey = key;
    this.bgmPlayer.loop = true;
    this.bgmPlayer.volume = this.musicVolume;

    const playPromise = this.bgmPlayer.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          this.pendingMusicKey = null;
          this.isAudioUnlocked = true;

          if (this.desiredMusicKey && this.desiredMusicKey !== key) {
            this.playMusic(this.desiredMusicKey);
          }
        })
        .catch(() => {
          this.pendingMusicKey = null;
          if (this.currentMusicKey === key) {
            this.currentMusicKey = null;
          }
        });
    } else {
      this.pendingMusicKey = null;
      this.isAudioUnlocked = true;
    }
  }

  pauseMusic() {
    this.pendingMusicKey = null;
    if (!this.bgmPlayer.paused) {
      this.bgmPlayer.pause();
    }
    this.stopAllSfx();
  }

  resumeMusic() {
    this.unlockAudioContext();
    if (!this.isMuted && this.desiredMusicKey) {
      this.playMusic(this.desiredMusicKey);
    }
  }

  stopMusic() {
    this.pendingMusicKey = null;
    this.bgmPlayer.pause();
    this.bgmPlayer.currentTime = 0;
    this.currentMusicKey = null;
  }

  stopAllSfx() {
    for (const stopFn of this.activeSfx) {
      stopFn();
    }
    this.activeSfx.clear();
  }

  playSfx(key) {
    if (this.isMuted) return;

    const scale = this.sfxVolumeScale[key] ?? 1;
    const finalVolume = Math.max(0, Math.min(1, this.sfxVolume * scale));

    const buffer = this.sfxBuffers[key];
    if (this.audioCtx && buffer) {
      this.unlockAudioContext();

      const source = this.audioCtx.createBufferSource();
      const gainNode = this.audioCtx.createGain();
      source.buffer = buffer;
      gainNode.gain.value = finalVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);

      const stopFn = () => {
        try {
          source.stop();
          source.disconnect();
          gainNode.disconnect();
        } catch (_) {}
      };

      this.activeSfx.add(stopFn);
      source.onended = () => {
        this.activeSfx.delete(stopFn);
        try {
          source.disconnect();
          gainNode.disconnect();
        } catch (_) {}
      };

      source.start(0);
      return;
    }

    const fallback = this.sfxFallbackCache[key];
    if (!fallback) return;

    fallback.pause();
    fallback.currentTime = 0;
    fallback.volume = finalVolume;

    const stopFallback = () => {
      fallback.pause();
      fallback.currentTime = 0;
    };

    this.activeSfx.add(stopFallback);
    fallback.onended = () => this.activeSfx.delete(stopFallback);
    fallback.play().catch(() => {});
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.pauseMusic();
    } else {
      this.resumeMusic();
    }
    return this.isMuted;
  }
}