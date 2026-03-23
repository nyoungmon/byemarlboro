export type SmokeType = 'traditional' | 'electronic';
export type ActionType = 'smoke' | 'purchase';

export interface SmokeLog {
  id: string;
  type: SmokeType;
  action?: ActionType;
  timestamp: number;
  cost: number;
  tag?: string;
  count: number;
}

export interface Settings {
  traditionalCostPerPack: number;
  traditionalSticksPerPack: number;
  electronicCostPerPack: number;
  electronicSticksPerPack: number;
}
