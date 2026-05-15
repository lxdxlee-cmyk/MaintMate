
"use client"

import { use, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ClipboardList, Plus, History, ChevronLeft, User, FileText, Sparkles, Loader2, Clock, Wrench, Activity, Ruler } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { suggestMaintenancePrefill } from '@/ai/flows/smart-maintenance-log-prefill-flow';
import { cn } from '@/lib/utils';

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = parseInt(id);
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const asset = useLiveQuery(() => isNaN(assetId) ? undefined : db.assets.get(assetId), [assetId]);
  const logs = useLiveQuery(() => 
    isNaN(assetId) ? [] : db.logs.where('assetId').equals(assetId).reverse().sortBy('timestamp'), 
    [assetId]
  );

  const [logFormData, setLogFormData] = useState<Partial<MaintenanceLog>>({
    technician: '',
    activityDescription: '',
    stepsTaken: [],
    measurements: '',
    status: 'Ongoing',
    serviceRequestId: '',
  });

  const [stepsInput, setStepsInput] = useState('');

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
      });
      
      setLogFormData(prev => ({
        ...prev,
        measurements: result.recommendedMeasurements,
        status: result.likelyStatus as any,
      }));
      setStepsInput(result.suggestedSteps.join('\n'));
      toast({ title: "AI Assisted", description: "Technical steps and measurements suggested." });
    } catch (e) {
      toast({ title: "AI Unavailable", description: "Failed to fetch suggestions.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
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
      
      await db.logs.add({
        assetId,
        technician: logFormData.technician.trim(),
        serviceRequestId: logFormData.serviceRequestId?.trim() || asset?.currentServiceRequest || '',
        activityDescription: logFormData.activityDescription.trim(),
        stepsTaken: stepsArray,
        measurements: logFormData.measurements?.trim() || '',
        status: logFormData.status || 'Ongoing',
        timestamp: Date.now(),
      });

      // Update asset status if resolved
      if (logFormData.status === 'Resolved' && asset?.isInMaintenance) {
        await db.assets.update(assetId, { 
          isInMaintenance: false,
          historicalServiceRequests: [...(asset.historicalServiceRequests || []), asset.currentServiceRequest || ''].filter(s => s),
          currentServiceRequest: ''
        });
      }

      setIsAddLogOpen(false);
      setLogFormData({ technician: '', activityDescription: '', status: 'Ongoing' });
      setStepsInput('');
      toast({ title: "Log Recorded", description: "Entry added to technical history." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (asset === undefined) return <div className="p-20 text-center">Loading...</div>;
  if (!asset) return <div className="p-20 text-center">Not Found</div>;

  return (
    <div className="space-y-6 pb-20">
      <Link href="/assets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Inventory
      </Link>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">{asset.nomenclature}</h1>
            <p className="text-sm font-mono text-muted-foreground">SN: {asset.serialNumber}</p>
          </div>
          <Badge variant={asset.isInMaintenance ? "destructive" : "secondary"}>
            {asset.isInMaintenance ? "Deadlined" : "Fully Mission Capable"}
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
            <div className="col-span-2 pt-2 border-t">
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
            Maintenance Log
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
                    <Input 
                      placeholder="ID / Name" 
                      value={logFormData.technician}
                      onChange={(e) => setLogFormData({...logFormData, technician: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>SR# (if different)</Label>
                    <Input 
                      placeholder="Service Request #" 
                      value={logFormData.serviceRequestId}
                      onChange={(e) => setLogFormData({...logFormData, serviceRequestId: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Activity / Task Description</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleMagicFill}
                      disabled={isAiLoading || !logFormData.activityDescription?.trim()}
                      className="h-6 text-[10px] text-accent font-bold p-0"
                    >
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Technical Suggestions
                    </Button>
                  </div>
                  <Textarea 
                    placeholder="Troubleshooting primary power circuit..." 
                    className="h-20"
                    value={logFormData.activityDescription}
                    onChange={(e) => setLogFormData({...logFormData, activityDescription: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Troubleshooting Steps / Progress (one per line)</Label>
                  <Textarea 
                    placeholder="Step 1: Check fuse F1&#10;Step 2: Probe J2 connector..." 
                    className="h-32"
                    value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Measurements / Readings</Label>
                  <Input 
                    placeholder="Reading: 24.2VDC, Temp: 45C" 
                    value={logFormData.measurements}
                    onChange={(e) => setLogFormData({...logFormData, measurements: e.target.value})}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Task Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Ongoing', 'Awaiting Parts', 'Resolved', 'Deferred'].map((s) => (
                      <Badge 
                        key={s} 
                        variant={logFormData.status === s ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setLogFormData({...logFormData, status: s as any})}
                      >
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
          {logs?.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">No activities recorded.</p>
            </div>
          ) : (
            logs?.map((log) => (
              <Card key={log.id} className="border-none shadow-sm bg-white">
                <CardHeader className="p-4 bg-muted/20 pb-2 flex-row justify-between items-center space-y-0">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1.5">
                    <User className="h-3 w-3" /> {log.technician}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(log.timestamp, 'MMM d, HH:mm')}
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold">{log.activityDescription}</p>
                    <Badge variant={log.status === 'Resolved' ? 'default' : 'outline'} className="text-[9px]">
                      {log.status}
                    </Badge>
                  </div>

                  {log.stepsTaken && log.stepsTaken.length > 0 && (
                    <div className="bg-muted/30 p-2 rounded text-xs space-y-1">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5" /> Steps & Troubleshooting
                      </p>
                      {log.stepsTaken.map((step, i) => (
                        <div key={i} className="flex gap-2 text-foreground/80">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.measurements && (
                    <div className="flex items-center gap-2 text-[11px] bg-accent/5 p-2 rounded border border-accent/10">
                      <Ruler className="h-3 w-3 text-accent" />
                      <span className="font-medium text-accent-foreground">{log.measurements}</span>
                    </div>
                  )}

                  {log.serviceRequestId && (
                    <p className="text-[9px] text-muted-foreground font-mono">Reference SR: {log.serviceRequestId}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
