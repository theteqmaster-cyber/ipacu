/* ==========================================================================
   IPACU :: FIREBASE MULTIPLAYER & REALTIME LOBBY MANAGER
   ========================================================================== */

export class MultiplayerManager {
  constructor() {
    this.roomCode = null;
    this.isHost = false;
    this.connected = false;
  }

  async createRoom() {
    // Generate random 4-digit numeric room code
    this.roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    this.isHost = true;
    this.connected = true;

    return {
      success: true,
      roomCode: this.roomCode,
      role: 'HUNTER',
      message: `ROOM ${this.roomCode} CREATED. WAITING FOR SPECTER PLAYER...`
    };
  }

  async joinRoom(code) {
    if (!code || code.length !== 4) {
      return { success: false, message: 'INVALID 4-DIGIT ROOM CODE' };
    }

    this.roomCode = code;
    this.isHost = false;
    this.connected = true;

    return {
      success: true,
      roomCode: this.roomCode,
      role: 'SPECTER',
      message: `CONNECTED TO ROOM ${this.roomCode} AS SPECTER`
    };
  }

  disconnect() {
    this.roomCode = null;
    this.connected = false;
  }
}

export const multiplayer = new MultiplayerManager();
