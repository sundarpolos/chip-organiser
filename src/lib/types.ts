





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

export interface GameHistory {
    id: string;
    venue: string;
    timestamp: string;
    players: Player[];
    startTime?: string;
    endTime?: string;
    duration?: number; // in milliseconds
    clubId: string;
}

export interface WhatsappConfig {
  apiUrl: string;
  apiToken: string;
  senderMobile: string;
}

export interface Club {
  id: string;
  name: string;
  ownerId: string;
  whatsappConfig?: WhatsappConfig;
  deckChangeIntervalHours?: number;
}
