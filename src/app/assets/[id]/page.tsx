
"use client"

import { use, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ClipboardList, Plus, History, ChevronLeft, User, FileText, Sparkles, Loader2, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { suggestMaintenancePrefill } from '@/ai/flows/smart-maintenance-log-prefill-flow';

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
    faultObserved: '',
    repairActions: '',
    partsUsed: [],
    outcome: 'Resolved',
    notes: '',
  });

  const [partsInput, setPartsInput] = useState('');

  const handleMagicFill = async () => {
    if (!logFormData.faultObserved?.trim() || !asset?.type) {
      toast({ title: "Details needed", description: "Please enter a fault description first." });
      return;
    }
    
    setIsAiLoading(true);
    try {
      const result = await suggestMaintenancePrefill({
        faultDescription: logFormData.faultObserved,
        equipmentType: asset.type,
      });
      
      setLogFormData(prev => ({
        ...prev,
        repairActions: result.repairActions.join(', '),
        partsUsed: result.partsUsed,
        notes: result.outcomeDescription,
      }));
      setPartsInput(result.partsUsed.join(', '));
      toast({ title: "Prefilled!", description: "AI suggested common actions and parts." });
    } catch (e) {
      toast({ title: "AI Unavailable", description: "Failed to fetch suggestions.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddLog = async () => {
    if (!logFormData.faultObserved?.trim() || !logFormData.technician?.trim()) {
      toast({ title: "Validation Error", description: "Technician name and observed fault are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await db.logs.add({
        assetId,
        technician: logFormData.technician.trim(),
        faultObserved: logFormData.faultObserved.trim(),
        repairActions: logFormData.repairActions?.trim() || '',
        partsUsed: partsInput.split(',').map(p => p.trim()).filter(p => p !== ''),
        outcome: logFormData.outcome || 'Resolved',
        notes: logFormData.notes?.trim() || '',
        timestamp: Date.now(),
      });
      setIsAddLogOpen(false);
      setLogFormData({ technician: '', faultObserved: '', repairActions: '', outcome: 'Resolved', notes: '' });
      setPartsInput('');
      toast({ title: "Success", description: "Maintenance event has been logged." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save the log entry.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isNaN(assetId)) {
    return <div className="p-8 text-center text-muted-foreground">Invalid Asset Identifier</div>;
  }

  if (asset === undefined) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm">Retrieving asset data...</p>
    </div>
  );

  if (asset === null) return (
    <div className="p-8 text-center text-muted-foreground space-y-4">
      <p>Asset not found in local journal.</p>
      <Link href="/assets">
        <Button variant="outline">Back to Assets</Button>
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <Link href="/assets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2 transition-colors">
        <ChevronLeft className="h-4 w-4 mr-1" /> Back to Assets
      </Link>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">{asset.type}</h1>
            <p className="text-sm font-mono text-muted-foreground">{asset.identifier}</p>
          </div>
          <Badge className="bg-accent text-accent-foreground">{asset.owner}</Badge>
        </div>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <User className="h-4 w-4 shrink-0 text-primary/60" />
              <span>Owner: {asset.owner}</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
              <span className="leading-relaxed">{asset.notes || 'No specific notes recorded for this asset.'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Maintenance History
          </h2>
          <Dialog open={isAddLogOpen} onOpenChange={(open) => {
            if (!isSaving) setIsAddLogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 gap-1">
                <Plus className="h-4 w-4" /> Log Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Maintenance Log</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tech">Technician</Label>
                  <Input 
                    id="tech" 
                    placeholder="Your name/identifier" 
                    value={logFormData.technician}
                    onChange={(e) => setLogFormData({...logFormData, technician: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fault">Fault Observed</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleMagicFill}
                      disabled={isAiLoading || !logFormData.faultObserved?.trim() || isSaving}
                      className="h-6 text-[10px] text-accent font-bold uppercase tracking-tighter hover:text-accent/80 p-0"
                    >
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Magic Fill
                    </Button>
                  </div>
                  <Textarea 
                    id="fault" 
                    placeholder="Describe the issue..." 
                    className="h-24"
                    value={logFormData.faultObserved}
                    onChange={(e) => setLogFormData({...logFormData, faultObserved: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="actions">Repair Actions</Label>
                  <Textarea 
                    id="actions" 
                    placeholder="What did you do?" 
                    value={logFormData.repairActions}
                    onChange={(e) => setLogFormData({...logFormData, repairActions: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parts">Parts Used (comma separated)</Label>
                  <Input 
                    id="parts" 
                    placeholder="Filter, Seal, Bolt-X..." 
                    value={partsInput}
                    onChange={(e) => setPartsInput(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Outcome</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Resolved', 'Deferred', 'Temporary Fix'].map((status) => (
                      <Badge 
                        key={status} 
                        variant={logFormData.outcome === status ? 'default' : 'outline'}
                        className="cursor-pointer transition-all"
                        onClick={() => !isSaving && setLogFormData({...logFormData, outcome: status})}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddLog} 
                  className="w-full" 
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Log Entry"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {logs === undefined ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground opacity-40" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-border/60">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">No logs recorded for this asset.</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-muted/30 p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {log.technician}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(log.timestamp, 'MMM d, yyyy')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Fault Observed</h4>
                    <p className="text-sm font-medium leading-relaxed">{log.faultObserved}</p>
                  </div>
                  {log.repairActions && (
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Action Taken</h4>
                      <p className="text-sm leading-relaxed">{log.repairActions}</p>
                    </div>
                  )}
                  {log.partsUsed && log.partsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {log.partsUsed.map((part, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal px-2 py-0 bg-secondary/50">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <Badge 
                      variant={log.outcome === 'Resolved' ? 'default' : 'outline'} 
                      className={cn("text-[10px]", log.outcome !== 'Resolved' && "text-muted-foreground")}
                    >
                      {log.outcome}
                    </Badge>
                    <Link href={`/logs?id=${log.id}`} className="text-[10px] text-accent font-bold hover:underline">
                      View Log Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
