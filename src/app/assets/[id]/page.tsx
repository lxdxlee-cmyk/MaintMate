
"use client"

import { use, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog, type EquipmentAsset, type TemplateComponent } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Plus, History, ChevronLeft, User, FileText, Sparkles, Loader2, Clock, Wrench, Activity, Ruler, Settings2, FolderOpen, Layers } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  const template = useLiveQuery(() => 
    asset?.templateId ? db.templates.get(asset.templateId) : undefined, 
    [asset?.templateId]
  );

  const groupedLogs = useMemo(() => {
    if (!logs) return {};
    return logs.reduce((acc, log) => {
      const sr = log.serviceRequestId || 'Unassigned / General';
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
    nomenclature: '',
    serialNumber: '',
    owner: '',
    isInMaintenance: false,
    currentServiceRequest: '',
    notes: '',
  });

  useEffect(() => {
    if (asset && isEditAssetOpen) {
      setEditFormData({
        nomenclature: asset.nomenclature || '',
        serialNumber: asset.serialNumber || '',
        owner: asset.owner || '',
        isInMaintenance: !!asset.isInMaintenance,
        currentServiceRequest: asset.currentServiceRequest || '',
        notes: asset.notes || '',
      });
    }
  }, [asset, isEditAssetOpen]);

  useEffect(() => {
    if (asset?.currentServiceRequest && isAddLogOpen && !logFormData.serviceRequestId) {
      setLogFormData(prev => ({ ...prev, serviceRequestId: asset.currentServiceRequest }));
    }
  }, [asset, isAddLogOpen, logFormData.serviceRequestId]);

  const handleMagicFill = async () => {
    if (!logFormData.activityDescription?.trim() || !asset?.nomenclature) {
      toast({ title: "Details needed", description: "Enter a task description first." });
      return;
    }
    
    setIsAiLoading(true);
    try {
      const result = await suggestMaintenancePrefill({
        description: logFormData.activityDescription,
        nomenclature: asset.nomenclature,
        components: template?.components?.map(c => ({ name: c.name, measurements: c.measurements })) || []
      });
      
      setLogFormData(prev => ({
        ...prev,
        status: result.likelyStatus as any,
      }));
      setStepsInput(result.suggestedSteps.join('\n'));
      toast({ title: "AI Assisted", description: "Suggested steps with measurements." });
    } catch (e) {
      toast({ title: "AI Unavailable", description: "Failed to fetch suggestions.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEditAsset = async () => {
    if (!editFormData.nomenclature?.trim() || !editFormData.serialNumber?.trim()) {
      toast({ title: "Required Fields", description: "Nomenclature and Serial Number are required.", variant: "destructive" });
      return;
    }

    setIsUpdatingAsset(true);
    try {
      await db.assets.update(assetId, {
        nomenclature: editFormData.nomenclature.trim(),
        serialNumber: editFormData.serialNumber.trim(),
        owner: editFormData.owner?.trim() || 'Unassigned',
        isInMaintenance: !!editFormData.isInMaintenance,
        currentServiceRequest: editFormData.currentServiceRequest?.trim() || '',
        notes: editFormData.notes?.trim() || '',
      });
      setIsEditAssetOpen(false);
      toast({ title: "Asset Updated", description: "Records synchronized." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Database error.", variant: "destructive" });
    } finally {
      setIsUpdatingAsset(false);
    }
  };

  const handleAddLog = async () => {
    if (!logFormData.activityDescription?.trim() || !logFormData.technician?.trim()) {
      toast({ title: "Validation Error", description: "Technician and description required.", variant: "destructive" });
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
      toast({ title: "Log Recorded", description: "Entry added to history." });
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
        <Link href="/assets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Inventory
        </Link>
        
        <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
              <Settings2 className="h-4 w-4 mr-1" /> Edit Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Equipment Details</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label>Nomenclature</Label>
                <Input value={editFormData.nomenclature || ''} onChange={(e) => setEditFormData({...editFormData, nomenclature: e.target.value})} />
              </div>
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
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label>Maintenance Status</Label>
                  <p className="text-[10px] text-muted-foreground">Set as Deadlined / In-Work</p>
                </div>
                <Switch checked={!!editFormData.isInMaintenance} onCheckedChange={(checked) => setEditFormData({...editFormData, isInMaintenance: checked})} />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
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

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">{asset.nomenclature}</h1>
            <p className="text-sm font-mono text-muted-foreground">SN: {asset.serialNumber}</p>
          </div>
          <Badge variant={asset.isInMaintenance ? "destructive" : "secondary"}>
            {asset.isInMaintenance ? "Deadlined" : "Ready"}
          </Badge>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Owner / Custodian</p>
              <p className="font-medium">{asset.owner}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Active SR#</p>
              <p className="font-mono">{asset.currentServiceRequest || "None"}</p>
            </div>
            {template?.components && template.components.length > 0 && (
              <div className="col-span-2 pt-2 border-t mt-1">
                <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-2 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Technical Specs
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {template.components.map((c, i) => (
                    <div key={i} className="bg-muted/30 p-2 rounded">
                      <p className="font-bold text-[10px] truncate">{c.name}</p>
                      <p className="text-muted-foreground text-[9px] truncate">{c.measurements}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2 pt-2 border-t mt-1">
              <p className="text-muted-foreground uppercase font-bold tracking-tighter mb-1">Notes</p>
              <p className="text-foreground">{asset.notes || "No additional records."}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            History
          </h2>
          <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-4 w-4 mr-1" /> Log Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Technical Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Technician</Label>
                    <Input placeholder="ID / Name" value={logFormData.technician || ''} onChange={(e) => setLogFormData({...logFormData, technician: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>SR#</Label>
                    <Input placeholder="Current SR#" value={logFormData.serviceRequestId || ''} onChange={(e) => setLogFormData({...logFormData, serviceRequestId: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Activity / Task Description</Label>
                    <Button variant="ghost" size="sm" onClick={handleMagicFill} disabled={isAiLoading || !logFormData.activityDescription?.trim()} className="h-6 text-[10px] text-accent font-bold p-0">
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Use AI Logic
                    </Button>
                  </div>
                  <Textarea placeholder="E.g. Troubleshooting primary power..." className="h-20" value={logFormData.activityDescription || ''} onChange={(e) => setLogFormData({...logFormData, activityDescription: e.target.value})} />
                </div>

                <div className="grid gap-2">
                  <Label>Steps & Measurements (one per line)</Label>
                  <Textarea placeholder="Step 1: Check fuse...&#10;Step 2: Voltage at J1: 24.2V..." className="h-40" value={stepsInput} onChange={(e) => setStepsInput(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">AI pre-fill will include measurements from your template components.</p>
                </div>

                <div className="grid gap-2">
                  <Label>Task Status</Label>
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
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Entry"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {Object.keys(groupedLogs).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">No activities recorded.</p>
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
                          {srLogs.length} Entries • Last update {format(srLogs[0].timestamp, 'MMM d')}
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
