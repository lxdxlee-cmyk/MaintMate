
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset, type AssetTemplate } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Loader2, Wrench, ShieldCheck, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        (asset.serialNumber || '').toLowerCase().includes(term) ||
        (asset.nsn || '').toLowerCase().includes(term)
      )
      .toArray();
  }, [searchTerm]);

  const templates = useLiveQuery(() => db.templates.toArray());

  const [formData, setFormData] = useState<Partial<EquipmentAsset>>({
    templateId: undefined,
    nomenclature: '',
    serialNumber: '',
    nsn: '',
    tamcn: '',
    owner: '',
    isInMaintenance: false,
    currentServiceRequest: '',
    notes: '',
  });

  const handleTemplateSelect = (id: string) => {
    const template = templates?.find(t => t.id === parseInt(id));
    if (template) {
      setFormData({
        ...formData,
        templateId: template.id,
        nomenclature: template.nomenclature,
        nsn: template.nsn,
        tamcn: template.tamcn,
      });
    }
  };

  const handleAddAsset = async () => {
    if (!formData.nomenclature?.trim() || !formData.serialNumber?.trim()) {
      toast({ title: "Validation Error", description: "Nomenclature and Serial Number are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await db.assets.add({
        templateId: formData.templateId,
        nomenclature: formData.nomenclature.trim(),
        serialNumber: formData.serialNumber.trim(),
        nsn: (formData.nsn || '').trim(),
        tamcn: (formData.tamcn || '').trim(),
        owner: (formData.owner || '').trim() || 'Unassigned',
        isInMaintenance: !!formData.isInMaintenance,
        currentServiceRequest: (formData.currentServiceRequest || '').trim(),
        historicalServiceRequests: [],
        notes: (formData.notes || '').trim(),
        createdAt: Date.now(),
      });
      
      setIsAddDialogOpen(false);
      setFormData({ nomenclature: '', serialNumber: '', nsn: '', tamcn: '', owner: '', isInMaintenance: false, currentServiceRequest: '', notes: '' });
      toast({ title: "Asset Registered", description: "Equipment added to inventory." });
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Failed to save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Technical Inventory</h1>
        <div className="flex gap-2">
          <Link href="/templates">
            <Button size="sm" variant="outline">
              <BookOpen className="h-4 w-4 mr-1" /> Templates
            </Button>
          </Link>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                  <Label>Pick Template (Optional)</Label>
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template to pre-fill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map(t => (
                        <SelectItem key={t.id} value={t.id!.toString()}>{t.nomenclature}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Nomenclature</Label>
                  <Input 
                    value={formData.nomenclature || ''}
                    onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Serial Number</Label>
                    <Input 
                      value={formData.serialNumber || ''}
                      onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>NSN</Label>
                    <Input 
                      value={formData.nsn || ''}
                      onChange={(e) => setFormData({...formData, nsn: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>TAMCN</Label>
                  <Input 
                    value={formData.tamcn || ''}
                    onChange={(e) => setFormData({...formData, tamcn: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Owner / Section</Label>
                  <Input 
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Deadlined Status</Label>
                    <p className="text-xs text-muted-foreground">Mark as active fault</p>
                  </div>
                  <Switch 
                    checked={!!formData.isInMaintenance}
                    onCheckedChange={(checked) => setFormData({...formData, isInMaintenance: checked})}
                    disabled={isSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Initial Notes</Label>
                  <Textarea 
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddAsset} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Asset"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search Nomenclature, Serial, or NSN..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {!assets ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No equipment found.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`}>
              <Card className="hover:shadow-md transition-shadow border-none shadow-sm cursor-pointer overflow-hidden bg-white">
                <CardContent className="p-4 flex items-center">
                  <div className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center mr-4",
                    asset.isInMaintenance ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary"
                  )}>
                    {asset.isInMaintenance ? <Wrench className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{asset.nomenclature}</h3>
                    <p className="text-[10px] text-muted-foreground truncate font-mono">SN: {asset.serialNumber} | TAMCN: {asset.tamcn || 'N/A'}</p>
                  </div>
                  <Badge variant={asset.isInMaintenance ? "destructive" : "secondary"} className="text-[10px]">
                    {asset.isInMaintenance ? "Deadlined" : "Ready"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
