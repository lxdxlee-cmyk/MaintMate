"use client"

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AssetTemplate, type TemplateComponent } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Trash2, Search, Loader2, Layers, Settings2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

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
    components: [],
  });

  const [newComponent, setNewComponent] = useState<TemplateComponent>({
    name: '',
    description: '',
    measurements: '',
  });

  const handleAddComponent = () => {
    if (!newComponent.name.trim()) return;
    setFormData({
      ...formData,
      components: [...(formData.components || []), { ...newComponent }]
    });
    setNewComponent({ name: '', description: '', measurements: '' });
  };

  const removeComponent = (index: number) => {
    setFormData({
      ...formData,
      components: (formData.components || []).filter((_, i) => i !== index)
    });
  };

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
        components: formData.components || [],
        createdAt: Date.now(),
      });
      setIsAddOpen(false);
      setFormData({ nomenclature: '', nsn: '', tamcn: '', technicalKnowledge: '', components: [] });
      toast({ title: "Publication Saved", description: "Technical standard added to PUBS library." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save publication.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this technical publication?")) {
      await db.templates.delete(id);
      toast({ title: "Deleted", description: "Publication removed from system." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Technical PUBS
        </h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Publication</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Technical Publication (PUBS)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 pr-1">
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

              <Separator className="my-2" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Sub-Systems / Components
                  </Label>
                </div>

                <div className="grid gap-3 p-3 border rounded-lg bg-muted/20">
                  <div className="grid gap-2">
                    <Input 
                      placeholder="Component Name (e.g. Alternator)" 
                      value={newComponent.name}
                      onChange={e => setNewComponent({...newComponent, name: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Textarea 
                      placeholder="Description/Purpose" 
                      className="h-16"
                      value={newComponent.description}
                      onChange={e => setNewComponent({...newComponent, description: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Input 
                      placeholder="Specific Measurements (e.g. 24V +/- 1V)" 
                      value={newComponent.measurements}
                      onChange={e => setNewComponent({...newComponent, measurements: e.target.value})}
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleAddComponent} className="w-full">
                    <Plus className="h-3 w-3 mr-1" /> Add Component to Publication
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.components?.map((comp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border shadow-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{comp.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{comp.measurements}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeComponent(idx)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              <div className="grid gap-2">
                <Label>Technical Knowledge (AI Context)</Label>
                <Textarea 
                  placeholder="Paste specific technical manual logic, general fault codes, etc." 
                  className="h-32"
                  value={formData.technicalKnowledge || ''} 
                  onChange={e => setFormData({...formData, technicalKnowledge: e.target.value})}
                />
                <p className="text-[10px] text-muted-foreground">Detailed logic for the AI to analyze equipment-wide faults.</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddTemplate} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Publication"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search publications..." 
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {!templates?.length ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-sm text-muted-foreground">No publications defined.</p>
          </div>
        ) : (
          templates.map(t => (
            <Card key={t.id} className="border-none shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-bold text-sm text-primary truncate">{t.nomenclature}</h3>
                  <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                    <span>NSN: {t.nsn || 'N/A'}</span>
                    <span>TAMCN: {t.tamcn || 'N/A'}</span>
                  </div>
                  {t.components && t.components.length > 0 && (
                    <p className="text-[10px] text-accent font-bold">
                      {t.components.length} Components defined
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id!)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2">
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
