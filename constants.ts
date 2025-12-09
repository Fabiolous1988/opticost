
import { GlobalSettings, PergolaModel, ZavorraType } from './types';

export const DEFAULT_SETTINGS: GlobalSettings = {
  soglia_distanza_trasferta_km: 150,
  diaria_squadra_interna: 50,
  soglia_minima_ore_lavoro_utili: 2,
  ore_lavoro_giornaliere_standard: 9,
  km_per_litro_furgone: 11,
  costo_medio_gasolio_euro_litro: 1.85,
  costo_usura_mezzo_euro_km: 0.037,
  costo_orario_tecnico_interno: 35.00, // Stima default
  costo_orario_squadra_esterna: 26.50,
  diaria_squadra_esterna: 70,
  margine_percentuale_installazione: 25,
  costo_base_muletto: 1000,
  sconto_quantita_percentuale: 5,
};

export const DEFAULT_MODELS: PergolaModel[] = [
  { 
    id: 'easy_park', 
    name: 'Easy Park', 
    hours_structure_per_spot: 4, 
    hours_pv_per_spot: 1.5, 
    hours_led_per_spot: 0.5, 
    weight_structure_per_spot_kg: 180,
    requires_lifting: false
  },
  { 
    id: 'infinity_park', 
    name: 'Infinity Park', 
    hours_structure_per_spot: 5.5, 
    hours_pv_per_spot: 1.5, 
    hours_led_per_spot: 0.5, 
    weight_structure_per_spot_kg: 220,
    requires_lifting: true
  },
  { 
    id: 'solar_carport_pro', 
    name: 'Solar Carport Pro', 
    hours_structure_per_spot: 6, 
    hours_pv_per_spot: 2, 
    hours_led_per_spot: 0.8, 
    weight_structure_per_spot_kg: 250,
    requires_lifting: true
  }
];

export const ZAVORRA_WEIGHTS = {
  [ZavorraType.NONE]: 0,
  // 16 Quintali = 1600 kg. Assuming this is per spot/column or per significant unit.
  // Given the context of "16 quintali o 24 quintali", we use these exact values.
  [ZavorraType.CEMENTO_16]: 1600, 
  [ZavorraType.TWIN_DRIVE_24]: 2400,
};

// Mock provinces with approximate distances from Verona (VR) and transport costs
// Used as fallback for Distance if not specified manually
export const PROVINCES: Record<string, { km: number, truckCost: number, craneCost: number }> = {
  'VR': { km: 15, truckCost: 350, craneCost: 500 },
  'MI': { km: 160, truckCost: 600, craneCost: 850 },
  'RM': { km: 520, truckCost: 1200, craneCost: 1600 },
  'BO': { km: 140, truckCost: 450, craneCost: 700 },
  'TO': { km: 300, truckCost: 800, craneCost: 1100 },
  'NA': { km: 700, truckCost: 1500, craneCost: 2000 },
  'BA': { km: 800, truckCost: 1600, craneCost: 2200 },
  'FI': { km: 230, truckCost: 650, craneCost: 900 },
};

export const STARTING_ADDRESS = "Via Disciplina 11, 37036 San Martino Bonalbergo, Verona";
