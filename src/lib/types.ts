export interface BuyIn {
  amount: number;
  timestamp: string;
  verified: boolean;
}

export interface Player {
  id: string;
  name: string;
  whatsappNumber: string;
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
