
import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, InputState, ServiceType, DynamicData, ProvinceData, AssistanceTransportMode } from './types';
import { DEFAULT_SETTINGS, DEFAULT_MODELS, PROVINCES, STARTING_ADDRESS } from './constants';
import { calculateQuote } from './services/calculationService';
import { fetchDynamicData } from './services/csvService';
import { performLogisticsResearch } from './services/researchService';
import { ResultsPanel } from './components/ResultsPanel';
import { SettingsModal } from './components/SettingsModal';

const App: React.FC = () => {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [dynamicData, setDynamicData] = useState<DynamicData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [input, setInput] = useState<InputState>({
    serviceType: ServiceType.FULL_INSTALLATION,
    address: '',
    destinationProvince: 'MI',
    distanceKm: 0,
    startDate: new Date().toISOString().split('T')[0],
    
    // Research Overrides
    customTollCost: 0,
    customHotelCost: 0,
    customPublicTransportCost: 0,

    modelId: DEFAULT_MODELS[0].id,
    spots: 2,
    
    // Tech Toggles
    useInternalTechs: true,
    techsInternal: 2,
    useExternalTechs: false,
    techsExternal: 2,
    
    // Zavorre
    hasZavorre: false,
    zavorraModelId: '', // Set after data load
    
    hasLed: true,
    hasPv: true,
    hasTelo: false,
    hasCoibentati: false,
    
    hasForkliftOnSite: false,

    assistanceDays: 1,
    assistanceTechs: 1,
    assistanceTransportMode: AssistanceTransportMode.COMPANY_VEHICLE
  });

  // Fetch Data on Mount
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      const data = await fetchDynamicData();
      setDynamicData(data);
      
      if (data.settingsOverrides) {
        setSettings(prev => ({ ...prev, ...data.settingsOverrides }));
      }
      
      const updates: Partial<InputState> = {};
      if (data.models && data.models.length > 0) {
        updates.modelId = data.models[0].id;
      }
      if (data.zavorraModels && data.zavorraModels.length > 0) {
        updates.zavorraModelId = data.zavorraModels[0].id;
      }
      
      setInput(prev => ({ ...prev, ...updates }));
      setIsDataLoading(false);
    };
    loadData();
  }, []);

  const currentProvinceData: ProvinceData | null = useMemo(() => {
    if (!dynamicData?.provinces) return null;
    return dynamicData.provinces[input.destinationProvince] || null;
  }, [dynamicData, input.destinationProvince]);

  const currentModels = (dynamicData?.models && dynamicData.models.length > 0) 
    ? dynamicData.models 
    : DEFAULT_MODELS;

  const currentZavorraModels = (dynamicData?.zavorraModels && dynamicData.zavorraModels.length > 0)
    ? dynamicData.zavorraModels
    : [];

  const result = useMemo(() => 
    calculateQuote(input, settings, currentProvinceData, currentModels, currentZavorraModels), 
    [input, settings, currentProvinceData, currentModels, currentZavorraModels]
  );
  
  const selectedModelName = useMemo(() => {
    return currentModels.find(m => m.id === input.modelId)?.name || input.modelId;
  }, [currentModels, input.modelId]);

  const handleChange = (field: keyof InputState, value: any) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const handleResearch = async () => {
    if (!input.address) return;
    setIsResearching(true);
    setResearchError(null);
    
    const data = await performLogisticsResearch(input.address, input.startDate);
    
    if (data) {
      // Auto-update values from research
      setInput(prev => ({
        ...prev,
        distanceKm: data.foundDistanceKm,
        customTollCost: data.foundTollCost,
        customHotelCost: data.foundHotelCost,
        customPublicTransportCost: data.foundPublicTransportCost
      }));
    } else {
      setResearchError("Impossibile recuperare dati. Riprova o inserisci manualmente.");
    }
    setIsResearching(false);
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
            <div className={`w-2 h-2 rounded-full mr-2 ${dynamicData ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Variabili & Costi
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
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
                   </div>
                 </label>
                 
                 <div className={`p-3 border rounded-lg transition-all ${input.serviceType === ServiceType.ASSISTANCE_GENERIC ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                   <label className="flex items-center cursor-pointer mb-2">
                     <input 
                      type="radio" 
                      name="service" 
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      checked={input.serviceType === ServiceType.ASSISTANCE_GENERIC}
                      onChange={() => handleChange('serviceType', ServiceType.ASSISTANCE_GENERIC)}
                     />
                     <span className="ml-3 font-medium text-gray-800">Assistenza Tecnici</span>
                   </label>
                   
                   {input.serviceType === ServiceType.ASSISTANCE_GENERIC && (
                      <div className="ml-7 mt-2 space-y-3">
                        <select 
                          className="w-full text-sm border-gray-300 rounded-md p-2 bg-white"
                          value={input.assistanceTechs}
                          onChange={(e) => handleChange('assistanceTechs', Number(e.target.value))}
                        >
                          <option value={1}>1 Tecnico</option>
                          <option value={2}>2 Tecnici</option>
                        </select>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                           <label className={`flex items-center justify-center p-2 border rounded cursor-pointer ${input.assistanceTransportMode === AssistanceTransportMode.COMPANY_VEHICLE ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-gray-50'}`}>
                              <input type="radio" className="hidden" 
                                checked={input.assistanceTransportMode === AssistanceTransportMode.COMPANY_VEHICLE}
                                onChange={() => handleChange('assistanceTransportMode', AssistanceTransportMode.COMPANY_VEHICLE)}
                              />
                              Mezzo Aziendale
                           </label>
                           <label className={`flex items-center justify-center p-2 border rounded cursor-pointer ${input.assistanceTransportMode === AssistanceTransportMode.PUBLIC_TRANSPORT ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-gray-50'}`}>
                              <input type="radio" className="hidden" 
                                checked={input.assistanceTransportMode === AssistanceTransportMode.PUBLIC_TRANSPORT}
                                onChange={() => handleChange('assistanceTransportMode', AssistanceTransportMode.PUBLIC_TRANSPORT)}
                              />
                              Aereo/Treno
                           </label>
                        </div>
                      </div>
                   )}
                 </div>
              </div>
            </div>

            {/* 2. Destination & Logistics */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
               <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center">
                 <span className="bg-blue-100 text-blue-800 text-xs font-bold mr-2 px-2 py-1 rounded">2</span>
                 Luogo e Logistica
               </h3>

               <div className="space-y-4">
                  {/* From */}
                  <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <span className="block text-[10px] font-semibold text-gray-500 uppercase">Partenza</span>
                    <p className="text-xs text-gray-700 truncate">{STARTING_ADDRESS}</p>
                  </div>

                  {/* To Address */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Indirizzo Destinazione</label>
                    <div className="flex space-x-2">
                       <input 
                        type="text" 
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                        placeholder="Via, Città, CAP..."
                        value={input.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Forklift On Site */}
                  <div className="flex items-center justify-between border border-gray-200 p-2 rounded bg-gray-50">
                     <span className="text-xs font-medium text-gray-700">Muletto in loco disponibile?</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={input.hasForkliftOnSite} onChange={(e) => handleChange('hasForkliftOnSite', e.target.checked)} />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                     </label>
                  </div>

                  {/* Province & Date */}
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Provincia (Listino)</label>
                        <select 
                          className="w-full appearance-none bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 pl-3 pr-8 text-sm"
                          value={input.destinationProvince}
                          onChange={(e) => handleChange('destinationProvince', e.target.value)}
                        >
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
                     </div>
                     <div>
                       <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Data Inizio Lavori</label>
                       <input 
                        type="date"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border text-sm"
                        value={input.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                       />
                     </div>
                  </div>

                  {/* AI Research Trigger */}
                  <div>
                    <button
                      onClick={handleResearch}
                      disabled={!input.address || isResearching}
                      className={`w-full py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center ${isResearching ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      {isResearching ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Analisi Distanza & Prezzi in corso...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          Calcola Distanza e Prezzi (AI)
                        </>
                      )}
                    </button>
                    {researchError && <p className="text-red-500 text-xs mt-1 text-center">{researchError}</p>}
                  </div>

                  {/* Found/Manual Values */}
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-xs text-indigo-900 font-medium">Distanza (km)</label>
                        <input type="number" className="w-20 text-right text-xs p-1 border rounded" value={input.distanceKm} onChange={(e) => handleChange('distanceKm', Number(e.target.value))} />
                     </div>
                     
                     {(input.serviceType === ServiceType.FULL_INSTALLATION || input.assistanceTransportMode === AssistanceTransportMode.COMPANY_VEHICLE) && (
                       <div className="flex justify-between items-center">
                          <label className="text-xs text-indigo-900 font-medium">Pedaggio (A/R)</label>
                          <input type="number" className="w-20 text-right text-xs p-1 border rounded" value={input.customTollCost} onChange={(e) => handleChange('customTollCost', Number(e.target.value))} />
                       </div>
                     )}

                     {(input.serviceType === ServiceType.ASSISTANCE_GENERIC && input.assistanceTransportMode === AssistanceTransportMode.PUBLIC_TRANSPORT) && (
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-indigo-900 font-medium">Biglietti A/R (p/p)</label>
                          <input type="number" className="w-20 text-right text-xs p-1 border rounded" value={input.customPublicTransportCost} onChange={(e) => handleChange('customPublicTransportCost', Number(e.target.value))} />
                       </div>
                     )}

                     <div className="flex justify-between items-center">
                        <label className="text-xs text-indigo-900 font-medium">Hotel (Singola/Notte)</label>
                        <input type="number" className="w-20 text-right text-xs p-1 border rounded" value={input.customHotelCost} onChange={(e) => handleChange('customHotelCost', Number(e.target.value))} />
                     </div>
                  </div>

               </div>
            </div>

            {/* 3. Configuration (Hidden for Assistance unless logic changes) */}
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
                   
                   <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Zavorre</label>
                      <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                        <label className="flex items-center cursor-pointer mb-2">
                          <input 
                            type="checkbox" 
                            checked={input.hasZavorre} 
                            onChange={(e) => handleChange('hasZavorre', e.target.checked)} 
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <span className="ml-2 text-sm text-gray-800 font-medium">Richieste</span>
                        </label>
                        
                        {input.hasZavorre && (
                          <div className="animate-fade-in-down space-y-2">
                             {currentZavorraModels.length > 0 ? (
                                <select 
                                  className="w-full text-xs border-gray-200 rounded p-1.5"
                                  value={input.zavorraModelId}
                                  onChange={(e) => handleChange('zavorraModelId', e.target.value)}
                                >
                                  {currentZavorraModels.map(z => (
                                    <option key={z.id} value={z.id}>{z.name}</option>
                                  ))}
                                </select>
                             ) : (
                                <p className="text-xs text-red-500">Nessun modello zavorra trovato nel CSV.</p>
                             )}
                            
                            <div className="text-[10px] text-gray-500 bg-white p-1 rounded border border-gray-100">
                               <span className="block">Numero Zavorre: <strong>{result.details.ballastCount}</strong></span>
                               <span className="block">Peso Tot: <strong>{result.details.ballastTotalWeight}</strong> kg</span>
                            </div>
                          </div>
                        )}
                      </div>
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
                    <label className="inline-flex items-center">
                      <input type="checkbox" checked={input.hasTelo} onChange={(e) => handleChange('hasTelo', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                      <span className="ml-2 text-sm text-gray-700">Inst. Telo</span>
                    </label>
                     <label className="inline-flex items-center">
                      <input type="checkbox" checked={input.hasCoibentati} onChange={(e) => handleChange('hasCoibentati', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"/>
                      <span className="ml-2 text-sm text-gray-700">Pannelli Coibentati</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                   <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tecnici Interni</label>
                      <input 
                         type="checkbox" 
                         checked={input.useInternalTechs}
                         onChange={(e) => handleChange('useInternalTechs', e.target.checked)}
                         className="h-3 w-3 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <input 
                      type="number" min="0"
                      className={`w-full border-gray-300 rounded-md shadow-sm p-2 border text-sm ${!input.useInternalTechs ? 'bg-gray-100 text-gray-400' : ''}`}
                      value={input.techsInternal}
                      onChange={(e) => handleChange('techsInternal', Number(e.target.value))}
                      disabled={!input.useInternalTechs}
                    />
                  </div>
                   
                   <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tecnici Esterni</label>
                       <input 
                         type="checkbox" 
                         checked={input.useExternalTechs}
                         onChange={(e) => handleChange('useExternalTechs', e.target.checked)}
                         className="h-3 w-3 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <input 
                      type="number" min="0"
                      className={`w-full border-gray-300 rounded-md shadow-sm p-2 border text-sm ${!input.useExternalTechs ? 'bg-gray-100 text-gray-400' : ''}`}
                      value={input.techsExternal}
                      onChange={(e) => handleChange('techsExternal', Number(e.target.value))}
                      disabled={!input.useExternalTechs}
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

          <div className="lg:col-span-7">
            <div className="sticky top-24">
              <ResultsPanel result={result} input={input} modelName={selectedModelName} />
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
