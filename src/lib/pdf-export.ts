
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { EquipmentAsset, MaintenanceLog, AssetTemplate } from './db';

/**
 * Utility for exporting MaintainMate data to PDF in a structured military format.
 */

const primaryColor = [45, 65, 45]; // Olive Drab RGB

export const exportReadinessReport = (stats: { assetCount: number; deadlineCount: number; fmcCount: number }) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('UNIT READINESS SUMMARY', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 105, 27, { align: 'center' });

  autoTable(doc, {
    startY: 40,
    head: [['Category', 'Count', 'Percentage']],
    body: [
      ['Total Assets', stats.assetCount.toString(), '100%'],
      ['Full Mission Capable (FMC)', stats.fmcCount.toString(), `${((stats.fmcCount / (stats.assetCount || 1)) * 100).toFixed(1)}%`],
      ['Non-Mission Capable (NMC/Deadline)', stats.deadlineCount.toString(), `${((stats.deadlineCount / (stats.assetCount || 1)) * 100).toFixed(1)}%`],
    ],
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Readiness_Report_${date}.pdf`);
};

export const exportInventoryReport = (assets: (EquipmentAsset & { template?: AssetTemplate })[]) => {
  const doc = new jsPDF('l');
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.text('UNIT EQUIPMENT INVENTORY', 148, 20, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Nomenclature', 'Serial Number', 'NSN', 'TAMCN', 'Owner', 'Status']],
    body: assets.map(a => [
      a.template?.nomenclature || 'N/A',
      a.serialNumber,
      a.template?.nsn || 'N/A',
      a.template?.tamcn || 'N/A',
      a.owner,
      a.isInMaintenance ? 'NMC / DEADLINE' : 'FMC / READY'
    ]),
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Inventory_Report_${date}.pdf`);
};

export const exportAssetHistoryReport = (asset: EquipmentAsset & { template?: AssetTemplate }, logs: MaintenanceLog[]) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(16);
  doc.text(`EQUIPMENT RECORD: ${asset.template?.nomenclature || 'SERIALIZED UNIT'}`, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Serial Number: ${asset.serialNumber}`, 105, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`NSN: ${asset.template?.nsn || 'N/A'} | TAMCN: ${asset.template?.tamcn || 'N/A'}`, 105, 34, { align: 'center' });

  autoTable(doc, {
    startY: 45,
    head: [['Date', 'Technician', 'SR#', 'Activity', 'Status']],
    body: logs.map(l => [
      format(l.timestamp, 'MMM d, yyyy'),
      l.technician,
      l.serviceRequestId || 'N/A',
      l.activityDescription,
      l.status
    ]),
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Asset_History_${asset.serialNumber}_${date}.pdf`);
};

export const exportPubsCatalog = (templates: AssetTemplate[]) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.text('TECHNICAL PUBLICATIONS CATALOG', 105, 20, { align: 'center' });

  templates.forEach((t, i) => {
    if (i > 0) doc.addPage();
    
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(t.nomenclature, 15, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`NSN: ${t.nsn} | TAMCN: ${t.tamcn}`, 15, 37);

    doc.setFontSize(11);
    doc.text('Technical Knowledge Base:', 15, 47);
    const splitText = doc.splitTextToSize(t.technicalKnowledge || 'No technical data recorded.', 180);
    doc.text(splitText, 15, 53);

    if (t.components && t.components.length > 0) {
      autoTable(doc, {
        startY: 55 + (splitText.length * 5),
        head: [['Component', 'Measurement Specs']],
        body: t.components.map(c => [c.name, c.measurements]),
        headStyles: { fillColor: [80, 80, 80] },
      });
    }
  });

  doc.save(`PUBS_Catalog_${date}.pdf`);
};

