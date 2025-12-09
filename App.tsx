
import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, InputState, ServiceType, ZavorraType, DynamicData, ProvinceData } from './types';
import { DEFAULT_SETTINGS, DEFAULT_MODELS, PROVINCES, ZAVORRA_WEIGHTS } from './constants';
import { calculateQuote } from './services/calculationService';
import { fetchDynamicData } from './services/csvService';
import { ResultsPanel } from './components/ResultsPanel';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [dynamicData, setDynamicData] = useState<DynamicData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [input, setInput] = useState<InputState>({
    serviceType: ServiceType.FULL_INSTALLATION,
    destinationProvince: 'MI',
    distanceKm: 160,
    modelId: DEFAULT_MODELS[0].id,
    spots: 2,
    techsInternal: 2,
    techsExternal: 0,
    zavorraType: ZavorraType.CEMENTO_16,
    hasLed: true,
    hasPv: true,
    hasCoibentati: false,
    assistanceDays: 1
  });

  // Fetch Data on Mount
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      const data = await fetchDynamicData();
      setDynamicData(data);
      
      // Merge CSV settings into current settings
      if (data.settingsOverrides) {
        setSettings(prev => ({ ...prev, ...data.settingsOverrides }));
      }
      
      // If we found models in CSV, switch default model to first available one
      if (data.models && data.models.length > 0) {
        setInput(prev => ({
           ...prev,
           modelId: data.models[0].id
        }));
      }

      setIsDataLoading(false);
    };
    loadData();
  }, []);

  // Update Estimated KM when province changes
  useEffect(() => {
    if (PROVINCES[input.destinationProvince]) {
      setInput(prev => ({ ...prev, distanceKm: PROVINCES[input.destinationProvince].km }));
    }
  }, [input.destinationProvince]);

  const currentProvinceData: ProvinceData | null = useMemo(() => {
    if (!dynamicData?.provinces) return null;
    return dynamicData.provinces[input.destinationProvince] || null;
  }, [dynamicData, input.destinationProvince]);

  // Use Models from Dynamic Data if available, else Default
  const currentModels = (dynamicData?.models && dynamicData.models.length > 0) 
    ? dynamicData.models 
    : DEFAULT_MODELS;

  const result = useMemo(() => 
    calculateQuote(input, settings, currentProvinceData, currentModels), 
    [input, settings, currentProvinceData, currentModels]
  );

  const handleChange = (field: keyof InputState, value: any) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Sincronizzazione Dati Google Sheets in corso...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center mr-3 shadow-sm">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">OptiCost <span className="text-gray-400 font-normal">| Pergosolar</span></h1>
              <p className="text-[10px] text-gray-400 mt-0.5">Dati aggiornati: {dynamicData?.lastUpdated.toLocaleTimeString()}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Variabili & Costi
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Service Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold mr-2 px-2 py-1 rounded">1</span>
                Tipologia Servizio
              </h3>
              <div className="space-y-3">
                 <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${input.serviceType === ServiceType.FULL_INSTALLATION ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                   <input 
                    type="radio" 
                    name="service" 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    checked={input.serviceType === ServiceType.FULL_INSTALLATION}
                    onChange={() => handleChange('serviceType', ServiceType.FULL_INSTALLATION)}
                   />
                   <div className="ml-3">
                     <span className="block font-medium text-gray-800">Installazione Completa</span>
                     <span className="block text-xs text-gray-500">Chiavi in mano (Struttura, PV, LED)</span>
                   </div>
                 </label>
                 <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${input.serviceType === ServiceType.ASSISTANCE_1_TECH ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                   <input 
                    type="radio" 
                    name="service" 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    checked={input.serviceType === ServiceType.ASSISTANCE_1_TECH}
                    onChange={() => {
                        handleChange('serviceType', ServiceType.ASSISTANCE_1_TECH);
                        handleChange('techsInternal', 1);
                        handleChange('techsExternal', 0);
                    }}
                   />
                   <span className="ml-3 font-medium text-gray-800">Assistenza (1 Tecnico)</span>
                 </label>
                 <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${input.serviceType === ServiceType.ASSISTANCE_2_TECH ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                   <input 
                    type="radio" 
                    name="service" 
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    checked={input.serviceType === ServiceType.ASSISTANCE_2_TECH}
                    onChange={() => {
                        handleChange('serviceType', ServiceType.ASSISTANCE_2_TECH);
                        handleChange('techsInternal', 2);
                        handleChange('techsExternal', 0);
                    }}
                   />
                   <span className="ml-3 font-medium text-gray-800">Assistenza (2 Tecnici)</span>
                 </label>
              </div>
            </div>

            {/* 2. Destination */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
               <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                 <span className="bg-blue-100 text-blue-800 text-xs font-bold mr-2 px-2 py-1 rounded">2</span>
                 Luogo e Logistica
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Provincia</label>
                    <div className="relative">
                      <select 
                        className="w-full appearance-none bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8 text-sm"
                        value={input.destinationProvince}
                        onChange={(e) => handleChange('destinationProvince', e.target.value)}
                      >
                        {/* Use dynamic provinces if available, else static mock list */}
                        {dynamicData && Object.keys(dynamicData.provinces).length > 0 ? (
                           (Object.values(dynamicData.provinces) as ProvinceData[]).sort((a,b) => a.code.localeCompare(b.code)).map(p => (
                             <option key={p.code} value={p.code}>{p.code} - {p.region}</option>
                           ))
                        ) : (
                           Object.keys(PROVINCES).map(p => (
                             <option key={p} value={p}>{p}</option>
                           ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    {currentProvinceData && (
                      <p className="text-[10px] text-green-600 mt-1">Tariffe aggiornate per {currentProvinceData.region}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Distanza (km)</label>
                    <input 
                      type="number" 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.distanceKm}
                      onChange={(e) => handleChange('distanceKm', Number(e.target.value))}
                    />
                  </div>
               </div>
               <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600 flex items-start">
                  <svg className="w-4 h-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Partenza: Via Disciplina 11, 37036 San Martino Bonalbergo, Verona
               </div>
            </div>

            {/* 3. Configuration */}
            {input.serviceType === ServiceType.FULL_INSTALLATION ? (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold mr-2 px-2 py-1 rounded">3</span>
                  Configurazione Cantiere
                </h3>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Modello Pergola</label>
                    <select 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.modelId}
                      onChange={(e) => handleChange('modelId', e.target.value)}
                    >
                      {currentModels.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Posti Auto (N.)</label>
                    <input 
                      type="number" min="1"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.spots}
                      onChange={(e) => handleChange('spots', Number(e.target.value))}
                    />
                  </div>
                   <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo Zavorra</label>
                    <select 
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.zavorraType}
                      onChange={(e) => handleChange('zavorraType', e.target.value)}
                    >
                      <option value={ZavorraType.NONE}>Nessuna / Altro</option>
                      <option value={ZavorraType.CEMENTO_16}>Cemento (16 q)</option>
                      <option value={ZavorraType.TWIN_DRIVE_24}>Twin Drive (24 q)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Accessori Inclusi</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={input.hasPv} onChange={(e) => handleChange('hasPv', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                      <span className="ml-2 text-sm text-gray-700">Pannelli PV</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={input.hasLed} onChange={(e) => handleChange('hasLed', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                      <span className="ml-2 text-sm text-gray-700">Illuminazione LED</span>
                    </label>
                     <label className="inline-flex items-center col-span-2">
                      <input type="checkbox" checked={input.hasCoibentati} onChange={(e) => handleChange('hasCoibentati', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                      <span className="ml-2 text-sm text-gray-700">Pannelli Coibentati (Riduce capacità Bilico)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                   <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tecnici Interni</label>
                    <input 
                      type="number" min="0"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.techsInternal}
                      onChange={(e) => handleChange('techsInternal', Number(e.target.value))}
                    />
                  </div>
                   <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tecnici Esterni</label>
                    <input 
                      type="number" min="0"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.techsExternal}
                      onChange={(e) => handleChange('techsExternal', Number(e.target.value))}
                    />
                  </div>
                </div>

              </div>
            ) : (
               <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold mr-2 px-2 py-1 rounded">3</span>
                  Durata Assistenza
                </h3>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Giorni Richiesti</label>
                    <input 
                      type="number" min="1"
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                      value={input.assistanceDays}
                      onChange={(e) => handleChange('assistanceDays', Number(e.target.value))}
                    />
                  </div>
               </div>
            )}

          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-7">
            <div className="sticky top-24">
              <ResultsPanel result={result} input={input} />
            </div>
          </div>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={setSettings}
      />
    </div>
  );
};

export default App;
