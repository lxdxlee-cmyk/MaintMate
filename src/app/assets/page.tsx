"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset, type AssetTemplate } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Loader2, Wrench, ShieldCheck, BookOpen, AlertTriangle, Target } from 'lucide-react';
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
      <div className="flex items-center justify-between border-b-2 border-primary pb-2">
        <h1 className="text-xl font-black text-primary tracking-tighter uppercase flex items-center gap-2">
          <Package className="h-6 w-6" />
          Unit Inventory
        </h1>
        <div className="flex gap-1">
          <Link href="/templates">
            <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-bold px-2 rounded-none">
              <BookOpen className="h-3 w-3 mr-1" /> PUBS
            </Button>
          </Link>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-[10px] uppercase font-black px-2 rounded-none bg-accent hover:bg-accent/90">
                <Plus className="h-3 w-3 mr-1" /> Add Gear
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-2 border-primary">
              <DialogHeader>
                <DialogTitle className="uppercase tracking-widest font-black text-primary">Equipment Induction</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Select Publication (PUBS)</Label>
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Pre-fill from PUBS..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map(t => (
                        <SelectItem key={t.id} value={t.id!.toString()} className="text-xs">{t.nomenclature}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold">Nomenclature</Label>
                  <Input 
                    value={formData.nomenclature || ''}
                    onChange={(e) => setFormData({...formData, nomenclature: e.target.value})}
                    disabled={isSaving}
                    className="rounded-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1">
                    <Label className="text-[10px] uppercase font-bold">Serial Number</Label>
                    <Input 
                      value={formData.serialNumber || ''}
                      onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                      disabled={isSaving}
                      className="rounded-none font-mono uppercase"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-[10px] uppercase font-bold">NSN</Label>
                    <Input 
                      value={formData.nsn || ''}
                      onChange={(e) => setFormData({...formData, nsn: e.target.value})}
                      disabled={isSaving}
                      className="rounded-none font-mono"
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold">TAMCN</Label>
                  <Input 
                    value={formData.tamcn || ''}
                    onChange={(e) => setFormData({...formData, tamcn: e.target.value})}
                    disabled={isSaving}
                    className="rounded-none font-mono uppercase"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] uppercase font-bold">Owner / Section</Label>
                  <Input 
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                    disabled={isSaving}
                    className="rounded-none"
                  />
                </div>
                <div className="flex items-center justify-between p-3 border-2 border-dashed border-border">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-bold">Initial Status</Label>
                    <p className="text-[9px] text-muted-foreground font-mono uppercase">Induct as Deadlined / NMC</p>
                  </div>
                  <Switch 
                    checked={!!formData.isInMaintenance}
                    onCheckedChange={(checked) => setFormData({...formData, isInMaintenance: checked})}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddAsset} className="w-full rounded-none font-black uppercase tracking-widest bg-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirm Induction"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="SEARCH NOMEN, SERIAL, NSN..." 
          className="pl-10 rounded-none border-2 border-border font-mono text-xs uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        {!assets ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-border">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No matching equipment found in technical inventory.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`}>
              <Card className="tactical-card hover:bg-muted/50 transition-all cursor-pointer overflow-hidden bg-white">
                <CardContent className="p-3 flex items-center">
                  <div className={cn(
                    "h-10 w-10 flex items-center justify-center mr-4 border-2 shrink-0",
                    asset.isInMaintenance ? "border-destructive text-destructive bg-destructive/5" : "border-primary text-primary bg-primary/5"
                  )}>
                    {asset.isInMaintenance ? <AlertTriangle className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xs truncate uppercase tracking-tighter">{asset.nomenclature}</h3>
                    <p className="text-[9px] text-muted-foreground truncate font-mono uppercase font-bold">
                      S/N: {asset.serialNumber} | TAM: {asset.tamcn || 'N/A'}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[8px] h-4 rounded-none px-1 font-black uppercase tracking-tighter",
                    asset.isInMaintenance ? "bg-destructive" : "bg-primary"
                  )}>
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
