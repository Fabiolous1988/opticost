
export enum ServiceType {
  FULL_INSTALLATION = 'FULL_INSTALLATION',
  ASSISTANCE_GENERIC = 'ASSISTANCE_GENERIC', // Replaces specific 1/2 tech types
}

export enum TransportType {
  VAN = 'VAN', // Nostro mezzo
  TRUCK = 'TRUCK', // Bilico
  CRANE_TRUCK = 'CRANE_TRUCK', // Gru
}

export enum AssistanceTransportMode {
  COMPANY_VEHICLE = 'COMPANY_VEHICLE', // Furgone Aziendale
  PUBLIC_TRANSPORT = 'PUBLIC_TRANSPORT', // Aereo/Treno/Taxi
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

export interface ZavorraModel {
  id: string;
  name: string;
  weight_kg: number;
}

export interface ExternalResearchData {
  foundDistanceKm: number;
  foundTollCost: number; // Pedaggio
  foundHotelCost: number; // Average price per night
  foundPublicTransportCost: number; // A/R per person
  lastSearchedAddress: string;
}

export interface InputState {
  serviceType: ServiceType;
  address: string; // Full address
  destinationProvince: string; // Extracted or manual
  distanceKm: number; 
  startDate: string; // YYYY-MM-DD
  
  // External Data Overrides (User can edit what AI found)
  customTollCost: number;
  customHotelCost: number;
  customPublicTransportCost: number;

  // Installation Specifics
  modelId: string;
  spots: number;
  
  // Tech Configuration
  useInternalTechs: boolean;
  techsInternal: number;
  useExternalTechs: boolean;
  techsExternal: number;
  
  // Options
  hasLed: boolean;
  hasPv: boolean;
  hasTelo: boolean;
  hasCoibentati: boolean;
  
  // Zavorre
  hasZavorre: boolean;
  zavorraModelId: string; // Dynamic ID from CSV
  
  // Logistics Options
  hasForkliftOnSite: boolean;

  // Assistance Specifics
  assistanceDays: number;
  assistanceTechs: number; 
  assistanceTransportMode: AssistanceTransportMode;
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
  zavorraModels: ZavorraModel[]; // Fetched from CSV
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
  costTravel: number; // Fuel + Tolls + Vehicle Wear OR Public Tickets
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
    ballastCount: number;
    ballastTotalWeight: number;
    tollsIncluded: number;
    hotelPriceUsed: number;
    driverCostIncluded: number; // For Crane/Truck driver extras
  }
}
