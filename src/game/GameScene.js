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
    sound.setBGMTempo(1.5); // Fast gameplay horror beat default

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

    // 7. Touch / Mouse Tap-To-Move Pointer Listener
    this.targetMovePoint = null;
    this.input.on('pointerdown', (pointer) => {
      if (!this.isMatchActive || !this.player) return;
      if (pointer.downElement && pointer.downElement.tagName !== 'CANVAS') return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.targetMovePoint = { x: worldPoint.x, y: worldPoint.y };
    });

    // Match Timer & Saint Continuous Spawning Engine (Spawns more as game progresses)
    this.isChurchCorrupted = false;
    this.isBossPressuredToChurch = false;

    this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.isMatchActive) return;
        this.timeElapsed += 1;

        // At 2 minutes (120s), Lord General decides to target the Holy Church as his trump card!
        if (this.timeElapsed >= 120 && !this.isBossPressuredToChurch) {
          this.isBossPressuredToChurch = true;
          const toast = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 140, '⚡ 2 MINUTES ELAPSED: DEMON LORD MARCHING TO CORRUPT THE SAINT!', {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            color: '#a855f7',
            fontStyle: 'bold',
            align: 'center',
            backgroundColor: 'rgba(25, 5, 20, 0.9)',
            padding: { x: 14, y: 8 }
          }).setOrigin(0.5);
          this.tweens.add({ targets: toast, y: this.cameras.main.midPoint.y - 170, alpha: 0, duration: 3500, onComplete: () => toast.destroy() });
        }

        // Check if Lord General has entered Holy Church zone -> Triggers Church Corruption!
        if (this.lordGeneral && this.lordGeneral.active) {
          const bgc = Math.floor(this.lordGeneral.x / this.tileSize);
          const bgr = Math.floor(this.lordGeneral.y / this.tileSize);
          const inChurch = (bgc >= 5 && bgc <= 24 && bgr >= 35 && bgr <= 55);

          if (inChurch && !this.isChurchCorrupted) {
            this.isChurchCorrupted = true;
            sound.setBGMTempo(2.4); // Accelerate to hyper-fast intense percussive horror beats!

            const toast = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 140, '⚠️ WARNING: LORD GENERAL HAS CORRUPTED THE HOLY CHURCH!\nSAINT SPAWNING HIGH KNIGHT PAIRS EVERY 3s!', {
              fontFamily: 'Orbitron, sans-serif',
              fontSize: '15px',
              color: '#ff0055',
              fontStyle: 'bold',
              align: 'center',
              backgroundColor: 'rgba(25, 5, 10, 0.9)',
              padding: { x: 14, y: 8 }
            }).setOrigin(0.5);
            this.tweens.add({ targets: toast, y: this.cameras.main.midPoint.y - 170, alpha: 0, duration: 4000, onComplete: () => toast.destroy() });
          }
        }

        // 1. Saint Power: Normal Undead spawning OR Corrupted High Knight Pairs Spawning
        if (this.isChurchCorrupted) {
          if (this.timeElapsed % 3 === 0) {
            this.spawnSaintCorruptedPair();
          }
        } else {
          if (this.timeElapsed % Math.max(3, 6 - Math.floor(this.timeElapsed / 25)) === 0) {
            this.spawnSaintUndead();
          }
        }

        // 2. Lord General Strategic Tactical Spawner: Spawns 1 or 2 High Knights at ambush positions
        const spawnInterval = Math.max(6, 10 - Math.floor(this.timeElapsed / 20));
        if (this.timeElapsed % spawnInterval === 0 && this.lordGeneral && this.lordGeneral.active) {
          const isAdvanced = this.timeElapsed >= 30;
          const spawnCount = isAdvanced ? 2 : 1;

          for (let i = 0; i < spawnCount; i++) {
            // Strategic ambush coordinates relative to Hunter
            const ambushOffsetX = (Math.random() > 0.5 ? 1 : -1) * (140 + i * 40);
            const ambushOffsetY = (Math.random() > 0.5 ? 1 : -1) * (140 + i * 40);
            this.spawnHighKnight(
              Phaser.Math.Clamp(this.player.x + ambushOffsetX, 4 * this.tileSize, 75 * this.tileSize),
              Phaser.Math.Clamp(this.player.y + ambushOffsetY, 4 * this.tileSize, 55 * this.tileSize),
              true
            );
          }

          const msg = isAdvanced ? '[GROQ AI DEMON LORD: STRATEGIC FLANKING AMBUSH!]' : '[LORD GENERAL: REINFORCEMENT SPAWNED!]';
          const pop = this.add.text(this.lordGeneral.x, this.lordGeneral.y - 45, msg, {
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '11px',
            color: '#ff0055',
            fontStyle: 'bold'
          }).setOrigin(0.5);
          this.tweens.add({ targets: pop, y: this.lordGeneral.y - 70, alpha: 0, duration: 1600, onComplete: () => pop.destroy() });
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
    // 1. Spawn Saint ⚪ in Holy Church
    const saintX = 14 * this.tileSize;
    const saintY = 45 * this.tileSize;

    this.saint = this.add.container(saintX, saintY);
    const saintGlow = this.add.circle(0, 0, 22, 0xffffff, 0.4);
    const saintCore = this.add.circle(0, 0, 12, 0xffffff, 0.95);
    saintCore.setStrokeStyle(2, 0x00f0ff, 0.9);
    const saintLabel = this.add.text(0, -28, 'SAINT', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.saint.add([saintGlow, saintCore, saintLabel]);
    this.physics.add.existing(this.saint);
    this.saint.body.setCircle(14, -14, -14);

    this.tweens.add({
      targets: saintGlow,
      scale: 1.3,
      yoyo: true,
      repeat: -1,
      duration: 1000
    });

    // 2. Initial Undead List 🔴
    const undeadSpawns = [
      { c: 30, r: 25 }, { c: 32, r: 25 }, { c: 34, r: 25 }, // Pair/Railway 1
      { c: 50, r: 25 }, { c: 52, r: 25 }, // Pair/Railway 2
      { c: 35, r: 35 }, { c: 37, r: 35 }  // Pair/Railway 3
    ];

    undeadSpawns.forEach(sp => this.spawnSingleUndead(sp.c * this.tileSize, sp.r * this.tileSize));

    // 3. Spawn High Knights 🟢
    // Holy Church Guards (5), Yellow Lair (2), Lord General Boss Chamber Guards (3)
    const knightSpawns = [
      { c: 12, r: 12 }, { c: 18, r: 18 }, // Yellow Lair
      { c: 8, r: 38 }, { c: 20, r: 38 }, { c: 8, r: 52 }, { c: 20, r: 52 }, { c: 14, r: 40 }, // Holy Church Guards (5)
      // LORD GENERAL 3 GUARDS: 2 Adjacent to Boss, 1 at Dark Void Chamber Door
      { c: 63, r: 45, isBossGuard: true }, { c: 67, r: 45, isBossGuard: true }, // 2 Adjacent to Lord General
      { c: 56, r: 45, isBossGuard: true } // 1 Guarding Chamber Door
    ];
    this.initialKnightSpawns = knightSpawns.map(sp => ({ x: sp.c * this.tileSize, y: sp.r * this.tileSize, isBossGuard: sp.isBossGuard }));
    knightSpawns.forEach(sp => this.spawnHighKnight(sp.c * this.tileSize, sp.r * this.tileSize, sp.isBossGuard));

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

  spawnSingleUndead(x, y) {
    const u = this.add.container(x, y);
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
    u.roamAngle = Math.random() * Math.PI * 2;
    this.undeadList.push(u);

    this.physics.add.overlap(this.player, u, () => this.handleHunterUndeadContact(u));
  }

  spawnSaintUndead() {
    if (!this.saint || !this.isMatchActive) return;
    const spawnX = this.saint.x + (Math.random() - 0.5) * 80;
    const spawnY = this.saint.y + (Math.random() - 0.5) * 80;

    this.spawnSingleUndead(spawnX, spawnY);

    // 15% Chance for Saint to spawn a High Knight guard in Holy Church
    if (Math.random() < 0.15) {
      this.spawnHighKnight(spawnX + 20, spawnY + 20, false);
      const pop = this.add.text(this.saint.x, this.saint.y - 45, '[SAINT POWER: HIGH KNIGHT BORN!]', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '11px',
        color: '#00ff88',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: this.saint.y - 70, alpha: 0, duration: 1500, onComplete: () => pop.destroy() });
    } else {
      const pop = this.add.text(this.saint.x, this.saint.y - 40, '[SAINT POWER: UNDEAD SPAWNED!]', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '10px',
        color: '#ff0055'
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: this.saint.y - 65, alpha: 0, duration: 1200, onComplete: () => pop.destroy() });
    }
  }

  spawnSaintCorruptedPair() {
    if (!this.saint || !this.isMatchActive) return;
    const spawnX1 = this.saint.x + (Math.random() - 0.5) * 60;
    const spawnY1 = this.saint.y + (Math.random() - 0.5) * 60;
    const spawnX2 = this.saint.x + (Math.random() - 0.5) * 60;
    const spawnY2 = this.saint.y + (Math.random() - 0.5) * 60;

    this.spawnHighKnight(spawnX1, spawnY1, false);
    this.spawnHighKnight(spawnX2, spawnY2, false);

    const pop = this.add.text(this.saint.x, this.saint.y - 45, '[CORRUPTED SAINT: HIGH KNIGHT PAIR BORN!]', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      color: '#ff0055',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: this.saint.y - 75, alpha: 0, duration: 1500, onComplete: () => pop.destroy() });
  }

  spawnHighKnight(x, y, isBossGuard = false) {
    const hk = this.add.container(x, y);
    const aura = this.add.circle(0, 0, 16, isBossGuard ? 0xff0055 : 0x00ff88, 0.35);
    const core = this.add.circle(0, 0, 10, isBossGuard ? 0xa855f7 : 0x00ff88, 0.95);
    core.setStrokeStyle(2, 0xffffff, 0.9);
    hk.add([aura, core]);

    this.physics.add.existing(hk);
    hk.body.setCircle(14, -14, -14);
    this.physics.add.collider(hk, this.walls);

    hk.moveTimer = 0;
    hk.isBossGuard = isBossGuard;
    this.highKnights.push(hk);

    // Overlap with Hunter -> Drains HP
    this.physics.add.overlap(this.player, hk, () => this.handleKnightHunterContact(hk));
  }

  update(time, delta) {
    if (!this.isMatchActive || !this.player) return;

    // 1. Player Movement (Keyboard WASD / Arrows + Touch D-Pad)
    const speed = 220;
    const body = this.player.body;
    body.setVelocity(0);

    let moveX = 0;
    let moveY = 0;

    if ((this.cursors && this.cursors.left.isDown) || (this.keys && this.keys.A.isDown) || this.dpadLeft) moveX = -speed;
    else if ((this.cursors && this.cursors.right.isDown) || (this.keys && this.keys.D.isDown) || this.dpadRight) moveX = speed;

    if ((this.cursors && this.cursors.up.isDown) || (this.keys && this.keys.W.isDown) || this.dpadUp) moveY = -speed;
    else if ((this.cursors && this.cursors.down.isDown) || (this.keys && this.keys.S.isDown) || this.dpadDown) moveY = speed;

    // Handle Tap-To-Move / Pointer Click Destination
    if (moveX !== 0 || moveY !== 0) {
      this.targetMovePoint = null;
    } else if (this.targetMovePoint) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.targetMovePoint.x, this.targetMovePoint.y);
      if (dist < 12) {
        this.targetMovePoint = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.targetMovePoint.x, this.targetMovePoint.y);
        moveX = Math.cos(angle) * speed;
        moveY = Math.sin(angle) * speed;
      }
    }

    body.setVelocity(moveX, moveY);
    body.velocity.normalize().scale(speed);

    // 2. Zone Detection & Animated Toast Banner
    const pc = Math.floor(this.player.x / this.tileSize);
    const pr = Math.floor(this.player.y / this.tileSize);
    const currentZone = this.zones.find(z => pc >= z.minC && pc <= z.maxC && pr >= z.minR && pr <= z.maxR);
    if (currentZone && currentZone.name !== this.currentZoneName) {
      this.currentZoneName = currentZone.name;

      const toast = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y - 120, `ENTERING ZONE: ${currentZone.name}`, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '16px',
        color: '#00f0ff',
        fontStyle: 'bold',
        backgroundColor: 'rgba(11, 15, 25, 0.8)',
        padding: { x: 12, y: 6 }
      }).setOrigin(0.5);

      this.tweens.add({ targets: toast, y: this.cameras.main.midPoint.y - 150, alpha: 0, duration: 1800, onComplete: () => toast.destroy() });
    }

    // 3. AI Specter Evasion & Railway Formation Movement
    const activeUndead = this.undeadList.filter(u => !u.isCaptured && u.active);
    activeUndead.forEach((u, index) => {
      if (u.isStunned) {
        u.body.setVelocity(0);
        return;
      }
      u.moveTimer += delta;
      if (u.moveTimer > 180) {
        u.moveTimer = 0;
        const distToPlayer = Phaser.Math.Distance.Between(u.x, u.y, this.player.x, this.player.y);

        // When Hunter comes into view / camera range (<280px): SCATTER AND RUN FOR THEIR LIVES!
        if (distToPlayer < 280 && !this.isCamoActive) {
          const runAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, u.x, u.y);
          // Scatter with slight random variation
          const scatterAngle = runAngle + (Math.random() - 0.5) * 0.6;
          u.body.setVelocity(Math.cos(scatterAngle) * 185, Math.sin(scatterAngle) * 185);
        } else {
          // Railway Formation: Move in pairs/groups of 2-3 following leader in line
          if (index % 3 !== 0 && activeUndead[index - 1]) {
            const leader = activeUndead[index - 1];
            const leaderDist = Phaser.Math.Distance.Between(u.x, u.y, leader.x, leader.y);
            if (leaderDist > 25) {
              const followAngle = Phaser.Math.Angle.Between(u.x, u.y, leader.x, leader.y);
              u.body.setVelocity(Math.cos(followAngle) * 110, Math.sin(followAngle) * 110);
            } else {
              u.body.setVelocity(0);
            }
          } else {
            // Leader Undead roams freely
            if (Math.random() < 0.1) u.roamAngle = Math.random() * Math.PI * 2;
            u.body.setVelocity(Math.cos(u.roamAngle) * 90, Math.sin(u.roamAngle) * 90);
          }
        }
      }
    });

    // 4. High Knights AI Chase
    this.highKnights.forEach(hk => {
      if (!hk.active) return;
      hk.moveTimer += delta;
      if (hk.moveTimer > 150) {
        hk.moveTimer = 0;
        const dist = Phaser.Math.Distance.Between(hk.x, hk.y, this.player.x, this.player.y);
        if (dist < 340 && !this.isCamoActive) {
          const angle = Phaser.Math.Angle.Between(hk.x, hk.y, this.player.x, this.player.y);
          hk.body.setVelocity(Math.cos(angle) * (hk.isBossGuard ? 175 : 155), Math.sin(angle) * (hk.isBossGuard ? 175 : 155));
        } else {
          hk.body.setVelocity(0);
        }
      }
    });

    // 4.5. Lord General Tactical AI: Long-Range Hero Detection & Dynamic Map Roaming
    if (this.lordGeneral && this.lordGeneral.active) {
      const distToHero = Phaser.Math.Distance.Between(this.lordGeneral.x, this.lordGeneral.y, this.player.x, this.player.y);
      const churchX = 14 * this.tileSize;
      const churchY = 45 * this.tileSize;
      const distToChurch = Phaser.Math.Distance.Between(this.lordGeneral.x, this.lordGeneral.y, churchX, churchY);
      let bossSpeed = Math.min(265, 215 + Math.floor(this.timeElapsed / 10) * 5);

      // If pressured by Hunter attacks OR 2-minute mark hit, boss marches directly to Holy Church to corrupt the Saint!
      if ((this.isBossPressuredToChurch || this.timeElapsed >= 120) && !this.isChurchCorrupted) {
        bossSpeed = 275;
        if (distToChurch > 35) {
          const moveAngle = Phaser.Math.Angle.Between(this.lordGeneral.x, this.lordGeneral.y, churchX, churchY);
          this.lordGeneral.body.setVelocity(Math.cos(moveAngle) * bossSpeed, Math.sin(moveAngle) * bossSpeed);
        } else {
          this.lordGeneral.body.setVelocity(0);
        }
      } else if (distToHero < 600 && !this.isCamoActive) {
        // Detects Hero from afar! If Hero gets close (<320px), flees tactically away
        if (distToHero < 320) {
          const runAngle = Phaser.Math.Angle.Between(this.player.x, this.lordGeneral.x, this.player.y, this.lordGeneral.y);
          this.lordGeneral.body.setVelocity(Math.cos(runAngle) * bossSpeed, Math.sin(runAngle) * bossSpeed);
        } else {
          // Tactical positioning: Flanks toward open zone or Holy Church
          const angleToChurch = Phaser.Math.Angle.Between(this.lordGeneral.x, this.lordGeneral.y, churchX, churchY);
          this.lordGeneral.body.setVelocity(Math.cos(angleToChurch) * (bossSpeed * 0.8), Math.sin(angleToChurch) * (bossSpeed * 0.8));
        }
      } else {
        // Long-range roaming: Lord General moves toward Holy Church
        if (distToChurch > 40) {
          const moveAngle = Phaser.Math.Angle.Between(this.lordGeneral.x, this.lordGeneral.y, churchX, churchY);
          this.lordGeneral.body.setVelocity(Math.cos(moveAngle) * 145, Math.sin(moveAngle) * 145);
        } else {
          this.lordGeneral.body.setVelocity(0);
        }
      }
    }

    // 5. Check Trap Collisions
    this.traps.forEach(trap => {
      if (!trap.active) return;
      this.undeadList.forEach(u => {
        if (!u.isCaptured && !u.isStunned) {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, u.x, u.y) < 28) {
            this.triggerTrap(trap, u);
          }
        }
      });
      if (this.lordGeneral && this.lordGeneral.active) {
        if (Phaser.Math.Distance.Between(trap.x, trap.y, this.lordGeneral.x, this.lordGeneral.y) < 32) {
          this.triggerBossTrap(trap);
        }
      }
    });

    // 6. Update Mini-Map Radar Canvas
    this.updateMiniMap();

    // 5. Check Trap Collisions
    this.traps.forEach(trap => {
      if (!trap.active) return;
      this.undeadList.forEach(u => {
        if (!u.isCaptured && !u.isStunned) {
          if (Phaser.Math.Distance.Between(trap.x, trap.y, u.x, u.y) < 28) {
            this.triggerTrap(trap, u);
          }
        }
      });
      if (this.lordGeneral && this.lordGeneral.active) {
        if (Phaser.Math.Distance.Between(trap.x, trap.y, this.lordGeneral.x, this.lordGeneral.y) < 32) {
          this.triggerBossTrap(trap);
        }
      }
    });

    // 6. Update HUD Callback
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

  deployCurrentTrap() {
    if (!this.isMatchActive || !this.player) return;

    sound.playTrapDeploy();
    const trap = this.add.container(this.player.x, this.player.y);
    const ring = this.add.circle(0, 0, 18, 0xffb800, 0.2);
    ring.setStrokeStyle(2, 0xffb800, 0.9);
    const innerDot = this.add.circle(0, 0, 6, 0xffb800, 1);

    trap.add([ring, innerDot]);
    trap.active = true;
    this.traps.push(trap);
    this.trapsSprungCount += 1;

    const pop = this.add.text(this.player.x, this.player.y - 20, 'TRAP ARMED!', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '11px',
      color: '#ffb800'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: this.player.y - 35, alpha: 0, duration: 600, onComplete: () => pop.destroy() });
  }

  triggerTrap(trap, undead) {
    if (!trap || !trap.active) return;
    trap.active = false;
    trap.destroy();
    sound.playTrapDeploy();

    undead.isStunned = true;
    this.multiplier += 1;

    const pop = this.add.text(undead.x, undead.y - 20, 'UNDEAD STUNNED!', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '13px',
      color: '#ffb800',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: undead.y - 45, alpha: 0, duration: 900, onComplete: () => pop.destroy() });

    this.tweens.add({
      targets: undead,
      alpha: 0.3,
      yoyo: true,
      repeat: 6,
      duration: 150,
      onComplete: () => {
        if (!undead.isCaptured && undead.active) {
          undead.isStunned = false;
          undead.alpha = 1;
        }
      }
    });
  }

  handleHunterUndeadContact(undead) {
    if (!undead || undead.isCaptured) return;
    if (undead.isStunned || this.isShieldActive) {
      undead.isCaptured = true;
      const pts = 250 * this.multiplier;
      this.score += pts;

      // Hunter gains +15 Life Force HP when killing/capturing an Undead!
      this.heroHp = Math.min(this.maxHeroHp || 100, (this.heroHp || 100) + 15);

      const pop = this.add.text(undead.x, undead.y - 20, `+15 HP & +${pts} XP!`, {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '15px',
        color: '#00ff88',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.tweens.add({ targets: pop, y: undead.y - 50, alpha: 0, duration: 1000, onComplete: () => pop.destroy() });

      undead.destroy();
      sound.playCaptureTriumph();
    }
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

      this.isBossPressuredToChurch = true;

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

    // Pressure reaction: Boss panics and rushes to corrupt the Saint faster!
    this.isBossPressuredToChurch = true;

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

  updateMiniMap() {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const mapW = this.worldWidthTiles * this.tileSize; // 3200
    const mapH = this.worldHeightTiles * this.tileSize; // 2400

    ctx.clearRect(0, 0, w, h);

    // Draw background radar grid
    ctx.fillStyle = '#070a11';
    ctx.fillRect(0, 0, w, h);

    // Draw Holy Church Zone (MinC 5..24, MinR 35..55)
    ctx.strokeStyle = this.isChurchCorrupted ? 'rgba(255, 0, 85, 0.7)' : 'rgba(255, 255, 255, 0.4)';
    ctx.strokeRect((5 * 40 / mapW) * w, (35 * 40 / mapH) * h, (19 * 40 / mapW) * w, (20 * 40 / mapH) * h);

    // Draw Dark Void Zone (MinC 56..75, MinR 35..55)
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.strokeRect((56 * 40 / mapW) * w, (35 * 40 / mapH) * h, (19 * 40 / mapW) * w, (20 * 40 / mapH) * h);

    // Draw Undead specters (Red dots)
    ctx.fillStyle = '#ff0055';
    this.undeadList.forEach(u => {
      if (u.active && !u.isCaptured) {
        ctx.beginPath();
        ctx.arc((u.x / mapW) * w, (u.y / mapH) * h, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw High Knights (Green dots)
    ctx.fillStyle = '#00ff88';
    this.highKnights.forEach(hk => {
      if (hk.active) {
        ctx.beginPath();
        ctx.arc((hk.x / mapW) * w, (hk.y / mapH) * h, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Saint (White glowing dot)
    if (this.saint && this.saint.active) {
      ctx.fillStyle = this.isChurchCorrupted ? '#ff0055' : '#ffffff';
      ctx.beginPath();
      ctx.arc((this.saint.x / mapW) * w, (this.saint.y / mapH) * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Lord General (Purple dot)
    if (this.lordGeneral && this.lordGeneral.active) {
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc((this.lordGeneral.x / mapW) * w, (this.lordGeneral.y / mapH) * h, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Hunter (Player - Cyan dot)
    if (this.player && this.player.active) {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc((this.player.x / mapW) * w, (this.player.y / mapH) * h, 3.5, 0, Math.PI * 2);
      ctx.fill();
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

    // Destroys 1 High Knight & up to 2 Undead within 400px wave range!
    let destroyedKnights = 0;
    let destroyedUndead = 0;

    const nearbyKnights = this.highKnights.filter(hk => hk.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, hk.x, hk.y) <= 400);
    if (nearbyKnights.length > 0) {
      const targetK = nearbyKnights[0];
      targetK.active = false;
      targetK.destroy();
      destroyedKnights = 1;
    }

    const nearbyUndead = this.undeadList.filter(u => u.active && !u.isCaptured && Phaser.Math.Distance.Between(this.player.x, this.player.y, u.x, u.y) <= 400);
    const toDestroyU = nearbyUndead.slice(0, 2);
    toDestroyU.forEach(u => {
      u.isCaptured = true;
      u.active = false;
      u.destroy();
      destroyedUndead++;
    });

    const popText = `[SONAR BLAST: ${destroyedKnights} KNIGHT & ${destroyedUndead} UNDEAD DESTROYED!]`;
    const pop = this.add.text(this.player.x, this.player.y - 45, popText, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '12px',
      color: '#00f0ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.tweens.add({ targets: pop, y: this.player.y - 80, alpha: 0, duration: 1600, onComplete: () => pop.destroy() });

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
