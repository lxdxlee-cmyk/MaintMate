
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, MoreVertical, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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
        (asset.type || '').toLowerCase().includes(term) || 
        (asset.identifier || '').toLowerCase().includes(term)
      )
      .toArray();
  }, [searchTerm]);

  const [formData, setFormData] = useState<Partial<EquipmentAsset>>({
    type: '',
    identifier: '',
    owner: '',
    notes: '',
  });

  const handleAddAsset = async () => {
    if (!formData.type?.trim() || !formData.identifier?.trim()) {
      toast({ 
        title: "Validation Error", 
        description: "Equipment type and serial identifier are required.", 
        variant: "destructive" 
      });
      return;
    }

    setIsSaving(true);
    try {
      await db.assets.add({
        type: formData.type.trim(),
        identifier: formData.identifier.trim(),
        owner: formData.owner?.trim() || 'Unassigned',
        notes: formData.notes?.trim() || '',
        createdAt: Date.now(),
      });
      
      setIsAddDialogOpen(false);
      setFormData({ type: '', identifier: '', owner: '', notes: '' });
      toast({ title: "Asset Registered", description: "The new equipment has been added to your inventory." });
    } catch (error: any) {
      console.error("Failed to add asset:", error);
      toast({ 
        title: "Registration Failed", 
        description: error.message || "An error occurred while saving the asset to local storage.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Equipment Assets</h1>
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
              <DialogTitle>Register New Equipment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Equipment Type</Label>
                <Input 
                  id="type" 
                  placeholder="e.g. Lathe, Forklift, Diesel Generator" 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identifier">Serial / Reference ID</Label>
                <Input 
                  id="identifier" 
                  placeholder="e.g. SN-99201" 
                  value={formData.identifier}
                  onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Custodian / Owner</Label>
                <Input 
                  id="owner" 
                  placeholder="e.g. Maintenance Section A" 
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  disabled={isSaving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Initial Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Physical condition, location, or quirks..." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="min-h-[100px]"
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
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering...
                  </>
                ) : (
                  "Register Asset"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by type or SN..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {assets === undefined ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border/60">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">
              {searchTerm ? "No matching equipment found." : "No equipment registered yet."}
            </p>
          </div>
        ) : (
          assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`}>
              <Card className="hover:shadow-md transition-shadow border-none shadow-sm cursor-pointer overflow-hidden group bg-white">
                <CardContent className="p-4 flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{asset.type}</h3>
                    <p className="text-xs text-muted-foreground truncate font-mono">{asset.identifier}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] ml-2 font-medium bg-muted">
                    {asset.owner}
                  </Badge>
                  <MoreVertical className="h-4 w-4 text-muted-foreground/40 ml-2" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
