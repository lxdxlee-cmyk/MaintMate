
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset, type AssetTemplate } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, Loader2, BookOpen, AlertTriangle, Target, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { exportInventoryReport } from '@/lib/pdf-export';

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const templates = useLiveQuery(() => db.templates.toArray());

  const assetsData = useLiveQuery(async () => {
    const allAssets = await db.assets.toArray();
    const enriched = await Promise.all(allAssets.map(async a => {
      const template = await db.templates.get(a.templateId);
      return { ...a, template };
    }));

    if (!searchTerm) return enriched;
    const term = searchTerm.toLowerCase();
    return enriched.filter(item => 
      (item.template?.nomenclature || '').toLowerCase().includes(term) || 
      (item.serialNumber || '').toLowerCase().includes(term) ||
      (item.template?.nsn || '').toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const [formData, setFormData] = useState<Partial<EquipmentAsset>>({
    templateId: undefined,
    serialNumber: '',
    owner: '',
    isInMaintenance: false,
    currentServiceRequest: '',
    notes: '',
    componentSerials: {},
  });

  const handleAddAsset = async () => {
    if (!formData.templateId || !formData.serialNumber?.trim()) {
      toast({ title: "Validation Error", description: "PUBS Reference and Serial Number are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await db.assets.add({
        templateId: formData.templateId!,
        serialNumber: formData.serialNumber.trim(),
        owner: (formData.owner || '').trim() || 'Unassigned',
        isInMaintenance: !!formData.isInMaintenance,
        currentServiceRequest: (formData.currentServiceRequest || '').trim(),
        historicalServiceRequests: [],
        notes: (formData.notes || '').trim(),
        componentSerials: formData.componentSerials || {},
        createdAt: Date.now(),
      });
      
      setIsAddDialogOpen(false);
      setFormData({ templateId: undefined, serialNumber: '', owner: '', isInMaintenance: false, currentServiceRequest: '', notes: '', componentSerials: {} });
      toast({ title: "Asset Registered", description: "Equipment added to inventory." });
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message || "Failed to save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTemplate = templates?.find(t => t.id === formData.templateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-2 border-primary pb-2">
        <h1 className="text-xl font-black text-primary tracking-tighter uppercase flex items-center gap-2">
          <Package className="h-6 w-6" />
          Unit Gear
        </h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => assetsData && exportInventoryReport(assetsData as any)} className="h-7 text-[9px] font-bold uppercase gap-1 px-2 border-2 border-dashed">
            <FileDown className="h-3 w-3" /> PDF
          </Button>
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
                  <Select onValueChange={(v) => setFormData({...formData, templateId: parseInt(v), componentSerials: {}})}>
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Identify Doctrine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map(t => (
                        <SelectItem key={t.id} value={t.id!.toString()} className="text-xs">{t.nomenclature}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground mt-1 italic">Serialized assets must reference a technical knowledge base.</p>
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
                    <Label className="text-[10px] uppercase font-bold">Owner / Section</Label>
                    <Input 
                      value={formData.owner || ''}
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                      disabled={isSaving}
                      className="rounded-none"
                    />
                  </div>
                </div>

                {selectedTemplate?.components && selectedTemplate.components.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <Separator />
                    <Label className="text-[10px] uppercase font-bold text-primary">Sub-Component Serials (SL-3)</Label>
                    {selectedTemplate.components.map((c, i) => (
                      <div key={i} className="grid gap-1">
                        <Label className="text-[9px] uppercase">{c.name}</Label>
                        <Input 
                          placeholder="Unique Serial"
                          className="rounded-none font-mono text-xs h-8"
                          value={formData.componentSerials?.[c.name] || ''} 
                          onChange={(e) => {
                            const newSerials = { ...formData.componentSerials, [c.name]: e.target.value };
                            setFormData({...formData, componentSerials: newSerials});
                          }} 
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 border-2 border-dashed border-border">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-bold">Readiness</Label>
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
                <Button onClick={handleAddAsset} className="w-full rounded-none font-black uppercase tracking-widest bg-primary" disabled={isSaving || !formData.templateId}>
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
          placeholder="SEARCH SERIAL, NOMEN, OR NSN..." 
          className="pl-10 rounded-none border-2 border-border font-mono text-xs uppercase"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        {!assetsData ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : assetsData.length === 0 ? (
          <div className="text-center py-20 bg-white border-2 border-dashed border-border">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-8">No matching gear found in serialized inventory.</p>
          </div>
        ) : (
          assetsData.map((item) => (
            <Link key={item.id} href={`/assets/${item.id}`}>
              <Card className="tactical-card hover:bg-muted/50 transition-all cursor-pointer overflow-hidden bg-white">
                <CardContent className="p-3 flex items-center">
                  <div className={cn(
                    "h-10 w-10 flex items-center justify-center mr-4 border-2 shrink-0",
                    item.isInMaintenance ? "border-destructive text-destructive bg-destructive/5" : "border-primary text-primary bg-primary/5"
                  )}>
                    {item.isInMaintenance ? <AlertTriangle className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xs truncate uppercase tracking-tighter">
                      {item.template?.nomenclature || 'UNCATEGORIZED'}
                    </h3>
                    <p className="text-[9px] text-muted-foreground truncate font-mono uppercase font-bold">
                      S/N: {item.serialNumber} | TAM: {item.template?.tamcn || 'N/A'}
                    </p>
                  </div>
                  <Badge className={cn(
                    "text-[8px] h-4 rounded-none px-1 font-black uppercase tracking-tighter",
                    item.isInMaintenance ? "bg-destructive" : "bg-primary"
                  )}>
                    {item.isInMaintenance ? "Deadlined" : "Ready"}
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
