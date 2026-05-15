
"use client"

import { use, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog, type EquipmentAsset, type AssetTemplate } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ChevronLeft, User, Sparkles, Loader2, Activity, Layers, Settings2, FolderOpen, FileDown } from 'lucide-react';
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
      const result = await suggestMaintenancePrefill({
        description: logFormData.activityDescription,
        nomenclature: template.nomenclature,
        components: template.components?.map(c => ({ name: c.name, measurements: c.measurements })) || []
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
      toast({ title: "Asset Updated", description: "Serialized record synchronized." });
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
      toast({ title: "Log Recorded", description: "Event attached to asset history." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (asset === undefined) return <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  if (!asset) return <div className="p-20 text-center">Serialized Asset Not Found</div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Link href="/assets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Unit Inventory
        </Link>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => exportAssetHistoryReport(asset, logs)} className="h-8 text-[9px] font-bold uppercase gap-1">
            <FileDown className="h-4 w-4" /> Export ERO
          </Button>
          <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                <Settings2 className="h-4 w-4 mr-1" /> Unit Config
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Serialized Record</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-2">
                  <Label>Serial Number</Label>
                  <Input value={editFormData.serialNumber || ''} onChange={(e) => setEditFormData({...editFormData, serialNumber: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Owner / Section</Label>
                  <Input value={editFormData.owner || ''} onChange={(e) => setEditFormData({...editFormData, owner: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label>Active SR#</Label>
                  <Input value={editFormData.currentServiceRequest || ''} onChange={(e) => setEditFormData({...editFormData, currentServiceRequest: e.target.value})} />
                </div>
                
                {template?.components && template.components.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs uppercase font-bold text-primary">Sub-Component Serials (SL-3)</Label>
                    {template.components.map((c, i) => (
                      <div key={i} className="grid gap-1">
                        <Label className="text-[10px] uppercase">{c.name}</Label>
                        <Input 
                          placeholder="Unique ID"
                          className="font-mono text-xs"
                          value={editFormData.componentSerials?.[c.name] || ''} 
                          onChange={(e) => {
                            const newSerials = { ...editFormData.componentSerials, [c.name]: e.target.value };
                            setEditFormData({...editFormData, componentSerials: newSerials});
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label>Deadlined Status</Label>
                    <p className="text-[10px] text-muted-foreground">Force set as NMC / In-Work</p>
                  </div>
                  <Switch checked={!!editFormData.isInMaintenance} onCheckedChange={(checked) => setEditFormData({...editFormData, isInMaintenance: checked})} />
                </div>
                <div className="grid gap-2">
                  <Label>Local Unit Notes</Label>
                  <Textarea value={editFormData.notes || ''} onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEditAsset} className="w-full" disabled={isUpdatingAsset}>
                  {isUpdatingAsset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">{template?.nomenclature || 'SERIALIZED UNIT'}</h1>
            <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest">SN: {asset.serialNumber}</p>
          </div>
          <Badge variant={asset.isInMaintenance ? "destructive" : "secondary"}>
            {asset.isInMaintenance ? "NMC / DEADLINED" : "FMC / READY"}
          </Badge>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Custodian</p>
              <p className="font-medium">{asset.owner}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Active SR#</p>
              <p className="font-mono">{asset.currentServiceRequest || "None"}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">NSN</p>
              <p className="font-mono">{template?.nsn || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">TAMCN</p>
              <p className="font-mono">{template?.tamcn || 'N/A'}</p>
            </div>
            {template?.components && template.components.length > 0 && (
              <div className="col-span-2 pt-2 border-t mt-1">
                <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-2 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Technical Doctrine (PUBS Specs)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {template.components.map((c, i) => (
                    <div key={i} className="bg-muted/30 p-2 rounded">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="font-bold text-[10px] truncate">{c.name}</p>
                        {asset.componentSerials?.[c.name] && (
                          <span className="text-[8px] font-mono bg-primary/10 px-1 rounded border border-primary/20">
                            S/N: {asset.componentSerials[c.name]}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[9px] truncate">{c.measurements}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2 pt-2 border-t mt-1">
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Unit Remarks</p>
              <p className="text-foreground">{asset.notes || "No additional records."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            ERO / Event History
          </h2>
          <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1" /> Log Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Technical Journal Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Maintainer</Label>
                    <Input placeholder="Rank / Name" value={logFormData.technician || ''} onChange={(e) => setLogFormData({...logFormData, technician: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Task SR#</Label>
                    <Input placeholder="Service Request" value={logFormData.serviceRequestId || ''} onChange={(e) => setLogFormData({...logFormData, serviceRequestId: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Activity Description</Label>
                    <Button variant="ghost" size="sm" onClick={handleMagicFill} disabled={isAiLoading || !logFormData.activityDescription?.trim()} className="h-6 text-[10px] text-accent font-bold p-0">
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Apply Doctrine (AI)
                    </Button>
                  </div>
                  <Textarea placeholder="Fault analysis or repair details..." className="h-20" value={logFormData.activityDescription || ''} onChange={(e) => setLogFormData({...logFormData, activityDescription: e.target.value})} />
                </div>

                <div className="grid gap-2">
                  <Label>Repair Actions & Specs (one per line)</Label>
                  <Textarea placeholder="Step 1: Analyzed power grid...&#10;Step 2: Measurement at J3: 12.1VDC..." className="h-40" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">AI pre-fill leverages specifications defined in the PUBS template.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Job Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Ongoing', 'Awaiting Parts', 'Resolved'].map((s) => (
                      <Badge key={s} variant={logFormData.status === s ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setLogFormData({...logFormData, status: s as any})}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddLog} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Commit Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-primary/20">
              <p className="text-sm text-muted-foreground italic">No historical events recorded for this unit.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4" defaultValue={asset.currentServiceRequest || Object.keys(groupedLogs)[0]}>
              {Object.entries(groupedLogs).map(([srId, srLogs]) => (
                <AccordionItem key={srId} value={srId} className="border-none">
                  <AccordionTrigger className="bg-white rounded-lg shadow-sm px-4 py-3 hover:no-underline hover:bg-muted/5 transition-all">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">SR: {srId}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                          {srLogs.length} Records • Latest: {format(srLogs[0].timestamp, 'MMM d')}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-3 space-y-3">
                    {srLogs.map((log) => (
                      <Card key={log.id} className="border-none shadow-sm bg-white/60 ml-4">
                        <CardHeader className="p-3 bg-muted/20 pb-2 flex-row justify-between items-center space-y-0">
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1.5">
                            <User className="h-3 w-3" /> {log.technician}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(log.timestamp, 'MMM d, HH:mm')}
                          </span>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold leading-tight">{log.activityDescription}</p>
                            <Badge variant={log.status === 'Resolved' ? 'default' : 'outline'} className="text-[8px] h-4">
                              {log.status}
                            </Badge>
                          </div>
                          {log.stepsTaken && log.stepsTaken.length > 0 && (
                            <div className="bg-muted/30 p-2 rounded text-[11px] space-y-1">
                              {log.stepsTaken.map((step, i) => (
                                <div key={i} className="flex gap-2">
                                  <span className="text-muted-foreground font-mono">{i + 1}.</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