export const exportMasterLogs = (logs: (MaintenanceLog & { asset?: EquipmentAsset; template?: AssetTemplate })[]) => {
  const doc = new jsPDF('l');
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.text('MASTER MAINTENANCE LOG (ERO)', 148, 20, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Asset / Serial', 'SR#', 'Technician', 'Action', 'Status']],
    body: logs.map(l => [
      format(l.timestamp, 'MMM d, yy'),
      `${l.template?.nomenclature ?? 'Unknown'} / ${l.asset?.serialNumber ?? 'N/A'}`,
      l.serviceRequestId || 'N/A',
      l.technician,
      l.activityDescription,
      l.status
    ]),
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Master_Logs_${date}.pdf`);
};

/**
 * Exports all unit data into a single organized master technical journal PDF.
 */
export const exportFullUnitJournal = async (data: {
  assets: (EquipmentAsset & { template?: AssetTemplate })[];
  logs: (MaintenanceLog & { asset?: EquipmentAsset; template?: AssetTemplate })[];
  templates: AssetTemplate[];
  stats: { assetCount: number; deadlineCount: number; fmcCount: number };
}) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  // Page 1: Title Page
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MASTER TECHNICAL JOURNAL', 105, 80, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Unit Readiness & Equipment Record', 105, 95, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 105, 110, { align: 'center' });
  doc.text(`Report Identifier: MM-${date}`, 105, 115, { align: 'center' });

  // Readiness Summary Card on Title Page
  autoTable(doc, {
    startY: 140,
    head: [['Unit Readiness Metric', 'Value']],
    body: [
      ['Total Serialized Inventory', data.stats.assetCount.toString()],
      ['FMC (Full Mission Capable)', data.stats.fmcCount.toString()],
      ['NMC (Non-Mission Capable)', data.stats.deadlineCount.toString()],
      ['Readiness Rating', `${((data.stats.fmcCount / (data.stats.assetCount || 1)) * 100).toFixed(1)}%`]
    ],
    headStyles: { fillColor: primaryColor },
    theme: 'grid'
  });

  // Page 2: Inventory
  doc.addPage('l');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SECTION 1: EQUIPMENT INVENTORY', 15, 20);
  
  autoTable(doc, {
    startY: 30,
    head: [['Nomenclature', 'Serial', 'NSN', 'TAMCN', 'Custodian', 'Status']],
    body: data.assets.map(a => [
      a.template?.nomenclature || 'N/A',
      a.serialNumber,
      a.template?.nsn || 'N/A',
      a.template?.tamcn || 'N/A',
      a.owner,
      a.isInMaintenance ? 'DEADLINED' : 'READY'
    ]),
    headStyles: { fillColor: primaryColor },
  });

  // Page 3: Master Log (ERO)
  doc.addPage('l');
  doc.text('SECTION 2: MAINTENANCE HISTORY (ERO)', 15, 20);
  
  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Asset / Serial', 'SR#', 'Technician', 'Activity', 'Status']],
    body: data.logs.map(l => [
      format(l.timestamp, 'MMM d, yy'),
      `${l.template?.nomenclature ?? 'Unknown'} / ${l.asset?.serialNumber ?? 'N/A'}`,
      l.serviceRequestId || 'N/A',
      l.technician,
      l.activityDescription,
      l.status
    ]),
    headStyles: { fillColor: primaryColor },
  });

  // Page 4: Technical Publications Catalog
  doc.addPage('p');
  doc.text('SECTION 3: TECHNICAL PUBLICATIONS CATALOG', 15, 20);
  
  data.templates.forEach((t, i) => {
    const yStart = i === 0 ? 35 : (doc as any).lastAutoTable.finalY + 20;
    
    // Check for page overflow
    if (yStart > 240) {
      doc.addPage();
      doc.text('TECHNICAL PUBLICATIONS CATALOG (CONT.)', 15, 20);
    }

    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`${t.nomenclature} (TAMCN: ${t.tamcn})`, 15, i === 0 || yStart > 240 ? 35 : yStart);
    
    autoTable(doc, {
      startY: (i === 0 || yStart > 240 ? 35 : yStart) + 5,
      head: [['Component / Sub-System', 'Nominal Measurements / Specs']],
      body: (t.components || []).map(c => [c.name, c.measurements]),
      headStyles: { fillColor: [80, 80, 80] },
      margin: { left: 15 }
    });
  });

  doc.save(`Master_Unit_Journal_${date}.pdf`);
};
