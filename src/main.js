/* ==========================================================================
   IPACU :: MAIN APPLICATION ENTRYPOINT & CINEMATIC FLOW MANAGER
   ========================================================================== */

import Phaser from 'phaser';
import { GameScene } from './game/GameScene.js';
import { storage, BADGES } from './storage.js';
import { sound } from './audio.js';
import { multiplayer } from './game/MultiplayerManager.js';
import { groqAI } from './groq.js';

class AppManager {
  constructor() {
    this.game = null;
    this.gameScene = null;
    this.initUI();
  }

  initUI() {
    // 1. Phase 1 & 2: Paced Logo Stroke & Loading Progress
    this.runCinematicSplashSequence();

    // 2. Attach UI Event Listeners for 7-Phase Flow
    this.bindEvents();

    // 3. Update Career Stats on Main Menu
    this.updateUserMenuStats();
  }

  runCinematicSplashSequence() {
    const loadingBox = document.getElementById('loading-box');
    const loadingBar = document.getElementById('loading-bar');
    const loadingStatus = document.getElementById('loading-status');
    const btnNext = document.getElementById('btn-next-to-speech');

    // Reveal loading box after 3 seconds of logo drawing animation
    setTimeout(() => {
      loadingBox.classList.remove('hidden');

      const steps = [
        { pct: '30%', text: 'AWAKENING GODDESS POWER...' },
        { pct: '65%', text: 'ALIGNING DIMENSIONAL THREADS...' },
        { pct: '90%', text: 'LOCATING FATHER CHRIS SIGNAL...' },
        { pct: '100%', text: 'LABYRINTH SYNCHRONIZED' }
      ];

      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          loadingBar.style.width = step.pct;
          loadingStatus.innerText = step.text;
          currentStep++;
        } else {
          clearInterval(interval);
          loadingStatus.classList.add('hidden');
          btnNext.classList.remove('hidden');
        }
      }, 550);
    }, 2800);
  }

  bindEvents() {
    // Phase 2 -> Phase 3: Transition to Father Chris Speech
    document.getElementById('btn-next-to-speech').addEventListener('click', () => {
      sound.init();
      sound.playClick();
      this.switchScreen('splash-screen', 'father-chris-speech');
    });

    // Phase 3 -> Phase 4: Transition to Entity Dossier
    document.getElementById('btn-next-to-dossier').addEventListener('click', () => {
      sound.playClick();
      this.switchScreen('father-chris-speech', 'entity-dossier-screen');
    });

    // Phase 4 -> Phase 5: Transition to Main HQ Menu
    document.getElementById('btn-next-to-menu').addEventListener('click', () => {
      sound.playClick();
      this.switchScreen('entity-dossier-screen', 'main-menu');
      this.updateUserMenuStats();
    });

    // Phase 5 -> Phase 6: Play Solo -> Warp Transition Splash Screen
    document.getElementById('btn-play-solo').addEventListener('click', () => {
      sound.playClick();
      this.runWarpTransitionSequence(1);
    });

    // Multiplayer Button
    document.getElementById('btn-play-multiplayer').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('multiplayer-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-multiplayer').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('multiplayer-modal').classList.add('hidden');
    });

    // Create / Join Room
    document.getElementById('btn-create-room').addEventListener('click', async () => {
      sound.playClick();
      const res = await multiplayer.createRoom();
      document.getElementById('lobby-status').innerText = res.message;
    });

    document.getElementById('btn-join-room').addEventListener('click', async () => {
      sound.playClick();
      const code = document.getElementById('room-code-input').value;
      const res = await multiplayer.joinRoom(code);
      document.getElementById('lobby-status').innerText = res.message;
    });

    // Leaderboard Modal
    document.getElementById('btn-open-leaderboard').addEventListener('click', () => {
      sound.playClick();
      this.renderLeaderboard();
      document.getElementById('leaderboard-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-leaderboard').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('leaderboard-modal').classList.add('hidden');
    });

    // Badges Modal
    document.getElementById('btn-open-achievements').addEventListener('click', () => {
      sound.playClick();
      this.renderBadges();
      document.getElementById('achievements-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-achievements').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('achievements-modal').classList.add('hidden');
    });

    // Settings Audio Toggle
    document.getElementById('btn-open-settings').addEventListener('click', () => {
      sound.muted = !sound.muted;
      alert(sound.muted ? 'AUDIO SFX MUTED' : 'AUDIO SFX ENABLED');
    });

    // ESC key listener for Pause
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        const hud = document.getElementById('game-hud');
        if (!hud.classList.contains('hidden')) {
          this.togglePause();
        }
      }
    });

    // Pause Button in HUD
    document.getElementById('btn-pause-game').addEventListener('click', () => {
      sound.playClick();
      this.togglePause();
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume-game').addEventListener('click', () => {
      sound.playClick();
      this.togglePause();
    });

    document.getElementById('btn-toggle-audio').addEventListener('click', () => {
      sound.playClick();
      sound.muted = !sound.muted;
      document.getElementById('pause-audio-label').innerText = sound.muted ? 'AUDIO SFX MUTED' : 'AUDIO SFX ENABLED';
    });

    document.getElementById('btn-quit-match').addEventListener('click', () => {
      sound.playClick();
      this.togglePause();
      this.exitMatch();
    });

    // Minecraft Death Modal Buttons
    document.getElementById('btn-respawn-hero').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('hero-death-modal').classList.add('hidden');
      const scene = this.getGameScene();
      if (scene) {
        scene.respawnHero();
      }
    });

    document.getElementById('btn-death-title-menu').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('hero-death-modal').classList.add('hidden');
      this.exitMatch();
    });

    // Retry / Next Mission
    document.getElementById('btn-retry-match').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('match-summary-modal').classList.add('hidden');
      const nextLevel = (this.lastLevel || 1) + 1;
      this.runWarpTransitionSequence(nextLevel);
    });

    document.getElementById('btn-return-menu').addEventListener('click', () => {
      sound.playClick();
      document.getElementById('match-summary-modal').classList.add('hidden');
      this.lastLevel = 1;
      this.switchScreen('game-hud', 'main-menu');
      this.updateUserMenuStats();
    });

    // Trap Buttons
    document.querySelectorAll('.trap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.trap-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.gameScene) {
          this.gameScene.activeTrapType = btn.getAttribute('data-type');
        }
      });
    });

    // HUD Ability Buttons
    document.getElementById('skill-shield').addEventListener('click', () => {
      if (this.gameScene) this.gameScene.activateShield();
    });
    document.getElementById('skill-camo').addEventListener('click', () => {
      if (this.gameScene) this.gameScene.activateCamo();
    });
    document.getElementById('skill-sonar').addEventListener('click', () => {
      if (this.gameScene) this.gameScene.activateSonar();
    });

    // Touch D-Pad Event Handlers for Mobile Devices
    const bindDpad = (id, prop) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (this.gameScene) this.gameScene[prop] = true; });
      btn.addEventListener('pointerup', (e) => { e.preventDefault(); if (this.gameScene) this.gameScene[prop] = false; });
      btn.addEventListener('pointerleave', (e) => { e.preventDefault(); if (this.gameScene) this.gameScene[prop] = false; });
    };

    bindDpad('dpad-up', 'dpadUp');
    bindDpad('dpad-down', 'dpadDown');
    bindDpad('dpad-left', 'dpadLeft');
    bindDpad('dpad-right', 'dpadRight');

    const trapBtn = document.getElementById('dpad-trap');
    if (trapBtn) {
      trapBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.gameScene) this.gameScene.deployCurrentTrap();
      });
    }
  }

  runWarpTransitionSequence(level) {
    this.switchScreen('main-menu', 'warp-transition-splash');

    const warpBar = document.getElementById('warp-progress-bar');
    const warpAiStatus = document.getElementById('warp-ai-status');

    warpBar.style.width = '0%';
    warpAiStatus.innerText = 'GROQ AI DEMON LORD INITIALIZING...';

    // Fetch initial Groq AI Demon Lord taunt during warp
    groqAI.getDemonLordCommentary({
      zone: 'CENTRAL VIEWPORT',
      playerXp: storage.profile.totalXp,
      generalsLeft: 5,
      eventType: 'HUNTER_ENTERING_LABYRINTH'
    }).then(commentary => {
      const aiTextEl = document.getElementById('groq-ai-text');
      if (aiTextEl) aiTextEl.innerText = `"${commentary}"`;
    });

    setTimeout(() => { warpBar.style.width = '50%'; warpAiStatus.innerText = 'SYNCHRONIZING MAZE TOPOLOGY...'; }, 500);
    setTimeout(() => { warpBar.style.width = '100%'; warpAiStatus.innerText = 'WARP COMPLETE // ENTERING LABYRINTH'; }, 1300);

    setTimeout(() => {
      this.startSoloMatch(level);
    }, 1800);
  }

  updateUserMenuStats() {
    const rank = storage.getRank();
    document.getElementById('player-rank-title').innerText = rank.title;
    document.getElementById('player-xp-val').innerText = `${storage.profile.totalXp} XP (HIGHEST)`;
    document.getElementById('stat-high-score').innerText = storage.profile.highScore.toLocaleString();
    document.getElementById('stat-captures').innerText = `${storage.profile.captures / 3} / 5`;
  }

  startSoloMatch(level = 1) {
    this.lastLevel = level;
    this.switchScreen('warp-transition-splash', 'game-hud');

    const sceneData = {
      level,
      hudCallback: (hudData) => this.updateHUD(hudData),
      onMatchEndCallback: (matchData) => this.handleMatchEnd(matchData),
      onHeroDeathCallback: (cause) => this.handleHeroDeath(cause)
    };

    if (!this.game) {
      const config = {
        type: Phaser.AUTO,
        parent: 'phaser-game',
        width: 800,
        height: 560,
        backgroundColor: '#070a11',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: [GameScene]
      };

      this.game = new Phaser.Game(config);
      this.game.events.once('ready', () => {
        this.gameScene = this.game.scene.getScene('GameScene');
        this.game.scene.start('GameScene', sceneData);
      });
    } else {
      this.game.scene.start('GameScene', sceneData);
    }
  }

  updateHUD({ score, heroHp, maxHeroHp, multiplier, remainingSpecters, zoneName, generalsLeft }) {
    document.getElementById('hud-score-val').innerText = storage.profile.totalXp.toString().padStart(6, '0');
    document.getElementById('hud-death-count').innerText = (storage.profile.deathCount || 0).toString();

    // Hero Life Force Progress Bar Update
    if (heroHp !== undefined && maxHeroHp) {
      const curHp = Math.max(0, heroHp);
      const pct = Math.min(100, Math.max(0, (curHp / maxHeroHp) * 100));
      const hpValEl = document.getElementById('hud-hp-val');
      const hpBarEl = document.getElementById('hud-hp-bar');

      if (hpValEl) hpValEl.innerText = `${curHp} / ${maxHeroHp} HP`;
      if (hpBarEl) {
        hpBarEl.style.width = `${pct}%`;
        hpBarEl.classList.remove('warning', 'critical');
        if (pct < 30) {
          hpBarEl.classList.add('critical');
        } else if (pct < 60) {
          hpBarEl.classList.add('warning');
        }
      }
    }

    if (zoneName && zoneName !== this.lastZoneName) {
      this.lastZoneName = zoneName;
      document.getElementById('hud-zone-name').innerText = zoneName;

      // Trigger dynamic Groq AI Demon Lord commentary & active puppet master action on zone change
      groqAI.getDemonLordCommentary({
        zone: zoneName,
        playerXp: storage.profile.totalXp,
        generalsLeft: generalsLeft !== undefined ? generalsLeft : 5,
        eventType: `HUNTER_ENTERED_${zoneName.replace(/ /g, '_')}`
      }).then(res => {
        const commentary = typeof res === 'string' ? res : res.commentary;
        const actionType = typeof res === 'object' ? res.actionType : null;

        const aiTextEl = document.getElementById('groq-ai-text');
        if (aiTextEl) aiTextEl.innerText = `"${commentary}"`;

        if (actionType && this.gameScene) {
          this.gameScene.triggerDemonLordAction(actionType);
        }
      });
    }

    if (generalsLeft !== undefined) {
      document.getElementById('hud-generals-left').innerText = `${generalsLeft} GENERALS LEFT`;
    }
  }

  handleHeroDeath(cause) {
    const deathCount = storage.recordDeath();
    document.getElementById('minecraft-death-msg').innerText = cause || 'Hero was killed by High Knight';
    document.getElementById('minecraft-death-count-text').innerText = `Total Hero Deaths: ${deathCount}`;
    document.getElementById('hud-death-count').innerText = deathCount.toString();
    document.getElementById('hero-death-modal').classList.remove('hidden');
  }

  getGameScene() {
    if (this.game && this.game.scene) {
      return this.game.scene.getScene('GameScene') || this.gameScene;
    }
    return this.gameScene;
  }

  togglePause() {
    const pauseModal = document.getElementById('pause-modal');
    const isPaused = !pauseModal.classList.contains('hidden');

    if (isPaused) {
      pauseModal.classList.add('hidden');
      if (this.game && this.game.scene) {
        this.game.scene.resume('GameScene');
      }
      if (this.gameScene) this.gameScene.isMatchActive = true;
    } else {
      pauseModal.classList.remove('hidden');
      if (this.game && this.game.scene) {
        this.game.scene.pause('GameScene');
      }
      if (this.gameScene) this.gameScene.isMatchActive = false;
    }
  }

  handleMatchEnd(matchData) {
    const { xpGained } = storage.recordMatchResult(matchData);

    const generals = matchData.generalsDefeated || 1;
    document.getElementById('summary-title').innerText = `LORD GENERAL DEFEATED!`;
    document.getElementById('summary-subtitle').innerText = `SAINT ${generals} FREED FROM THE LABYRINTH`;
    document.getElementById('summary-score').innerText = storage.profile.totalXp.toLocaleString();
    const mins = Math.floor(matchData.timeSeconds / 60).toString().padStart(2, '0');
    const secs = (matchData.timeSeconds % 60).toString().padStart(2, '0');
    document.getElementById('summary-time').innerText = `${mins}:${secs}`;
    document.getElementById('summary-traps').innerText = matchData.trapsSprung;
    document.getElementById('summary-xp').innerText = `+${xpGained} XP`;

    const btnNext = document.getElementById('btn-retry-match');
    btnNext.querySelector('span').innerText = `HUNT GENERAL ${generals + 1}`;

    document.getElementById('match-summary-modal').classList.remove('hidden');
    this.updateUserMenuStats();
  }

  exitMatch() {
    document.getElementById('hero-death-modal').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('match-summary-modal').classList.add('hidden');
    if (this.gameScene) {
      this.gameScene.isMatchActive = false;
    }
    this.switchScreen('game-hud', 'main-menu');
    this.updateUserMenuStats();
  }

  renderLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    container.innerHTML = '';

    const history = storage.profile.localScoresHistory;
    if (history.length === 0) {
      container.innerHTML = `<div class="subtitle text-center" style="margin-top: 20px;">NO MATCH RECORDS YET. PLAY A MISSION!</div>`;
      return;
    }

    history.forEach((rec, idx) => {
      const row = document.createElement('div');
      row.className = `lb-row ${idx === 0 ? 'top-1' : ''}`;
      row.innerHTML = `
        <span class="lb-rank">#${idx + 1}</span>
        <span class="lb-name">HUNTER CAMPAIGN (${rec.date})</span>
        <span class="lb-score">${rec.score.toLocaleString()} XP</span>
      `;
      container.appendChild(row);
    });
  }

  renderBadges() {
    const container = document.getElementById('badges-container');
    container.innerHTML = '';

    BADGES.forEach(badge => {
      const isUnlocked = storage.isBadgeUnlocked(badge.id);
      const item = document.createElement('div');
      item.className = `badge-item ${isUnlocked ? 'unlocked' : ''}`;
      item.innerHTML = `
        <div class="badge-icon-box">
          <svg viewBox="0 0 24 24" width="22" height="22"><use href="#${badge.icon}"/></svg>
        </div>
        <div class="badge-details">
          <h4>${badge.name}</h4>
          <p>${badge.desc}</p>
        </div>
      `;
      container.appendChild(item);
    });
  }

  switchScreen(fromId, toId) {
    document.getElementById(fromId).classList.add('hidden');
    document.getElementById(toId).classList.remove('hidden');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new AppManager();
});
