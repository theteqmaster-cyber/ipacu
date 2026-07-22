/* ==========================================================================
   IPACU :: LOCAL STORAGE & GAMIFICATION MANAGER
   ========================================================================== */

const STORAGE_KEY = 'ipacu_hunter_data_v1';

const DEFAULT_PROFILE = {
  highScore: 0,
  captures: 0,
  totalXp: 0,
  rankIndex: 0,
  trapsUsed: 0,
  matchesPlayed: 0,
  deathCount: 0,
  audioMuted: false,
  unlockedBadges: [],
  localScoresHistory: []
};

export const HUNTER_RANKS = [
  { title: 'ROOKIE TRACKER', minXp: 0 },
  { title: 'CYBER HUNTER', minXp: 500 },
  { title: 'SPECTER CATCHER', minXp: 1500 },
  { title: 'GRID ARCHITECT', minXp: 3500 },
  { title: 'APEX PREDATOR', minXp: 7000 }
];

export const BADGES = [
  { id: 'first_blood', name: 'First Blood', desc: 'Capture your first AI Specter', icon: 'icon-target' },
  { id: 'trap_master', name: 'Trap Master', desc: 'Spring 10 traps in a single match', icon: 'icon-trap-laser' },
  { id: 'stealth_ninja', name: 'Shadow Ghost', desc: 'Capture a specter using Active Camo', icon: 'icon-camo' },
  { id: 'untouchable', name: 'Untouchable', desc: 'Complete a match taking 0 damage', icon: 'icon-shield' },
  { id: 'apex_hunter', name: 'Apex Hunter', desc: 'Reach 3,500+ XP cumulative rank', icon: 'icon-trophy' }
];

class StorageManager {
  constructor() {
    this.profile = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return { ...DEFAULT_PROFILE };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getRank() {
    let currentRank = HUNTER_RANKS[0];
    for (let i = HUNTER_RANKS.length - 1; i >= 0; i--) {
      if (this.profile.totalXp >= HUNTER_RANKS[i].minXp) {
        currentRank = HUNTER_RANKS[i];
        break;
      }
    }
    return currentRank;
  }

  recordMatchResult({ score, timeSeconds, trapsSprung, captured, victory }) {
    this.profile.matchesPlayed += 1;
    this.profile.trapsUsed += trapsSprung;

    let xpGained = 0;
    const isWin = victory !== undefined ? victory : (captured || score > 0);

    if (isWin) {
      this.profile.captures += 3;
      xpGained = Math.max(250, Math.floor(score / 10));
      this.profile.totalXp += xpGained;

      this.checkBadge('first_blood');
      if (trapsSprung >= 2) this.checkBadge('trap_master');
      if (this.profile.totalXp >= 500) this.checkBadge('apex_hunter');
    }

    if (score > this.profile.highScore) {
      this.profile.highScore = score;
    }

    this.profile.localScoresHistory.unshift({
      score,
      timeSeconds,
      captured: isWin,
      date: new Date().toLocaleDateString()
    });
    this.profile.localScoresHistory = this.profile.localScoresHistory.slice(0, 10);

    this.save();
    return { xpGained, rank: this.getRank() };
  }

  checkBadge(badgeId) {
    if (!this.profile.unlockedBadges.includes(badgeId)) {
      this.profile.unlockedBadges.push(badgeId);
      this.save();
    }
  }

  isBadgeUnlocked(badgeId) {
    return this.profile.unlockedBadges.includes(badgeId);
  }

  recordDeath() {
    this.profile.deathCount = (this.profile.deathCount || 0) + 1;
    this.save();
    return this.profile.deathCount;
  }
}

export const storage = new StorageManager();
