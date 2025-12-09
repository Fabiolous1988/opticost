
import { DynamicData, GlobalSettings, PergolaModel, ProvinceData, ZavorraModel } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_MODELS } from '../constants';

const CSV_URL_TRANSPORT = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTL-4djiL6_Z8-PmHgKeJ2QmEHtZdChrJXEBIni0FyQ8Nu3dkm_6j5haSd6SElMNw/pub?output=csv';
const CSV_URL_VARIABLES = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9RtPO7RSU2bQMuQLxtF44P0IT0ccAp4NgMAmSx6u-xGBNtSb2GPrN9YbVdLA7XQ/pub?output=csv';

// Helper to parse CSV line respecting quotes
const parseLine = (line: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

// Helper to sanitize keys for matching
const sanitizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

export const fetchDynamicData = async (): Promise<DynamicData> => {
  const data: DynamicData = {
    provinces: {},
    models: [],
    zavorraModels: [],
    settingsOverrides: {},
    lastUpdated: new Date()
  };

  try {
    // 1. Fetch Transport Costs
    const transportResponse = await fetch(CSV_URL_TRANSPORT);
    const transportText = await transportResponse.text();
    const transportRows = transportText.split('\n').map(parseLine);

    // Skip header (Row 0), assume format: Provincia (Code), Regione, Costo Bilico, Costo Gru
    transportRows.forEach((row, index) => {
      if (index === 0) return; 
      if (row.length < 3) return;

      // Ensure we get 2 chars for code, clean up spaces
      const rawCode = row[0].trim().toUpperCase();
      const code = rawCode.length > 0 ? rawCode.substring(0, 2) : '';
      
      // Basic validation that it looks like a province code
      if (code.length === 2) {
        const truckCost = parseFloat(row[2]?.replace('€', '').replace('.', '').replace(',', '.') || '0');
        const craneCost = parseFloat(row[3]?.replace('€', '').replace('.', '').replace(',', '.') || '0');
        
        if (!isNaN(truckCost)) {
           data.provinces[code] = {
             code,
             region: row[1] || '',
             truckCost,
             craneCost: isNaN(craneCost) ? truckCost * 1.4 : craneCost
           };
        }
      }
    });

    // 2. Fetch Variables AND Models (Mixed Content)
    const variablesResponse = await fetch(CSV_URL_VARIABLES);
    const variablesText = await variablesResponse.text();
    const variablesRows = variablesText.split('\n').map(parseLine);

    const parsedModels: PergolaModel[] = [];
    const parsedZavorre: ZavorraModel[] = [];

    variablesRows.forEach(row => {
      if (row.length < 2) return;
      
      const originalKey = row[0];
      const key = sanitizeKey(originalKey);
      
      // Try to parse as Setting
      const valStr = row[1]?.replace('€', '').replace('%', '').replace(',', '.');
      const val = parseFloat(valStr);

      // --- Variables Logic ---
      if (!isNaN(val)) {
        if (key.includes('indennita_trasferta') || key === 'diaria_squadra_interna') {
          data.settingsOverrides.diaria_squadra_interna = val;
        }
        else if (key === 'diaria_squadra_esterna') {
          data.settingsOverrides.diaria_squadra_esterna = val;
        }
        else if (key.includes('costo') && key.includes('esterna')) {
          data.settingsOverrides.costo_orario_squadra_esterna = val;
        }
        else if (key.includes('soglia') && key.includes('distanza')) {
          data.settingsOverrides.soglia_distanza_trasferta_km = val;
        }
        else if (key.includes('furgone') && key.includes('litro')) {
          data.settingsOverrides.km_per_litro_furgone = val;
        }
        else if (key.includes('gasolio')) {
          data.settingsOverrides.costo_medio_gasolio_euro_litro = val;
        }
        else if (key.includes('usura')) {
          data.settingsOverrides.costo_usura_mezzo_euro_km = val;
        }
        else if ((key.includes('costo') && key.includes('tecnico') && !key.includes('esterna')) || key === 'costo_orario_tecnico') {
          data.settingsOverrides.costo_orario_tecnico_interno = val;
        }
        else if (key.includes('margine')) {
          data.settingsOverrides.margine_percentuale_installazione = val;
        }
        else if (key.includes('sconto') && (key.includes('50') || key.includes('ottimizzazione'))) {
          data.settingsOverrides.sconto_quantita_percentuale = val;
        }
        else if (key.includes('ore') && key.includes('standard')) {
            data.settingsOverrides.ore_lavoro_giornaliere_standard = val;
        }
      }

      // --- Zavorre Logic ---
      // Looking for keys like "zavorra_..." or names containing "zavorra" with a weight value
      if (key.includes('zavorra') && !isNaN(val)) {
        parsedZavorre.push({
            id: sanitizeKey(originalKey),
            name: originalKey,
            weight_kg: val
        });
      }

      // --- Models Logic ---
      // Heuristic: If row has > 3 cols and is not a setting and not a zavorra
      if (row.length >= 4 && !key.includes('costo') && !key.includes('diaria') && !key.includes('soglia') && !key.includes('zavorra') && !key.includes('indennita')) {
         
         const p = (idx: number) => parseFloat(row[idx]?.replace(',', '.') || '0');
         
         const v1 = p(1);
         const v2 = p(2);
         const v3 = p(3);
         const v4 = p(4);
         
         if (!isNaN(v1) && !isNaN(v2)) {
            let weight = 0;
            let hoursStruct = 0;
            let hoursPv = 0;
            let hoursLed = 0;
            let requiresLifting = false;

            // Scenario A: Name, HoursStructure, HoursPV, HoursLED, Weight, Lifting
            if (v4 > 50 || v1 < 20) {
               hoursStruct = v1;
               hoursPv = v2;
               hoursLed = v3;
               weight = v4;
               requiresLifting = (row[5]?.toLowerCase().includes('si') || row[5] === '1' || row[5]?.toLowerCase().includes('yes'));
            } 
            // Scenario B: Name, Weight, HoursStructure, HoursPV, HoursLED
            else if (v1 > 50) {
               weight = v1;
               hoursStruct = v2;
               hoursPv = v3;
               hoursLed = v4;
               requiresLifting = (weight > 200); // Heuristic if not specified
            }

            if (hoursStruct > 0 && weight > 0) {
              parsedModels.push({
                id: sanitizeKey(originalKey),
                name: originalKey,
                hours_structure_per_spot: hoursStruct,
                hours_pv_per_spot: hoursPv,
                hours_led_per_spot: hoursLed,
                weight_structure_per_spot_kg: weight,
                requires_lifting: requiresLifting || weight > 200
              });
            }
         }
      }
    });
    
    if (parsedModels.length > 0) data.models = parsedModels;
    else data.models = DEFAULT_MODELS;

    if (parsedZavorre.length > 0) data.zavorraModels = parsedZavorre;
    // No default Zavorre models here, App will fallback if needed

  } catch (error) {
    console.error("Error fetching CSV data", error);
    data.models = DEFAULT_MODELS;
  }

  return data;
};
