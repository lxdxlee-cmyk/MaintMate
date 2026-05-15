
"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AssetTemplate } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen, Trash2, Search, Loader2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const templates = useLiveQuery(() => {
    if (!searchTerm) return db.templates.toArray();
    return db.templates
      .filter(t => t.nomenclature.toLowerCase().includes(searchTerm.toLowerCase()))
      .toArray();
  }, [searchTerm]);

  const [formData, setFormData] = useState<Partial<AssetTemplate>>({
    nomenclature: '',
    nsn: '',
    tamcn: '',
    technicalKnowledge: '',
  });

  const handleAddTemplate = async () => {
    if (!formData.nomenclature?.trim()) {
      toast({ title: "Validation Error", description: "Nomenclature is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await db.templates.add({
        nomenclature: formData.nomenclature.trim(),
        nsn: (formData.nsn || '').trim(),
        tamcn: (formData.tamcn || '').trim(),
        technicalKnowledge: (formData.technicalKnowledge || '').trim(),
        createdAt: Date.now(),
      });
      setIsAddOpen(false);
      setFormData({ nomenclature: '', nsn: '', tamcn: '', technicalKnowledge: '' });
      toast({ title: "Template Saved", description: "Technical standard added to library." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this technical template?")) {
      await db.templates.delete(id);
      toast({ title: "Deleted", description: "Template removed from system." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Asset Templates
        </h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Asset Template</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid gap-2">
                <Label>Nomenclature</Label>
                <Input 
                  placeholder="e.g. M1A2 Abrams, Generator 10KW" 
                  value={formData.nomenclature || ''} 
                  onChange={e => setFormData({...formData, nomenclature: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>NSN</Label>
                  <Input 
                    placeholder="xxxx-xx-xxx-xxxx" 
                    value={formData.nsn || ''} 
                    onChange={e => setFormData({...formData, nsn: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>TAMCN</Label>
                  <Input 
                    placeholder="e.g. E12345" 
                    value={formData.tamcn || ''} 
                    onChange={e => setFormData({...formData, tamcn: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Technical Knowledge (AI Context)</Label>
                <Textarea 
                  placeholder="Paste specific technical specs, common faults, or TM logic here for the AI troubleshooter..." 
                  className="h-40"
                  value={formData.technicalKnowledge || ''} 
                  onChange={e => setFormData({...formData, technicalKnowledge: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">This info is used by the AI to analyze faults specifically for this equipment class.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddTemplate} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search nomenclatures..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {!templates?.length ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-sm text-muted-foreground">No templates defined.</p>
          </div>
        ) : (
          templates.map(t => (
            <Card key={t.id} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-primary">{t.nomenclature}</h3>
                  <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                    <span>NSN: {t.nsn || 'N/A'}</span>
                    <span>TAMCN: {t.tamcn || 'N/A'}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id!)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
