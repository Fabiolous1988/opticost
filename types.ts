
export enum ServiceType {
  FULL_INSTALLATION = 'FULL_INSTALLATION',
  ASSISTANCE_1_TECH = 'ASSISTANCE_1_TECH',
  ASSISTANCE_2_TECH = 'ASSISTANCE_2_TECH',
}

export enum TransportType {
  VAN = 'VAN', // Nostro mezzo
  TRUCK = 'TRUCK', // Bilico
  CRANE_TRUCK = 'CRANE_TRUCK', // Gru
}

export enum ZavorraType {
  NONE = 'NONE',
  CEMENTO_16 = 'CEMENTO_16',
  TWIN_DRIVE_24 = 'TWIN_DRIVE_24',
}

export interface GlobalSettings {
  // Trasferta
  soglia_distanza_trasferta_km: number;
  diaria_squadra_interna: number;
  soglia_minima_ore_lavoro_utili: number;
  
  // Capacità
  ore_lavoro_giornaliere_standard: number;
  
  // Mezzo Aziendale
  km_per_litro_furgone: number;
  costo_medio_gasolio_euro_litro: number;
  costo_usura_mezzo_euro_km: number;
  
  // Manodopera
  costo_orario_tecnico_interno: number;
  costo_orario_squadra_esterna: number;
  diaria_squadra_esterna: number;
  
  // Margini
  margine_percentuale_installazione: number;
  
  // Noleggi
  costo_base_muletto: number;

  // Ottimizzazione
  sconto_quantita_percentuale: number; // Default 5% for > 50 spots
}

export interface PergolaModel {
  id: string;
  name: string;
  hours_structure_per_spot: number;
  hours_pv_per_spot: number;
  hours_led_per_spot: number;
  weight_structure_per_spot_kg: number;
  requires_lifting: boolean;
}

export interface InputState {
  serviceType: ServiceType;
  destinationProvince: string;
  distanceKm: number; // Manual override or calculated
  
  // Installation Specifics
  modelId: string;
  spots: number;
  techsInternal: number;
  techsExternal: number;
  zavorraType: ZavorraType;
  
  // Options
  hasLed: boolean;
  hasPv: boolean;
  hasCoibentati: boolean;
  
  // Assistance Specifics
  assistanceDays: number;
}

export interface ProvinceData {
  code: string;
  region: string;
  truckCost: number; // Bilico
  craneCost: number; // Gru (include vitto/alloggio autista)
}

export interface DynamicData {
  provinces: Record<string, ProvinceData>;
  models: PergolaModel[]; // Fetched from CSV
  settingsOverrides: Partial<GlobalSettings>;
  lastUpdated: Date;
}

export interface CalculationResult {
  totalHours: number;
  totalDays: number;
  totalWeightKg: number;
  transportMode: TransportType;
  
  costManodopera: number;
  costTrasferta: number; // Diaria + Hotel
  costTravel: number; // Fuel + Tolls + Vehicle Wear
  costMachinery: number; // Muletto
  costTransportThirdParty: number; // If using external truck
  
  totalCost: number;
  suggestedPrice: number;
  marginAmount: number;
  
  details: {
    isTrasferta: boolean;
    nightsInHotel: number;
    numberOfVehicles: number; // e.g. 2 bilici
    discountApplied: number; // %
    vehicleReason: string; // Explanation for vehicle choice
  }
}
