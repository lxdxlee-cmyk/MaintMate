
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EquipmentAsset } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Package, MoreVertical, PenSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const assets = useLiveQuery(() => {
    if (!searchTerm) return db.assets.toArray();
    return db.assets
      .filter(asset => 
        asset.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
        asset.identifier.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (!formData.type || !formData.identifier) {
      toast({ title: "Error", description: "Type and Identifier are required.", variant: "destructive" });
      return;
    }

    try {
      await db.assets.add({
        type: formData.type!,
        identifier: formData.identifier!,
        owner: formData.owner || 'Unassigned',
        notes: formData.notes || '',
        createdAt: Date.now(),
      });
      setIsAddDialogOpen(false);
      setFormData({ type: '', identifier: '', owner: '', notes: '' });
      toast({ title: "Success", description: "Asset registered successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save asset.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Equipment Assets</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identifier">Serial / Reference ID</Label>
                <Input 
                  id="identifier" 
                  placeholder="e.g. SN-99201" 
                  value={formData.identifier}
                  onChange={(e) => setFormData({...formData, identifier: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Custodian / Owner</Label>
                <Input 
                  id="owner" 
                  placeholder="e.g. Maintenance Section A" 
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Initial Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Physical condition, location, or quirks..." 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddAsset} className="w-full">Register Asset</Button>
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
        {!assets?.length ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">No equipment found.</p>
          </div>
        ) : (
          assets.map((asset) => (
            <Link key={asset.id} href={`/assets/${asset.id}`}>
              <Card className="hover:shadow-md transition-shadow border-none shadow-sm cursor-pointer overflow-hidden group">
                <CardContent className="p-4 flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{asset.type}</h3>
                    <p className="text-xs text-muted-foreground truncate">{asset.identifier}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] ml-2 font-mono">
                    {asset.owner}
                  </Badge>
                  <MoreVertical className="h-4 w-4 text-muted-foreground ml-2" />
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
