
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
      ['Full Mission Capable (FMC)', stats.fmcCount.toString(), `${((stats.fmcCount / stats.assetCount) * 100).toFixed(1)}%`],
      ['Non-Mission Capable (NMC/Deadline)', stats.deadlineCount.toString(), `${((stats.deadlineCount / stats.assetCount) * 100).toFixed(1)}%`],
    ],
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Readiness_Report_${date}.pdf`);
};

export const exportInventoryReport = (assets: EquipmentAsset[]) => {
  const doc = new jsPDF('l');
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.text('UNIT EQUIPMENT INVENTORY', 148, 20, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Nomenclature', 'Serial Number', 'NSN', 'TAMCN', 'Owner', 'Status']],
    body: assets.map(a => [
      a.nomenclature,
      a.serialNumber,
      a.nsn,
      a.tamcn,
      a.owner,
      a.isInMaintenance ? 'NMC / DEADLINE' : 'FMC / READY'
    ]),
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Inventory_Report_${date}.pdf`);
};

export const exportAssetHistoryReport = (asset: EquipmentAsset, logs: MaintenanceLog[]) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(16);
  doc.text(`EQUIPMENT RECORD: ${asset.nomenclature}`, 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Serial Number: ${asset.serialNumber}`, 105, 28, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`NSN: ${asset.nsn} | TAMCN: ${asset.tamcn}`, 105, 34, { align: 'center' });

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

export const exportMasterLogs = (logs: (MaintenanceLog & { asset?: EquipmentAsset })[]) => {
  const doc = new jsPDF('l');
  const date = format(new Date(), 'yyyyMMdd_HHmm');

  doc.setFontSize(18);
  doc.text('MASTER MAINTENANCE LOG (ERO)', 148, 20, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Asset / Serial', 'SR#', 'Technician', 'Action', 'Status']],
    body: logs.map(l => [
      format(l.timestamp, 'MMM d, yy'),
      `${l.asset?.nomenclature ?? 'Unknown'} / ${l.asset?.serialNumber ?? 'N/A'}`,
      l.serviceRequestId || 'N/A',
      l.technician,
      l.activityDescription,
      l.status
    ]),
    headStyles: { fillColor: primaryColor },
  });

  doc.save(`Master_Logs_${date}.pdf`);
};
