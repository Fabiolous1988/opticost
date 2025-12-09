import React, { useState } from 'react';
import { GlobalSettings } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GlobalSettings;
  onSave: (newSettings: GlobalSettings) => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);

  if (!isOpen) return null;

  const handleChange = (key: keyof GlobalSettings, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: parseFloat(value)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">Impostazioni Globali e Variabili</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Section: Logistica */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-600 border-b pb-2">Logistica & Trasferta</h3>
            <div>
              <label className="block text-sm text-gray-600">Soglia Trasferta (km)</label>
              <input type="number" value={localSettings.soglia_distanza_trasferta_km} onChange={(e) => handleChange('soglia_distanza_trasferta_km', e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Diaria Interna (€/giorno)</label>
              <input type="number" value={localSettings.diaria_squadra_interna} onChange={(e) => handleChange('diaria_squadra_interna', e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Diaria Esterna (€/giorno)</label>
              <input type="number" value={localSettings.diaria_squadra_esterna} onChange={(e) => handleChange('diaria_squadra_esterna', e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

          {/* Section: Costi Orari */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-600 border-b pb-2">Manodopera (Costi Aziendali)</h3>
            <div>
              <label className="block text-sm text-gray-600">Costo Tecnico Interno (€/h)</label>
              <input type="number" value={localSettings.costo_orario_tecnico_interno} onChange={(e) => handleChange('costo_orario_tecnico_interno', e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Costo Squadra Esterna (€/h)</label>
              <input type="number" value={localSettings.costo_orario_squadra_esterna} onChange={(e) => handleChange('costo_orario_squadra_esterna', e.target.value)} className="w-full border rounded p-2" />
            </div>
             <div>
              <label className="block text-sm text-gray-600">Ore Lavoro Standard (h/giorno)</label>
              <input type="number" value={localSettings.ore_lavoro_giornaliere_standard} onChange={(e) => handleChange('ore_lavoro_giornaliere_standard', e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

          {/* Section: Veicoli */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-600 border-b pb-2">Mezzi e Carburante</h3>
            <div>
              <label className="block text-sm text-gray-600">Consumo Furgone (km/l)</label>
              <input type="number" value={localSettings.km_per_litro_furgone} onChange={(e) => handleChange('km_per_litro_furgone', e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Costo Gasolio (€/l)</label>
              <input type="number" value={localSettings.costo_medio_gasolio_euro_litro} onChange={(e) => handleChange('costo_medio_gasolio_euro_litro', e.target.value)} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600">Usura Mezzo (€/km)</label>
              <input type="number" value={localSettings.costo_usura_mezzo_euro_km} onChange={(e) => handleChange('costo_usura_mezzo_euro_km', e.target.value)} className="w-full border rounded p-2" />
            </div>
             <div>
              <label className="block text-sm text-gray-600">Costo Base Muletto (€)</label>
              <input type="number" value={localSettings.costo_base_muletto} onChange={(e) => handleChange('costo_base_muletto', e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

           {/* Section: Margini */}
          <div className="space-y-4">
            <h3 className="font-semibold text-blue-600 border-b pb-2">Commerciale</h3>
            <div>
              <label className="block text-sm text-gray-600">Margine/Ricarico Default (%)</label>
              <input type="number" value={localSettings.margine_percentuale_installazione} onChange={(e) => handleChange('margine_percentuale_installazione', e.target.value)} className="w-full border rounded p-2" />
            </div>
          </div>

        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Annulla</button>
          <button onClick={() => { onSave(localSettings); onClose(); }} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow">Salva Modifiche</button>
        </div>
      </div>
    </div>
  );
};
