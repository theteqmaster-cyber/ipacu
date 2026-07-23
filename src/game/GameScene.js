/* ==========================================================================
   IPACU :: THE LABYRINTH OF DIMENSION (OPEN WORLD STORY SCENE)
   ========================================================================== */

import Phaser from 'phaser';
import { sound } from '../audio.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');

    this.tileSize = 40;
    this.worldWidthTiles = 80;
    this.worldHeightTiles = 60;

    this.player = null;
    this.saint = null;
    this.lordGeneral = null;
    this.undeadList = [];
    this.highKnights = [];
    this.traps = [];
    this.walls = null;
    this.cursors = null;
    this.keys = null;

    // Game Stats & State
    this.score = 0;
    this.multiplier = 1;
    this.trapsSprungCount = 0;
    this.timeElapsed = 0;
    this.generalsDefeated = 0;
    this.lordGeneralHp = 5;
    this.activeTrapType = 'laser';
    this.isMatchActive = false;
    this.currentZoneName = 'CENTRAL VIEWPORT';

    // Skill States & Cooldowns
    this.isShieldActive = false;
    this.isCamoActive = false;
    this.shieldCooldown = false;
    this.camoCooldown = false;
    this.sonarCooldown = false;

    this.hudCallback = null;
    this.hudCallback = null;
    this.onMatchEndCallback = null;
    this.onHeroDeathCallback = null;
  }

  init(data) {
    if (data) {
      if (data.level) this.generalsDefeated = Math.max(0, data.level - 1);
      if (data.hudCallback) this.hudCallback = data.hudCallback;
      if (data.onMatchEndCallback) this.onMatchEndCallback = data.onMatchEndCallback;
      if (data.onHeroDeathCallback) this.onHeroDeathCallback = data.onHeroDeathCallback;
    }
  }

  create() {
    this.score = 0;
    this.multiplier = 1;
    this.trapsSprungCount = 0;
    this.timeElapsed = 0;
    this.lordGeneralHp = 8;
    this.heroHp = 100;
    this.maxHeroHp = 100;
    this.undeadList = [];
    this.highKnights = [];
    this.traps = [];
    this.isMatchActive = true;

    const worldW = this.worldWidthTiles * this.tileSize;
    const worldH = this.worldHeightTiles * this.tileSize;

    // 1. Set Physics Bounds & Camera Bounds
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // 2. Build Open Multi-Zone Labyrinth
    this.createMultiZoneLabyrinth();

    // 3. Spawn Hunter (Player) in Central Blue Viewport Zone
    this.createPlayer();

    // 4. Camera Follow
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 5. Spawn Entities (Saint, Undead, High Knights, Lord General Boss)
    this.spawnStoryEntities();

    // 6. Controls setup
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
      TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
      THREE: Phaser.Input.Keyboard.KeyCodes.THREE
    });

    this.input.keyboard.on('keydown-SPACE', () => this.deployCurrentTrap());
    this.input.keyboard.on('keydown-ONE', () => this.activateShield());
    this.input.keyboard.on('keydown-TWO', () => this.activateCamo());
    this.input.keyboard.on('keydown-THREE', () => this.activateSonar());

    // Timer
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isMatchActive) {
          this.timeElapsed += 1;
        }
      },
      loop: true
    });

    // Boss Chamber Aura Drain Timer (Drains 2 HP every second in DARK VOID)
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (this.isMatchActive && this.currentZoneName === 'DARK VOID (LORD GENERAL)' && this.player) {
          if (this.heroHp > 0) {
            this.heroHp = Math.max(0, this.heroHp - 2);
            const pop = this.add.text(this.player.x, this.player.y - 25, '-2 HP (GENERAL AURA)', {
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '10px',
              color: '#ff0055'
            }).setOrigin(0.5);
            this.tweens.add({ targets: pop, y: this.player.y - 40, alpha: 0, duration: 600, onComplete: () => pop.destroy() });
          }
          if (this.heroHp <= 0) {
            this.triggerHeroDeath("Hero was killed by Lord General's Aura");
          }
        }
      },
      loop: true
    });
  }

  createMultiZoneLabyrinth() {
    this.walls = this.physics.add.staticGroup();

    // Define Zone Bounding Rectangles
    this.zones = [
      { name: 'CENTRAL VIEWPORT', minC: 25, maxC: 55, minR: 20, maxR: 40, wallColor: 0x00f0ff },
      { name: 'YELLOW KNIGHT LAIR', minC: 5, maxC: 24, minR: 5, maxR: 25, wallColor: 0xffb800 },
      { name: 'PURPLE OUTER CHAMBERS', minC: 56, maxC: 75, minR: 5, maxR: 25, wallColor: 0xa855f7 },
      { name: 'HOLY CHURCH (SAINT)', minC: 5, maxC: 24, minR: 35, maxR: 55, wallColor: 0xffffff },
      { name: 'DARK VOID (LORD GENERAL)', minC: 56, maxC: 75, minR: 35, maxR: 55, wallColor: 0xff0055 }
    ];

    // Build World Perimeter Wall
    for (let r = 0; r < this.worldHeightTiles; r++) {
      for (let c = 0; c < this.worldWidthTiles; c++) {
        const isBorder = (r === 0 || r === this.worldHeightTiles - 1 || c === 0 || c === this.worldWidthTiles - 1);
        const isZoneBoundary = (r % 20 === 0 || c % 25 === 0);
        const isOpening = (r % 20 === 0 && (c % 10 === 4 || c % 10 === 5)) || (c % 25 === 0 && (r % 10 === 4 || r % 10 === 5));

        if (isBorder || (isZoneBoundary && !isOpening)) {
          const x = c * this.tileSize + this.tileSize / 2;
          const y = r * this.tileSize + this.tileSize / 2;

          let color = 0x0f172a;
          let stroke = 0x00f0ff;

          const zone = this.zones.find(z => c >= z.minC && c <= z.maxC && r >= z.minR && r <= z.maxR);
          if (zone) stroke = zone.wallColor;

          const wall = this.add.rectangle(x, y, this.tileSize - 2, this.tileSize - 2, color);
          wall.setStrokeStyle(2, stroke, 0.6);
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
      }
    }
  }

  createPlayer() {
    // Spawn player in center of Viewport Zone
    const startX = 40 * this.tileSize;
    const startY = 30 * this.tileSize;

    this.player = this.add.container(startX, startY);

    const bgCircle = this.add.circle(0, 0, 14, 0x00f0ff, 0.3);
    const mainCircle = this.add.circle(0, 0, 10, 0x00f0ff, 0.9);
    mainCircle.setStrokeStyle(2, 0xffffff, 0.9);

    this.shieldAura = this.add.circle(0, 0, 22, 0x00f0ff, 0);
    this.shieldAura.setStrokeStyle(2, 0x00f0ff, 0);

    this.player.add([this.shieldAura, bgCircle, mainCircle]);
    this.physics.add.existing(this.player);

    const body = this.player.body;
    body.setCircle(14, -14, -14);
    body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.walls);
  }

  spawnStoryEntities() {
    // 1. Spawn Saint ⚪ in Holy Church (Brown/White Zone)
    const saintX = 14 * this.tileSize;
    const saintY = 45 * this.tileSize;

    this.saint = this.add.container(saintX, saintY);
    const saintGlow = this.add.circle(0, 0, 18, 0xffffff, 0.35);
    const saintCore = this.add.circle(0, 0, 10, 0xffffff, 0.95);
    saintCore.setStrokeStyle(2, 0x00f0ff, 0.9);

    this.saint.add([saintGlow, saintCore]);
    this.physics.add.existing(this.saint);
    this.saint.body.setCircle(14, -14, -14);

    // Saint pulse animation
    this.tweens.add({
      targets: saintGlow,
      scale: 1.3,
      yoyo: true,
      repeat: -1,
      duration: 1000
    });

    // 2. Spawn 6 Undead 🔴
    const undeadSpawns = [
      { c: 30, r: 25 }, { c: 50, r: 25 }, { c: 35, r: 35 },
      { c: 45, r: 35 }, { c: 60, r: 15 }, { c: 65, r: 15 }
    ];

    undeadSpawns.forEach(sp => {
      const u = this.add.container(sp.c * this.tileSize, sp.r * this.tileSize);
      const aura = this.add.circle(0, 0, 14, 0xff0055, 0.3);
      const core = this.add.circle(0, 0, 8, 0xff0055, 0.95);
      core.setStrokeStyle(2, 0xffb800, 0.8);
      u.add([aura, core]);

      this.physics.add.existing(u);
      u.body.setCircle(12, -12, -12);
      this.physics.add.collider(u, this.walls);

      u.isCaptured = false;
      u.isStunned = false;
      u.moveTimer = 0;
      this.undeadList.push(u);

      this.physics.add.overlap(this.player, u, () => this.handleHunterUndeadContact(u));
    });

    // 3. Spawn High Knights 🟢
    // Yellow Lair (2), Holy Church (5 - Saint heavily guarded!), Boss Chamber (2 - Guarding Boss)
    const knightSpawns = [
      { c: 12, r: 12 }, { c: 18, r: 18 }, // Yellow Lair
      { c: 8, r: 38 }, { c: 20, r: 38 }, { c: 8, r: 52 }, { c: 20, r: 52 }, { c: 14, r: 40 }, // Holy Church Guards (5)
      { c: 58, r: 40 }, { c: 72, r: 48 } // Dark Void Boss Guards (2)
    ];
    this.initialKnightSpawns = knightSpawns.map(sp => ({ x: sp.c * this.tileSize, y: sp.r * this.tileSize }));
    knightSpawns.forEach(sp => this.spawnHighKnight(sp.c * this.tileSize, sp.r * this.tileSize));

    // 4. Spawn Lord General Boss 🖤 in Dark Void Layer
    const bgx = 65 * this.tileSize;
    const bgy = 45 * this.tileSize;

    this.lordGeneral = this.add.container(bgx, bgy);
    const gGlow = this.add.circle(0, 0, 26, 0xa855f7, 0.4);
    const gCore = this.add.circle(0, 0, 16, 0x000000, 1);
    gCore.setStrokeStyle(3, 0xff0055, 0.95);

    this.lordGeneral.add([gGlow, gCore]);
    this.physics.add.existing(this.lordGeneral);
    this.lordGeneral.body.setCircle(20, -20, -20);
    this.physics.add.collider(this.lordGeneral, this.walls);

    this.physics.add.overlap(this.player, this.lordGeneral, () => this.handleHunterGeneralContact());
  }

  spawnHighKnight(x, y) {
    const hk = this.add.container(x, y);
    const aura = this.add.circle(0, 0, 16, 0x00ff88, 0.35);
    const core = this.add.circle(0, 0, 10, 0x00ff88, 0.95);
    core.setStrokeStyle(2, 0xffffff, 0.9);
    hk.add([aura, core]);

    this.physics.add.existing(hk);
    hk.body.setCircle(14, -14, -14);
    this.physics.add.collider(hk, this.walls);

    hk.moveTimer = 0;
    this.highKnights.push(hk);

    // Overlap with Hunter -> Drains HP
    this.physics.add.overlap(this.player, hk, () => this.handleKnightHunterContact(hk));
  }

  takeDamage(amount, cause) {
    if (this.isShieldActive || this.isInvincible || !this.isMatchActive) return;

    this.heroHp = Math.max(0, this.heroHp - amount);
    this.isInvincible = true;

    // Visual damage indicator text
    const pop = this.add.text(this.player.x, this.player.y - 20, `-${amount} HP!`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '13px',
      color: '#ff0055',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: this.player.y - 45, alpha: 0, duration: 800, onComplete: () => pop.destroy() });

    // Flash player container for 1.2s invulnerability period
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      yoyo: true,
      repeat: 4,
      duration: 120,
      onComplete: () => {
        if (this.player) this.player.alpha = 1;
      }
    });

    this.time.delayedCall(1200, () => {
      this.isInvincible = false;
    });

    if (this.heroHp <= 0) {
      this.triggerHeroDeath(cause);
    }
  }

  handleKnightHunterContact(hk) {
    this.takeDamage(25, "Hero was killed by High Knight");
  }

  handleHunterGeneralContact() {
    if (!this.isMatchActive) return;

    if (this.isShieldActive) {
      this.lordGeneralHp -= 1;
      sound.playCaptureTriumph();

      const pop = this.add.text(this.lordGeneral.x, this.lordGeneral.y - 30, `BOSS STRUCK BY SHIELD! (${this.lordGeneralHp}/8 HP)`, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '14px',
        color: '#a855f7',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: this.lordGeneral.y - 60, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });

      if (this.lordGeneralHp <= 0) {
        this.generalsDefeated += 1;
        this.finishMatch(true);
      }
    } else {
      this.takeDamage(50, "Hero was slain by Lord General");
    }
  }

  triggerBossTrap(trap) {
    trap.active = false;
    trap.destroy();
    sound.playTrapDeploy();

    this.lordGeneralHp -= 1;
    sound.playCaptureTriumph();

    const pop = this.add.text(this.lordGeneral.x, this.lordGeneral.y - 30, `LORD GENERAL TRAPPED! (${this.lordGeneralHp}/8 HP)`, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '14px',
      color: '#a855f7',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: this.lordGeneral.y - 60, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });

    // Boss dashes away when hit
    const dashAngle = Math.random() * Math.PI * 2;
    this.lordGeneral.x = Phaser.Math.Clamp(this.lordGeneral.x + Math.cos(dashAngle) * 100, 56 * this.tileSize, 74 * this.tileSize);
    this.lordGeneral.y = Phaser.Math.Clamp(this.lordGeneral.y + Math.sin(dashAngle) * 100, 35 * this.tileSize, 54 * this.tileSize);

    // Spawns High Knight minion on hit!
    this.spawnHighKnight(this.lordGeneral.x, this.lordGeneral.y);

    if (this.lordGeneralHp <= 0) {
      this.generalsDefeated += 1;
      this.finishMatch(true);
    }
  }

  triggerHeroDeath(cause) {
    if (!this.isMatchActive) return;
    this.isMatchActive = false;
    if (this.player && this.player.body) {
      this.player.body.setVelocity(0);
    }

    sound.playTrapDeploy();
    this.cameras.main.shake(300, 0.02);

    const pop = this.add.text(this.player.x, this.player.y - 40, 'HERO DIED!', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      color: '#ff0055',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.time.delayedCall(600, () => {
      if (this.onHeroDeathCallback) {
        this.onHeroDeathCallback(cause);
      }
    });
  }

  respawnHero() {
    if (!this.player) return;
    this.heroHp = this.maxHeroHp || 100;
    this.currentZoneName = 'CENTRAL VIEWPORT';
    
    const spawnX = 40 * this.tileSize;
    const spawnY = 30 * this.tileSize;
    
    this.player.setPosition(spawnX, spawnY);
    if (this.player.body) {
      this.player.body.reset(spawnX, spawnY);
    }

    // Reset High Knights back to their starting positions
    if (this.initialKnightSpawns && this.highKnights) {
      this.highKnights.forEach((hk, i) => {
        const sp = this.initialKnightSpawns[i];
        if (sp && hk.body) {
          hk.setPosition(sp.x, sp.y);
          hk.body.reset(sp.x, sp.y);
        }
      });
    }
    
    this.cameras.main.resetFX();
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    
    this.isMatchActive = true;
    this.isInvincible = true;
    this.shieldCooldown = false;
    this.activateShield(); // Grant temporary spawn shield

    this.time.delayedCall(4000, () => {
      this.isInvincible = false;
    });

    // Immediate HUD update on respawn
    if (this.hudCallback) {
      const remainingUndead = this.undeadList.filter(u => !u.isCaptured).length;
      this.hudCallback({
        score: this.score,
        heroHp: this.heroHp,
        maxHeroHp: this.maxHeroHp,
        multiplier: this.multiplier,
        remainingSpecters: remainingUndead,
        zoneName: this.currentZoneName,
        generalsLeft: 5 - this.generalsDefeated
      });
    }
  }

  triggerDemonLordAction(actionType) {
    if (!this.isMatchActive || !this.player) return;
    if (actionType === 'SUMMON_MINION') {
      this.spawnHighKnight(this.player.x + 120, this.player.y + 120);
      const pop = this.add.text(this.player.x, this.player.y - 50, '[GROQ AI: REINFORCEMENTS SUMMONED!]', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '12px',
        color: '#ff0055',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: this.player.y - 80, alpha: 0, duration: 1500, onComplete: () => pop.destroy() });
    } else if (actionType === 'AURA_SURGE') {
      if (this.score > 0) this.score = Math.max(0, this.score - 25);
      this.cameras.main.shake(200, 0.01);
    }
  }

  activateShield() {
    if (this.shieldCooldown || !this.isMatchActive) return;
    this.shieldCooldown = true;
    this.isShieldActive = true;

    sound.playShield();
    this.shieldAura.setStrokeStyle(3, 0x00f0ff, 1);
    this.shieldAura.setFillStyle(0x00f0ff, 0.3);

    this.time.delayedCall(4000, () => {
      this.isShieldActive = false;
      this.shieldAura.setStrokeStyle(2, 0x00f0ff, 0);
      this.shieldAura.setFillStyle(0x00f0ff, 0);
    });

    this.time.delayedCall(10000, () => {
      this.shieldCooldown = false;
    });
  }

  activateCamo() {
    if (this.camoCooldown || !this.isMatchActive) return;
    this.camoCooldown = true;
    this.isCamoActive = true;

    sound.playCamo();
    this.player.alpha = 0.25;

    this.time.delayedCall(4500, () => {
      this.isCamoActive = false;
      this.player.alpha = 1;
    });

    this.time.delayedCall(12000, () => {
      this.camoCooldown = false;
    });
  }

  activateSonar() {
    if (this.sonarCooldown || !this.isMatchActive) return;
    this.sonarCooldown = true;

    sound.playSonar();
    const wave = this.add.circle(this.player.x, this.player.y, 10, 0x00f0ff, 0);
    wave.setStrokeStyle(2, 0x00f0ff, 1);

    this.tweens.add({
      targets: wave,
      radius: 400,
      alpha: 0,
      duration: 800,
      onComplete: () => wave.destroy()
    });

    this.time.delayedCall(8000, () => {
      this.sonarCooldown = false;
    });
  }

  finishMatch(victory) {
    this.isMatchActive = false;

    if (victory) {
      const banner = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 20, `LORD GENERAL DEFEATED!\nSAINT RESCUED FROM IPACU`, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '24px',
        color: '#00ff88',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);

      this.tweens.add({
        targets: banner,
        scale: { from: 0.5, to: 1.2 },
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: 'Back.easeOut'
      });

      this.time.delayedCall(800, () => {
        if (this.onMatchEndCallback) {
          this.onMatchEndCallback({
            victory: true,
            score: this.score + 5000,
            timeSeconds: this.timeElapsed,
            trapsSprung: this.trapsSprungCount,
            generalsDefeated: this.generalsDefeated
          });
        }
      });
    }
  }
}
