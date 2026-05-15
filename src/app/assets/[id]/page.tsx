
"use client"

import { use, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog, type EquipmentAsset, type AssetTemplate, type TechnicalAssembly, type TechnicalComponent, type TechnicalConnection } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, User, Sparkles, Loader2, Activity, Layers, Settings2, FolderOpen, FileDown, ExternalLink, BookOpen, Network, Zap, ShieldAlert, ClipboardList, Cable, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { suggestMaintenancePrefill } from '@/ai/flows/smart-maintenance-log-prefill-flow';
import { exportAssetHistoryReport } from '@/lib/pdf-export';
import { cn } from '@/lib/utils';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = parseInt(id);
  
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isEditAssetOpen, setIsEditAssetOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAsset, setIsUpdatingAsset] = useState(false);

  const asset = useLiveQuery(() => isNaN(assetId) ? undefined : db.assets.get(assetId), [assetId]);
  const logs = useLiveQuery(() => 
    isNaN(assetId) ? [] : db.logs.where('assetId').equals(assetId).reverse().sortBy('timestamp'), 
    [assetId]
  );
  
  const template = useLiveQuery(async () => {
    if (!asset?.templateId) return undefined;
    return db.templates.get(asset.templateId);
  }, [asset?.templateId]);

  const groupedLogs = useMemo(() => {
    if (!logs) return {};
    return logs.reduce((acc, log) => {
      const sr = log.serviceRequestId || 'General Tasking';
      if (!acc[sr]) acc[sr] = [];
      acc[sr].push(log);
      return acc;
    }, {} as Record<string, MaintenanceLog[]>);
  }, [logs]);

  const [logFormData, setLogFormData] = useState<Partial<MaintenanceLog>>({
    technician: '',
    activityDescription: '',
    stepsTaken: [],
    status: 'Ongoing',
    serviceRequestId: '',
  });
  const [stepsInput, setStepsInput] = useState('');

  const [editFormData, setEditFormData] = useState<Partial<EquipmentAsset>>({
    serialNumber: '',
    owner: '',
    isInMaintenance: false,
    currentServiceRequest: '',
    notes: '',
    componentSerials: {},
  });

  useEffect(() => {
    if (asset && isEditAssetOpen) {
      setEditFormData({
        serialNumber: asset.serialNumber || '',
        owner: asset.owner || '',
        isInMaintenance: !!asset.isInMaintenance,
        currentServiceRequest: asset.currentServiceRequest || '',
        notes: asset.notes || '',
        componentSerials: asset.componentSerials || {},
      });
    }
  }, [asset, isEditAssetOpen]);

  const handleMagicFill = async () => {
    if (!logFormData.activityDescription?.trim() || !template?.nomenclature) {
      toast({ title: "Details needed", description: "Enter a task description first." });
      return;
    }
    
    setIsAiLoading(true);
    try {
      const allComponents = (template.assemblies || []).flatMap(asm => asm.components);
      const result = await suggestMaintenancePrefill({
        description: logFormData.activityDescription,
        nomenclature: template.nomenclature,
        components: allComponents.map(c => ({ 
          name: c.name, 
          measurements: (c.expectedMeasurements || []).map(m => `${m.name}: ${m.value}`).join(', ') 
        }))
      });
      
      setLogFormData(prev => ({ ...prev, status: result.likelyStatus as any }));
      setStepsInput(result.suggestedSteps.join('\n'));
      toast({ title: "AI Assisted", description: "Reference doctrine applied to pre-fill." });
    } catch (e) {
      toast({ title: "AI Unavailable", description: "Failed to fetch suggestions.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEditAsset = async () => {
    if (!editFormData.serialNumber?.trim()) {
      toast({ title: "Required", description: "Serial Number is mandatory.", variant: "destructive" });
      return;
    }

    setIsUpdatingAsset(true);
    try {
      await db.assets.update(assetId, {
        serialNumber: editFormData.serialNumber.trim(),
        owner: editFormData.owner?.trim() || 'Unassigned',
        isInMaintenance: !!editFormData.isInMaintenance,
        currentServiceRequest: editFormData.currentServiceRequest?.trim() || '',
        notes: editFormData.notes?.trim() || '',
        componentSerials: editFormData.componentSerials || {},
      });
      setIsEditAssetOpen(false);
      toast({ title: "Asset Updated", description: "Record synchronized." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Database error.", variant: "destructive" });
    } finally {
      setIsUpdatingAsset(false);
    }
  };

  const handleAddLog = async () => {
    if (!logFormData.activityDescription?.trim() || !logFormData.technician?.trim()) {
      toast({ title: "Validation", description: "Technician and description required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const stepsArray = stepsInput.split('\n').map(s => s.trim()).filter(s => s !== '');
      const srId = logFormData.serviceRequestId?.trim() || asset?.currentServiceRequest || '';

      await db.logs.add({
        assetId,
        technician: logFormData.technician.trim(),
        serviceRequestId: srId,
        activityDescription: logFormData.activityDescription.trim(),
        stepsTaken: stepsArray,
        status: logFormData.status || 'Ongoing',
        timestamp: Date.now(),
      });

      if (logFormData.status === 'Resolved' && asset?.isInMaintenance) {
        await db.assets.update(assetId, { 
          isInMaintenance: false,
          historicalServiceRequests: [...(asset.historicalServiceRequests || []), asset.currentServiceRequest || ''].filter(s => s),
          currentServiceRequest: ''
        });
      } else if (srId && !asset?.currentServiceRequest) {
        await db.assets.update(assetId, { currentServiceRequest: srId, isInMaintenance: true });
      }

      setIsAddLogOpen(false);
      setLogFormData({ technician: '', activityDescription: '', status: 'Ongoing', serviceRequestId: '', stepsTaken: [] });
      setStepsInput('');
      toast({ title: "Log Recorded", description: "Record committed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (asset === undefined) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  if (!asset) return <div className="p-20 text-center">Asset Not Found</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/assets" className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-primary transition-colors tracking-widest">
          <ChevronLeft className="h-3 w-3 mr-1" /> Back to Inventory
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => exportAssetHistoryReport(asset, logs)} className="h-8 text-[9px] font-black uppercase gap-1 tracking-widest border border-dashed">
            <FileDown className="h-3 w-3" /> Export ERO
          </Button>
          <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
            <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 text-muted-foreground"><Settings2 className="h-3 w-3 mr-1" /> Config</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle className="uppercase font-black text-primary tracking-widest">System Configuration</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-bold">Serial Number</Label>
                  <Input className="font-mono h-8" value={editFormData.serialNumber || ''} onChange={(e) => setEditFormData({...editFormData, serialNumber: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-bold">Owner / Section</Label>
                  <Input className="h-8" value={editFormData.owner || ''} onChange={(e) => setEditFormData({...editFormData, owner: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-bold">Active SR#</Label>
                  <Input className="h-8 font-mono" value={editFormData.currentServiceRequest || ''} onChange={(e) => setEditFormData({...editFormData, currentServiceRequest: e.target.value})} />
                </div>
                
                {template?.assemblies?.map((asm, aIdx) => (
                  <div key={aIdx} className="space-y-3">
                    <Separator />
                    <Label className="text-[10px] uppercase font-black text-primary">{asm.name} component Serials</Label>
                    {asm.components.map((c) => (
                      <div key={c.id} className="grid gap-1">
                        <Label className="text-[9px] uppercase font-bold">{c.name}</Label>
                        <Input 
                          placeholder="Unique Serial"
                          className="font-mono text-xs h-7"
                          value={editFormData.componentSerials?.[c.id] || ''} 
                          onChange={(e) => {
                            const newSerials = { ...editFormData.componentSerials, [c.id]: e.target.value };
                            setEditFormData({...editFormData, componentSerials: newSerials});
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                ))}

                <div className="flex items-center justify-between p-3 border-2 border-dashed rounded-lg bg-muted/30">
                  <Label className="text-[10px] uppercase font-bold">Deadlined Status (NMC)</Label>
                  <Switch checked={!!editFormData.isInMaintenance} onCheckedChange={(checked) => setEditFormData({...editFormData, isInMaintenance: checked})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEditAsset} className="w-full h-10 font-black uppercase tracking-widest" disabled={isUpdatingAsset}>
                  {isUpdatingAsset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Commit Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-primary tracking-tighter flex items-center gap-2">
              {template?.nomenclature || 'SERIALIZED UNIT'}
              {template && (
                <Link href={`/templates?search=${template.nomenclature}`}><Button variant="ghost" size="icon" className="h-6 w-6"><BookOpen className="h-4 w-4" /></Button></Link>
              )}
            </h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest font-bold">SN: {asset.serialNumber}</p>
          </div>
          <Badge className={cn(
            "text-[10px] h-6 px-3 rounded-none font-black uppercase tracking-widest",
            asset.isInMaintenance ? "bg-destructive animate-pulse" : "bg-primary"
          )}>
            {asset.isInMaintenance ? "Non-Mission Capable" : "Ready / FMC"}
          </Badge>
        </div>

        <Card className="tactical-card bg-white">
          <CardHeader className="p-4 pb-0">
             <div className="flex items-center gap-2 text-primary">
               <ShieldAlert className="h-4 w-4" />
               <CardTitle className="text-[10px] font-black uppercase tracking-widest">Doctrine & Status</CardTitle>
             </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 gap-4 text-[10px]">
            <div className="space-y-0.5"><p className="text-muted-foreground uppercase font-black">Custodian</p><p className="font-bold text-xs uppercase">{asset.owner}</p></div>
            <div className="space-y-0.5"><p className="text-muted-foreground uppercase font-black">Active SR#</p><p className="font-mono text-xs">{asset.currentServiceRequest || "NONE"}</p></div>
            
            <Accordion type="single" collapsible className="col-span-2 space-y-2 mt-2">
              {template?.assemblies?.map((asm, idx) => (
                <AccordionItem key={idx} value={`asm-${idx}`} className="border-2 rounded-lg px-3 bg-muted/20">
                  <AccordionTrigger className="hover:no-underline py-2.5 text-[10px] font-black uppercase tracking-tight">
                    <span className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> {asm.name}</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-1 pb-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Target className="h-3 w-3" /> Sub-Components</Label>
                      {asm.components.map(comp => (
                        <div key={comp.id} className="bg-white p-2.5 rounded border-2 border-border/50">
                          <div className="flex justify-between items-start">
                            <p className="font-black text-[11px] uppercase tracking-tight">{comp.name}</p>
                            {asset.componentSerials?.[comp.id] && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-mono bg-primary/5">{asset.componentSerials[comp.id]}</Badge>
                            )}
                          </div>
                          {comp.purpose && <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">{comp.purpose}</p>}
                          {comp.expectedMeasurements && comp.expectedMeasurements.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {comp.expectedMeasurements.map((m, mIdx) => (
                                <span key={mIdx} className="text-[9px] bg-accent/10 px-1.5 py-0.5 rounded-sm text-accent font-mono font-bold">{m.name}: {m.value}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {asm.connections && asm.connections.length > 0 && (
                      <div className="space-y-2">
                         <Label className="text-[9px] uppercase font-black text-muted-foreground flex items-center gap-1.5"><Cable className="h-3 w-3" /> Topology & Signal Paths</Label>
                         <div className="grid gap-2">
                           {asm.connections.map(conn => {
                             const source = asm.components.find(c => c.id === conn.sourceComponentId);
                             const dest = asm.components.find(c => c.id === conn.destComponentId);
                             return (
                               <div key={conn.id} className="p-2 bg-white rounded border border-primary/20 text-[9px] space-y-1">
                                 <div className="flex items-center justify-between font-bold">
                                   <span className="uppercase text-primary">{source?.name || 'SRC'}</span>
                                   <Network className="h-2.5 w-2.5 text-muted-foreground" />
                                   <span className="uppercase text-primary">{dest?.name || 'DEST'}</span>
                                 </div>
                                 <div className="flex gap-2 text-muted-foreground font-mono uppercase">
                                   <span className="bg-muted px-1 rounded">{conn.type}</span>
                                   {conn.connectorType && <span>CON: {conn.connectorType}</span>}
                                   {conn.cableId && <span>CABLE: {conn.cableId}</span>}
                                 </div>
                                 {conn.notes && <p className="italic text-muted-foreground mt-0.5 truncate">{conn.notes}</p>}
                               </div>
                             );
                           })}
                         </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-primary"><Activity className="h-4 w-4" /> ERO Log History</h2>
          <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
            <DialogTrigger asChild><Button size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest"><Plus className="h-3 w-3 mr-1" /> Log Activity</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="uppercase font-black text-primary tracking-widest">Technical Journal Entry</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label className="text-[10px] uppercase font-bold">Maintainer</Label><Input placeholder="Rank / Name" className="h-9" value={logFormData.technician || ''} onChange={(e) => setLogFormData({...logFormData, technician: e.target.value})} /></div>
                  <div className="grid gap-2"><Label className="text-[10px] uppercase font-bold">Task SR#</Label><Input placeholder="SR#" className="h-9 font-mono" value={logFormData.serviceRequestId || ''} onChange={(e) => setLogFormData({...logFormData, serviceRequestId: e.target.value})} /></div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-bold">Activity Description</Label>
                    <Button variant="ghost" size="sm" onClick={handleMagicFill} disabled={isAiLoading} className="h-6 text-[9px] text-accent font-black p-0 uppercase tracking-widest">
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />} AI Assist
                    </Button>
                  </div>
                  <Textarea placeholder="Describe the fault or maintenance task..." className="h-20 text-xs" value={logFormData.activityDescription || ''} onChange={(e) => setLogFormData({...logFormData, activityDescription: e.target.value})} />
                </div>
                <div className="grid gap-2"><Label className="text-[10px] uppercase font-bold">Repair Actions (one per line)</Label><Textarea className="h-40 font-mono text-xs" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} /></div>
                <div className="grid gap-2">
                  <Label className="text-[10px] uppercase font-bold">Job Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Ongoing', 'Awaiting Parts', 'Resolved', 'Deferred'].map((s) => (
                      <Badge key={s} variant={logFormData.status === s ? 'default' : 'outline'} className="cursor-pointer text-[9px] h-6 px-3 rounded-none uppercase font-black tracking-tighter" onClick={() => setLogFormData({...logFormData, status: s as any})}>{s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter><Button onClick={handleAddLog} className="w-full h-10 font-black uppercase tracking-widest" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Commit Technical Record"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedLogs).map(([srId, srLogs]) => (
            <Accordion key={srId} type="single" collapsible className="bg-white rounded-none border-2 border-border shadow-sm">
              <AccordionItem value={srId} className="border-none px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                   <div className="flex items-center gap-3 text-left">
                     <FolderOpen className="h-4 w-4 text-primary" />
                     <div className="space-y-0.5"><p className="text-xs font-black text-primary uppercase tracking-tight">SR: {srId}</p><p className="text-[9px] text-muted-foreground uppercase font-bold">{srLogs.length} Journal Entries</p></div>
                   </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-4">
                  {srLogs.map((log) => (
                    <Card key={log.id} className="border-none bg-muted/20 rounded-none border-l-2 border-primary">
                      <CardHeader className="p-3 pb-2 flex-row justify-between items-center space-y-0">
                        <span className="text-[9px] font-black text-primary flex items-center gap-1.5 uppercase tracking-tighter"><User className="h-3 w-3" /> {log.technician}</span>
                        <span className="text-[9px] text-muted-foreground font-mono font-bold">{format(log.timestamp, 'MMM d, HH:mm')}</span>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <p className="text-xs font-bold leading-tight uppercase tracking-tight">{log.activityDescription}</p>
                        {log.stepsTaken?.length > 0 && (
                          <div className="bg-white/80 p-2.5 rounded-sm text-[10px] space-y-1.5 font-mono">
                            {log.stepsTaken.map((step, i) => <div key={i} className="flex gap-2"><span className="text-primary font-black">{i + 1}.</span><span>{step}</span></div>)}
                          </div>
                        )}
                        <Badge variant="outline" className="text-[8px] h-4 uppercase font-black bg-white/50">{log.status}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      </div>
    </div>
  );
}
