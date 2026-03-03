

export interface BuyIn {
  id: string;
  amount: number;
  timestamp: string;
  status: 'requested' | 'approved' | 'verified';
}

export interface Player {
  id: string;
  name: string;
  whatsappNumber: string;
  buyIns: BuyIn[];
  finalChips: number;
  clubId: string;
}

export interface CalculatedPlayer extends Player {
  totalBuyIns: number;
  profitLoss: number;
}

export interface MasterPlayer {
  id: string;
  name: string;
  whatsappNumber: string;
  isAdmin: boolean;
  isBanker?: boolean;
  isActive?: boolean;
  clubId: string;
}

export interface MasterVenue {
    id: string;
    name: string;
    clubId: string;
}

export interface PlayerProgress {
    playerId: string;
    name: string;
    totalBuyIns: number;
    finalChips: number;
    profitLoss: number;
}

export interface GameProgressLog {
    timestamp: string;
    playerStats: PlayerProgress[];
}

export interface GameExpense {
    name: string;
    amount: number;
}

export interface GameHistory {
    id:string;
    venue: string;
    timestamp: string;
    players: Player[];
    startTime?: string;
    endTime?: string;
    duration?: number; // in milliseconds
    clubId: string;
    progressLog?: GameProgressLog[];
    playerEntryFee?: number;
    paidPlayerIds?: string[];
    expenses?: GameExpense[];
}

export interface WhatsappConfig {
  apiUrl: string;
  apiToken: string;
  senderMobile: string;
  whatsappGroupId?: string;
}

export interface Club {
  id: string;
  name: string;
  ownerId: string;
  whatsappConfig?: WhatsappConfig;
  deckChangeIntervalHours?: number;
}

export interface ScheduledGame {
  id: string;
  clubId: string;
  gameDate: string; // YYYY-MM-DD
  gameStartTime: string; // HH:mm
  totalSeats: number;
  createdAt: string;
}

export interface SeatBooking {
  id: string;
  scheduledGameId: string;
  clubId: string;
  playerId: string;
  playerName: string;
  playerWhatsappNumber: string;
  status: 'pending_otp' | 'confirmed' | 'cancelled' | 'waiting_list';
  confirmationType: 'otp' | 'admin';
  bookedAt: string;
  otp?: string;
  otpExpiresAt?: string;
}

// Types for Online Club feature
export interface OnlineClub {
  id: string;
  name: string;
  clubId: string; // The main club it belongs to
}

export interface OnlinePlayerAccount {
  id: string; // Corresponds to MasterPlayer ID
  playerId: string;
  playerName: string;
  clubId: string;
  balance: number;
  lastUpdated: string;
}

export interface OnlineLedgerEntry {
  id: string;
  accountId: string;
  type: 'p/l' | 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  notes: string;
  runningBalance: number;
  onlineClubName?: string;
}
