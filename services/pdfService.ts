import 'jspdf';
import 'jspdf-autotable';
import { CalculationResult, InputState, ServiceType, TransportType, PergolaModel } from '../types';

// In the browser UMD build (v2.5.1) loaded via importmap, jsPDF is exposed under window.jspdf.jsPDF
// or simply window.jsPDF depending on the exact version/build.
const jsPDF = (window as any).jspdf?.jsPDF || (window as any).jsPDF;

export const generatePdfQuote = (
  input: InputState,
  result: CalculationResult,
  provinceName: string,
  modelName: string
) => {
  if (!jsPDF) {
    console.error("jsPDF library not found");
    alert("Errore: Libreria PDF non caricata correttamente.");
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Colors
  const pergoBlue = '#2563EB'; // Tailwind blue-600
  const pergoGray = '#4B5563'; // Tailwind gray-600

  // Header
  doc.setFontSize(22);
  doc.setTextColor(pergoBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('PERGOSOLAR', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(pergoGray);
  doc.setFont('helvetica', 'normal');
  doc.text('Preventivo Preliminare', pageWidth - 14, 20, { align: 'right' });
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, pageWidth - 14, 25, { align: 'right' });

  // Title
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 30, pageWidth - 14, 30);
  
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo Costi Installazione e Trasporto', 14, 45);

  // Service Info
  const serviceText = input.serviceType === ServiceType.FULL_INSTALLATION 
    ? 'Installazione Completa' 
    : `Assistenza Tecnica (${input.assistanceTechs} Tecnici)`;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Servizio: ${serviceText}`, 14, 55);
  doc.text(`Destinazione: ${input.destinationProvince}`, 14, 61);

  // Configuration Table
  const configBody = [];
  
  if (input.serviceType === ServiceType.FULL_INSTALLATION) {
    configBody.push(['Modello', modelName]);
    configBody.push(['Posti Auto', `${input.spots}`]);
    
    const accessories = [];
    if (input.hasPv) accessories.push('Fotovoltaico');
    if (input.hasLed) accessories.push('LED');
    if (input.hasTelo) accessories.push('Telo');
    if (input.hasCoibentati) accessories.push('Pannelli Coibentati');
    
    configBody.push(['Accessori', accessories.join(', ') || '-']);
    
    if (input.hasZavorre) {
       configBody.push(['Zavorre', `${input.zavorraModelId.replace(/_/g, ' ')} (x${result.details.ballastCount})`]);
    } else {
       configBody.push(['Zavorre', 'Nessuna']);
    }
  } else {
    configBody.push(['Durata', `${input.assistanceDays} giorni`]);
  }

  (doc as any).autoTable({
    startY: 70,
    head: [['Configurazione', 'Dettaglio']],
    body: configBody,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Logistics Info
  const logisticsBody = [
    ['Distanza (A/R)', `${input.distanceKm * 2} km`],
    ['Tempistiche', `${result.totalDays} giorni lavorativi`],
    ['Peso Totale', `${result.totalWeightKg.toFixed(0)} kg`],
    ['Mezzi Trasporto', result.transportMode === TransportType.VAN ? 'Furgone Aziendale' : 
                        result.transportMode === TransportType.TRUCK ? `Bilico (x${result.details.numberOfVehicles})` : 'Motrice con Gru'],
    ['Trasferta', result.details.isTrasferta ? 'Si (Pernottamento incluso)' : 'No'],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Logistica', 'Dettaglio']],
    body: logisticsBody,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Financials
  const fmt = (n: number) => `€ ${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const costBody = [
    ['Manodopera', fmt(result.costManodopera)],
    ['Spese Viaggio & Trasferta', fmt(result.costTravel + result.costTrasferta)],
    ['Noleggi / Sollevamento', fmt(result.costMachinery)],
    ['Trasporto Materiale', fmt(result.costTransportThirdParty)],
    ['TOTALE COSTI VIVI', fmt(result.totalCost)],
  ];

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Voce di Costo', 'Importo (IVA escl.)']],
    body: costBody,
    theme: 'plain',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [200, 200, 200], lineWidth: { bottom: 0.1 } },
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 
        1: { halign: 'right', fontStyle: 'bold' } 
    },
    didParseCell: (data: any) => {
        if (data.row.index === 4) {
            data.cell.styles.textColor = [220, 38, 38]; // Red for cost total
        }
    }
  });

  // Final Price
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFillColor(239, 246, 255); // Blue 50
  doc.roundedRect(14, finalY, pageWidth - 28, 25, 2, 2, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175); // Blue 800
  doc.text('PREZZO SUGGERITO (RIVENDITA)', 20, finalY + 10);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(fmt(result.suggestedPrice), 20, finalY + 18);

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generato da OptiCost Pergosolar per uso interno.', pageWidth / 2, 280, { align: 'center' });

  doc.save(`Preventivo_Pergosolar_${input.destinationProvince}_${new Date().toISOString().slice(0,10)}.pdf`);
};