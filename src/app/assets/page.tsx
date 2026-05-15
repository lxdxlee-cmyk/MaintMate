
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, MoreVertical, Loader2, Wrench, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const assets = useLiveQuery(() => {
    if (!searchTerm) return db.assets.toArray();
    const term = searchTerm.toLowerCase();
    return db.assets
      .filter(asset => 
        (asset.nomenclature || '').toLowerCase().includes(term) || 
        (asset.serialNumber || '').toLowerCase().includes(term)
      )
      .toArray();
  }, [searchTerm]);

  const [formData, setFormData] = useState<Partial<EquipmentAsset>>({
    nomenclature: '',
    serialNumber: '',
    owner: '',
    isInMaintenance: false,
    currentServiceRequest: '',
    notes: '',
  });

  const handleAddAsset = async () => {
    if (!formData.nomenclature?.trim() || !formData.serialNumber?.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Nomenclature and Serial Number are required.", 
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);
    try {
      await db.assets.add({
        nomenclature: formData.nomenclature.trim(),
        serialNumber: formData.serialNumber.trim(),
        owner: formData.owner?.trim() || 'Unassigned',
        isInMaintenance: formData.isInMaintenance || false,
        currentServiceRequest: formData.currentServiceRequest?.trim() || '',
        historicalServiceRequests: [],
        notes: formData.notes?.trim() || '',
        createdAt: Date.now(),
      });
      
      setIsAddDialogOpen(false);
      setFormData({ 
        nomenclature: '', 
        serialNumber: '', 
        owner: '', 
        isInMaintenance: false, 
        currentServiceRequest: '',
        notes: '' 
      });
      toast({ title: "Asset Registered", description: "Equipment added to inventory." });
    } catch (error: any) {
      toast({ 
        title: "Registration Failed", 
        description: error.message || "Failed to save to local storage.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Technical Inventory</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!isSaving) setIsAddDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              <Plus className="h-4 w-4 mr-1" /> New Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Register Equipment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label htmlFor="nomenclature">Nomenclature</Label>
                <Input 
                  id="nomenclature" 
                  placeholder="Official Item Name" 
                  value={formData.nomenclature || ''}
                  onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="serial">Serial Number</Label>
                <Input 
                  id="serial" 
                  placeholder="Manufacturer Serial #" 
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Responsible Section/Owner</Label>
                <Input 
                  id="owner" 
                  placeholder="Custodian name" 
                  value={formData.owner || ''}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sr">Current Service Request (SR#)</Label>
                <Input 
                  id="sr" 
                  placeholder="Optional active SR#" 
                  value={formData.currentServiceRequest || ''}
                  onChange={(e) => setFormData({...formData, currentServiceRequest: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>In Maintenance Status</Label>
                  <p className="text-xs text-muted-foreground">Mark as active fault/repair</p>
                </div>
                <Switch 
                  checked={!!formData.isInMaintenance}
                  onCheckedChange={(checked) => setFormData({...formData, isInMaintenance: checked})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Initial condition..." 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  disabled={isSaving}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleAddAsset} 
                className="w-full" 
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Asset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search Nomenclature or Serial #..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {assets === undefined ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No equipment found.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`}>
              <Card className="hover:shadow-md transition-shadow border-none shadow-sm cursor-pointer overflow-hidden group bg-white">
                <CardContent className="p-4 flex items-center">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center mr-4 transition-colors",
                    asset.isInMaintenance ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary"
                  )}>
                    {asset.isInMaintenance ? <Wrench className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{asset.nomenclature}</h3>
                    <p className="text-xs text-muted-foreground truncate font-mono">SN: {asset.serialNumber}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={asset.isInMaintenance ? "destructive" : "secondary"} className="text-[10px]">
                      {asset.isInMaintenance ? "Deadlined" : "Ready"}
                    </Badge>
                    {asset.currentServiceRequest && (
                      <span className="text-[9px] font-mono text-muted-foreground">SR: {asset.currentServiceRequest}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
