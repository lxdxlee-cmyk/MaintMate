
"use client"

import { use, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MaintenanceLog } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ClipboardList, Plus, History, ChevronLeft, MapPin, User, FileText, Sparkles, Loader2 } from 'lucide-react';
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

  const asset = useLiveQuery(() => db.assets.get(assetId), [assetId]);
  const logs = useLiveQuery(() => 
    db.logs.where('assetId').equals(assetId).reverse().sortBy('timestamp'), 
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
    if (!logFormData.faultObserved || !asset?.type) {
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
    if (!logFormData.faultObserved || !logFormData.technician) {
      toast({ title: "Error", description: "Technician and Fault are required.", variant: "destructive" });
      return;
    }

    try {
      await db.logs.add({
        assetId,
        technician: logFormData.technician!,
        faultObserved: logFormData.faultObserved!,
        repairActions: logFormData.repairActions || '',
        partsUsed: partsInput.split(',').map(p => p.trim()).filter(p => p !== ''),
        outcome: logFormData.outcome || 'Resolved',
        notes: logFormData.notes || '',
        timestamp: Date.now(),
      });
      setIsAddLogOpen(false);
      setLogFormData({ technician: '', faultObserved: '', repairActions: '', outcome: 'Resolved', notes: '' });
      setPartsInput('');
      toast({ title: "Success", description: "Log entry saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
    }
  };

  if (!asset) return null;

  return (
    <div className="space-y-6 pb-12">
      <Link href="/assets" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-2">
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
              <User className="h-4 w-4 shrink-0" />
              <span>Owner: {asset.owner}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              <span>{asset.notes || 'No specific notes recorded for this asset.'}</span>
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
          <Dialog open={isAddLogOpen} onOpenChange={setIsAddLogOpen}>
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
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fault">Fault Observed</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleMagicFill}
                      disabled={isAiLoading || !logFormData.faultObserved}
                      className="h-6 text-[10px] text-accent font-bold uppercase tracking-tighter hover:text-accent/80 p-0"
                    >
                      {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Magic Fill
                    </Button>
                  </div>
                  <Textarea 
                    id="fault" 
                    placeholder="Describe the issue..." 
                    className="h-20"
                    value={logFormData.faultObserved}
                    onChange={(e) => setLogFormData({...logFormData, faultObserved: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="actions">Repair Actions</Label>
                  <Textarea 
                    id="actions" 
                    placeholder="What did you do?" 
                    value={logFormData.repairActions}
                    onChange={(e) => setLogFormData({...logFormData, repairActions: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parts">Parts Used (comma separated)</Label>
                  <Input 
                    id="parts" 
                    placeholder="Filter, Seal, Bolt-X..." 
                    value={partsInput}
                    onChange={(e) => setPartsInput(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Outcome</Label>
                  <div className="flex gap-2">
                    {['Resolved', 'Deferred', 'Temporary Fix'].map((status) => (
                      <Badge 
                        key={status} 
                        variant={logFormData.outcome === status ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setLogFormData({...logFormData, outcome: status})}
                      >
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddLog} className="w-full">Save Log Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {!logs?.length ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
              <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">No logs recorded for this asset.</p>
            </div>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/50 p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-primary">{log.technician}</span>
                    <span className="text-[10px] text-muted-foreground">{format(log.timestamp, 'MMM d, yyyy')}</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Fault Observed</h4>
                    <p className="text-sm font-medium">{log.faultObserved}</p>
                  </div>
                  {log.repairActions && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Action Taken</h4>
                      <p className="text-sm">{log.repairActions}</p>
                    </div>
                  )}
                  {log.partsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.partsUsed.map((part, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Badge variant={log.outcome === 'Resolved' ? 'default' : 'outline'} className="text-[10px]">
                      {log.outcome}
                    </Badge>
                    <Link href={`/logs?id=${log.id}`} className="text-[10px] text-accent font-semibold hover:underline">
                      View Full Log
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
