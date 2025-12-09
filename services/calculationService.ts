
import { CalculationResult, GlobalSettings, InputState, PergolaModel, ProvinceData, ServiceType, TransportType, ZavorraType } from '../types';
import { DEFAULT_MODELS, ZAVORRA_WEIGHTS } from '../constants';

export const calculateQuote = (
  input: InputState, 
  settings: GlobalSettings,
  provinceData: ProvinceData | null,
  models: PergolaModel[]
): CalculationResult => {
  
  // Use models passed from Dynamic Data, fallback to Default if empty
  const availableModels = (models && models.length > 0) ? models : DEFAULT_MODELS;
  const model = availableModels.find(m => m.id === input.modelId) || availableModels[0];
  
  let totalHours = 0;
  let totalWeightKg = 0;
  let costManodopera = 0;
  let costTrasferta = 0;
  let costTravel = 0;
  let costMachinery = 0;
  let costTransportThirdParty = 0;
  let transportMode = TransportType.VAN;
  let details = {
    isTrasferta: false,
    nightsInHotel: 0,
    numberOfVehicles: 1,
    discountApplied: 0,
    vehicleReason: ''
  };

  // --- 1. Installation Logic ---
  if (input.serviceType === ServiceType.FULL_INSTALLATION) {
    // Hours Calculation
    let hoursPerSpot = model.hours_structure_per_spot;
    if (input.hasPv) hoursPerSpot += model.hours_pv_per_spot;
    if (input.hasLed) hoursPerSpot += model.hours_led_per_spot;
    
    totalHours = hoursPerSpot * input.spots;

    // Optimization Discount (Logic from CSV/Specs: > 50 spots = Discount on hours)
    if (input.spots > 50) {
      details.discountApplied = settings.sconto_quantita_percentuale;
      totalHours = totalHours * (1 - (settings.sconto_quantita_percentuale / 100));
    }

    // Weight Calculation
    const structureWeight = model.weight_structure_per_spot_kg * input.spots;
    
    // Ballast Weights
    // Weights are defined in constants (1600kg or 2400kg per spot)
    const ballastWeightPerSpot = ZAVORRA_WEIGHTS[input.zavorraType];
    const totalBallastWeight = ballastWeightPerSpot * input.spots;
    
    totalWeightKg = structureWeight + totalBallastWeight;

    // Machinery
    if (model.requires_lifting) {
       // Base + Delivery + Pickup
       costMachinery = settings.costo_base_muletto + 100 + 100;
    }

  } else {
    // Assistance
    const hoursPerDay = 8;
    totalHours = input.assistanceDays * hoursPerDay;
    totalWeightKg = 100; // Tools only
  }

  // --- 2. Days & Team Logic ---
  const totalTechs = input.techsInternal + input.techsExternal;
  const effectiveTechs = Math.max(1, totalTechs);
  const dailyTeamHours = effectiveTechs * settings.ore_lavoro_giornaliere_standard;
  
  const totalDaysRaw = totalHours / dailyTeamHours;
  const totalDays = Math.ceil(totalDaysRaw);

  if (model.requires_lifting && input.serviceType === ServiceType.FULL_INSTALLATION) {
     if (totalDays > 10) {
       costMachinery += (totalDays - 10) * 100;
     }
  }

  // Manodopera Cost
  // Logic: Internal techs cost + External techs cost
  const internalCost = (totalHours / effectiveTechs) * input.techsInternal * settings.costo_orario_tecnico_interno;
  const externalCost = (totalHours / effectiveTechs) * input.techsExternal * settings.costo_orario_squadra_esterna;
  costManodopera = internalCost + externalCost;


  // --- 3. Logistics & Travel ---
  const distance = input.distanceKm;
  details.isTrasferta = distance > settings.soglia_distanza_trasferta_km;
  
  // Internal Fleet Travel Cost (Furgone)
  // A/R calc
  const tripKm = distance * 2;
  const fuelCostPerKm = settings.costo_medio_gasolio_euro_litro / settings.km_per_litro_furgone;
  const totalCostPerKm = fuelCostPerKm + settings.costo_usura_mezzo_euro_km;
  
  if (details.isTrasferta) {
    // Round trip at start and end of week (assuming 5 day work week)
    const numberOfTrips = Math.ceil(totalDays / 5);
    costTravel = (tripKm * numberOfTrips * totalCostPerKm);
    
    // Local travel (Hotel <-> Site)
    const localTravelKm = 30 * totalDays;
    costTravel += (localTravelKm * totalCostPerKm);

    // Diaria & Hotel
    details.nightsInHotel = totalDays * numberOfTrips; // Approximation based on days
    
    const dailyDiariaInternal = settings.diaria_squadra_interna;
    const dailyDiariaExternal = settings.diaria_squadra_esterna;
    
    const totalDiariaInternal = dailyDiariaInternal * input.techsInternal * totalDays;
    const totalDiariaExternal = dailyDiariaExternal * input.techsExternal * totalDays;
    
    const hotelCostPerPerson = 80; // Estimated
    const totalHotel = hotelCostPerPerson * totalTechs * details.nightsInHotel;

    costTrasferta = totalDiariaInternal + totalDiariaExternal + totalHotel;

  } else {
    // Daily commuting
    costTravel = (tripKm * totalDays * totalCostPerKm);
  }

  // --- 4. Transport Logic (Material) ---
  if (input.serviceType === ServiceType.FULL_INSTALLATION) {
    // Dynamic Province Cost
    const truckCost = provinceData ? provinceData.truckCost : 1000; // Default fallback
    const craneCost = provinceData ? provinceData.craneCost : 1400; // Default fallback

    // --- LOGIC: CHOICE OF VEHICLE ---
    
    // Rule 1: Van (Nostro Mezzo)
    // < 1000kg AND low volume (approx < 3 spots) AND no heavy ballast
    if (totalWeightKg < 1000 && input.spots <= 3 && input.zavorraType === ZavorraType.NONE) {
      transportMode = TransportType.VAN;
      details.vehicleReason = 'Peso < 1000kg e poco volume';
    } else {
      // Calculate requirements for Trucks
      
      const MAX_WEIGHT_TRUCK = 24000;
      const MAX_WEIGHT_CRANE = 16000;
      
      // Volume Logic (Spots capacity)
      // Standard capacity: ~24-30 spots.
      // Coibentati capacity: ~12 spots.
      const maxSpotsPerTruck = input.hasCoibentati ? 12 : 24;
      
      const vehiclesNeededByWeight = Math.ceil(totalWeightKg / MAX_WEIGHT_TRUCK);
      const vehiclesNeededByVolume = Math.ceil(input.spots / maxSpotsPerTruck);
      
      const numTrucks = Math.max(vehiclesNeededByWeight, vehiclesNeededByVolume);
      details.numberOfVehicles = numTrucks;

      // Decide Type: Crane vs Standard Truck
      // Crane is preferred if:
      // 1. Fits in 1 vehicle (Crane limit is lower: 16000kg)
      // 2. Helps with offloading (requires_lifting)
      // 3. BUT must respect weight limits of Crane
      
      const fitsInOneCrane = (totalWeightKg <= MAX_WEIGHT_CRANE) && (input.spots <= maxSpotsPerTruck);
      
      if (fitsInOneCrane && model.requires_lifting) {
         transportMode = TransportType.CRANE_TRUCK;
         costTransportThirdParty = craneCost;
         details.vehicleReason = 'Convenienza scarico (Gru) e limiti rispettati';
      } else {
         transportMode = TransportType.TRUCK;
         costTransportThirdParty = truckCost * numTrucks;
         details.vehicleReason = `Necessari ${numTrucks} Bilici (Vincolo: ${vehiclesNeededByWeight > vehiclesNeededByVolume ? 'Peso' : 'Volume/Coibentati'})`;
      }
    }
  }

  // --- 5. Totals ---
  const totalCost = costManodopera + costTrasferta + costTravel + costMachinery + costTransportThirdParty;
  const margin = settings.margine_percentuale_installazione / 100;
  // Cost Plus Pricing
  const suggestedPrice = totalCost * (1 + margin);

  return {
    totalHours,
    totalDays,
    totalWeightKg,
    transportMode,
    costManodopera,
    costTrasferta,
    costTravel,
    costMachinery,
    costTransportThirdParty,
    totalCost,
    suggestedPrice,
    marginAmount: suggestedPrice - totalCost,
    details
  };
};
