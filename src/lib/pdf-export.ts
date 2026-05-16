
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { EquipmentAsset, MaintenanceLog, AssetTemplate, TechnicalAssembly, TechnicalComponent, TechnicalConnection } from './db';

const primaryColor = [45, 65, 45]; // Olive Drab RGB

export const exportReadinessReport = (stats: { assetCount: number; deadlineCount: number; fmcCount: number }) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('UNIT READINESS SUMMARY', 105, 20, { align: 'center' });
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
    head: [['Nomenclature', 'Serial Number', 'NSN', 'TAMCN', 'Owner', 'Location', 'Status']],
    body: assets.map(a => [
      a.template?.nomenclature || 'N/A',
      a.serialNumber,
      a.template?.nsn || 'N/A',
      a.template?.tamcn || 'N/A',
      a.owner,
      a.isInMaintenance ? (a.maintenanceLocation || 'IN SHOP') : 'WITH OWNER',
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
  doc.text(`Serial Number: ${asset.serialNumber} | Owner: ${asset.owner}`, 105, 28, { align: 'center' });
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
    doc.text('Field Technical Knowledge:', 15, 47);
    const splitText = doc.splitTextToSize(t.technicalKnowledge || 'No field notes recorded.', 180);
    doc.text(splitText, 15, 53);

    let currentY = 60 + (splitText.length * 5);
    
    // List Assemblies and Components
    t.assemblies.forEach(assembly => {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`Assembly: ${assembly.name}`, 15, currentY);
      currentY += 7;
      
      autoTable(doc, {
        startY: currentY,
        head: [['Component', 'Ports', 'Specs']],
        body: assembly.components.map(c => [
          c.name,
          c.ports?.join(', ') || '-',
          (c.expectedMeasurements || []).map(m => `${m.name}: ${m.value}`).join(', ') || '-'
        ]),
        headStyles: { fillColor: [80, 80, 80] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // List Topology / Connections
    if (t.connections && t.connections.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(12);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('System Topology (Signal Paths)', 15, currentY);
      currentY += 5;
      
      const allComponents = t.assemblies.flatMap(a => a.components);
      
      autoTable(doc, {
        startY: currentY,
        head: [['Source', 'Port', 'Dest', 'Port', 'Type', 'Cable ID']],
        body: t.connections.map(conn => {
          const src = allComponents.find(c => c.id === conn.sourceComponentId);
          const dest = allComponents.find(c => c.id === conn.destComponentId);
          return [
            src?.name || 'Unknown',
            conn.sourcePort || '-',
            dest?.name || 'Unknown',
            conn.destPort || '-',
            conn.type,
            conn.cableId || '-'
          ];
        }),
        headStyles: { fillColor: [120, 120, 120] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
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
    head: [['Date', 'Asset / Serial', 'SR#', 'Maintainer', 'Action', 'Status']],
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

export const exportFullUnitJournal = async (data: {
  assets: (EquipmentAsset & { template?: AssetTemplate })[];
  logs: (MaintenanceLog & { asset?: EquipmentAsset; template?: AssetTemplate })[];
  templates: AssetTemplate[];
  stats: { assetCount: number; deadlineCount: number; fmcCount: number };
}) => {
  const doc = new jsPDF();
  const date = format(new Date(), 'yyyyMMdd_HHmm');
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MASTER TECHNICAL JOURNAL', 105, 80, { align: 'center' });
  doc.setFontSize(16);
  doc.text('Unit Readiness & Equipment Record', 105, 95, { align: 'center' });
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
  doc.addPage('l');
  doc.setFontSize(18);
  doc.text('SECTION 1: EQUIPMENT INVENTORY', 15, 20);
  autoTable(doc, {
    startY: 30,
    head: [['Nomenclature', 'Serial', 'NSN', 'TAMCN', 'Owner', 'Location', 'Status']],
    body: data.assets.map(a => [
      a.template?.nomenclature || 'N/A',
      a.serialNumber,
      a.template?.nsn || 'N/A',
      a.template?.tamcn || 'N/A',
      a.owner,
      a.isInMaintenance ? (a.maintenanceLocation || 'IN SHOP') : 'WITH OWNER',
      a.isInMaintenance ? 'DEADLINED' : 'READY'
    ]),
    headStyles: { fillColor: primaryColor },
  });
  doc.addPage('l');
  doc.text('SECTION 2: MAINTENANCE HISTORY (ERO)', 15, 20);
  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Asset / Serial', 'SR#', 'Maintainer', 'Activity', 'Status']],
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
  doc.save(`Master_Unit_Journal_${date}.pdf`);
};
