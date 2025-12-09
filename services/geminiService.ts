
import { GoogleGenAI } from "@google/genai";
import { CalculationResult, InputState, ServiceType, TransportType } from "../types";

export const generateCrmDescription = async (
  input: InputState, 
  results: CalculationResult, 
  provinceName: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Errore: API Key mancante. Contattare l'amministratore.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Sei un assistente per il team commerciale di Pergosolar.
    Devi generare un testo descrittivo professionale da incollare nel CRM (Corpo email o note interne).
    
    Il testo deve essere diviso in due sezioni chiare: "INSTALLAZIONE" e "TRASPORTO".
    Usa un tono formale, sintetico ma completo.
    
    ISTRUZIONI OBBLIGATORIE:
    1. NON menzionare MAI costi interni, margini, tariffe orarie o breakdown dei prezzi. Parla solo del servizio finale.
    2. IL TESTO DEVE CONTENERE QUESTA FRASE ESATTA ALLA FINE: "Per qualsiasi dubbio tecnico o logistico rispondere a erica.b@pergosolar.it".
    3. Se il trasporto è con GRU, scrivi: "Scarico incluso in cantiere con mezzi idonei".
    4. Se il trasporto è con BILICO (No Gru), scrivi: "Cliente deve predisporre mezzo idoneo per lo scarico (Muletto/Gru in loco)".
    5. Se c'è pernottamento (Trasferta), scrivi: "Il preventivo include vitto e alloggio per la squadra tecnica".
    6. Se sono Pannelli Coibentati, menziona l'ingombro specifico gestito.
    
    DATI INPUT:
    - Servizio: ${input.serviceType === ServiceType.FULL_INSTALLATION ? 'Installazione Completa Chiavi in Mano' : 'Assistenza tecnica all\'avvio'}
    - Destinazione: ${input.destinationProvince}
    - Modello: ${input.modelId}
    - Posti Auto: ${input.spots}
    - Accessori: ${input.hasPv ? 'Fotovoltaico, ' : ''}${input.hasLed ? 'LED, ' : ''}${input.hasCoibentati ? 'Copertura Coibentata' : ''}
    - Zavorre: ${input.zavorraType}
    - Giorni stimati in cantiere: ${results.totalDays}
    - Squadra: ${input.techsInternal + input.techsExternal} tecnici
    - Mezzi Trasporto: ${results.details.numberOfVehicles}x ${results.transportMode === TransportType.VAN ? 'Nostro Mezzo' : results.transportMode === TransportType.TRUCK ? 'Bilico Standard' : 'Motrice con Gru'}
    - Peso Totale Materiale: ${results.totalWeightKg} kg
    
    Genera il testo ora.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Impossibile generare il testo.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore durante la generazione del testo con IA.";
  }
};
