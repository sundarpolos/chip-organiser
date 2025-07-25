

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
  isBanker: boolean;
  buyIns: BuyIn[];
  finalChips: number;
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
  isBanker: boolean;
  isActive?: boolean;
}

export interface MasterVenue {
    id: string;
    name: string;
}

export interface GameHistory {
    id: string;
    venue: string;
    timestamp: string;
    players: CalculatedPlayer[];
    startTime?: string;
    endTime?: string;
    duration?: number; // in milliseconds
}

export interface WhatsappConfig {
  apiUrl: string;
  apiToken: string;
  senderMobile: string;
}
