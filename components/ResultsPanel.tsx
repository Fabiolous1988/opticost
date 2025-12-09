
import React, { useState } from 'react';
import { CalculationResult, InputState, TransportType, PergolaModel } from '../types';
import { generatePdfQuote } from '../services/pdfService';

interface Props {
  result: CalculationResult;
  input: InputState;
  modelName: string;
}

export const ResultsPanel: React.FC<Props> = ({ result, input, modelName }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);

  const handleDownloadPdf = () => {
    generatePdfQuote(input, result, input.destinationProvince, modelName);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          Riepilogo Costi
        </h2>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">IVA Esclusa</span>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Financials */}
        <div className="space-y-6">
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 shadow-sm">
            <p className="text-sm text-blue-800 font-semibold mb-1 uppercase tracking-wide">Prezzo Suggerito (Rivendita)</p>
            <p className="text-4xl font-extrabold text-blue-900">{formatCurrency(result.suggestedPrice)}</p>
            <div className="mt-2 flex items-center text-xs text-blue-600">
               <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded mr-2">+{result.marginAmount.toFixed(0)}€ margine</span>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-gray-600">Costo Manodopera ({result.totalHours.toFixed(1)} ore)</span>
              <span className="font-medium text-gray-900">{formatCurrency(result.costManodopera)}</span>
            </div>
            {result.details.discountApplied > 0 && (
               <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 text-green-600 text-xs">
                 <span>Sconto Ottimizzazione ({result.details.discountApplied}%)</span>
                 <span>Applicato</span>
               </div>
            )}
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-gray-600">
                 Trasferta
                 {result.details.hotelPriceUsed > 0 && <span className="block text-[10px] text-gray-400">Hotel stima: {result.details.hotelPriceUsed}€/notte</span>}
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(result.costTrasferta)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-gray-600">
                Spese Viaggio
                {result.details.tollsIncluded > 0 && <span className="block text-[10px] text-gray-400">Incl. pedaggio: {result.details.tollsIncluded}€</span>}
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(result.costTravel)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-gray-600">Noleggi/Sollevamento</span>
              <span className="font-medium text-gray-900">{formatCurrency(result.costMachinery)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
              <span className="text-gray-600">
                Trasporto Materiale
                <span className="block text-xs text-gray-400 font-normal">
                  {result.transportMode === 'VAN' ? 'Nostro Mezzo' : 
                   result.transportMode === 'TRUCK' ? 'Bilico' : 'Gru'} 
                   {result.details.numberOfVehicles > 1 ? ` (x${result.details.numberOfVehicles})` : ''}
                </span>
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(result.costTransportThirdParty)}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-300 mt-2">
              <span className="font-bold text-gray-800 uppercase text-xs">Totale Costi Vivi</span>
              <span className="font-bold text-gray-800">{formatCurrency(result.totalCost)}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Logistics Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700 uppercase text-xs tracking-wider border-b pb-2">Dettagli Logistica</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mr-2 text-xs flex-