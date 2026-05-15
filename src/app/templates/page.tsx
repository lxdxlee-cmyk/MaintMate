
"use client"

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AssetTemplate, type TechnicalAssembly, type TechnicalComponent, type TechnicalConnection } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, BookOpen, Trash2, Search, Loader2, Layers, Edit, FileDown, X, Network, Zap, ShieldAlert, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { exportPubsCatalog } from '@/lib/pdf-export';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

function TemplatesContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
    assemblies: [],
  });

  const [newAssembly, setNewAssembly] = useState<Partial<TechnicalAssembly>>({
    name: '',
    description: '',
    components: [],
    connections: []
  });

  const handleAddAssembly = () => {
    if (!newAssembly.name?.trim()) return;
    setFormData({
      ...formData,
      assemblies: [...(formData.assemblies || []), { ...newAssembly, components: [], connections: [] } as TechnicalAssembly]
    });
    setNewAssembly({ name: '', description: '' });
  };

  const removeAssembly = (index: number) => {
    setFormData({
      ...formData,
      assemblies: (formData.assemblies || []).filter((_, i) => i !== index)
    });
  };

  const addComponentToAssembly = (asmIndex: number) => {
    const comp: TechnicalComponent = {
      id: crypto.randomUUID(),
      name: 'New Component',
      ports: [],
      expectedMeasurements: [],
      knownFaults: [],
      procedures: []
    };
    const newAssemblies = [...(formData.assemblies || [])];
    newAssemblies[asmIndex].components.push(comp);
    setFormData({ ...formData, assemblies: newAssemblies });
  };

  const handleOpenEdit = (template: AssetTemplate) => {
    setEditingId(template.id!);
    setFormData({
      nomenclature: template.nomenclature,
      nsn: template.nsn,
      tamcn: template.tamcn,
      technicalKnowledge: template.technicalKnowledge,
      assemblies: JSON.parse(JSON.stringify(template.assemblies || [])),
    });
    setIsEditOpen(true);
  };

  const handleSave = async (id?: number) => {
    if (!formData.nomenclature?.trim()) {
      toast({ title: "Validation Error", description: "Nomenclature is required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nomenclature: formData.nomenclature.trim(),
        nsn: (formData.nsn || '').trim(),
        tamcn: (formData.tamcn || '').trim(),
        technicalKnowledge: (formData.technicalKnowledge || '').trim(),
        assemblies: formData.assemblies || [],
        createdAt: id ? undefined : Date.now(),
      };

      if (id) {
        await db.templates.update(id, payload);
        setIsEditOpen(false);
      } else {
        await db.templates.add(payload as AssetTemplate);
        setIsAddOpen(false);
      }
      
      setFormData({ nomenclature: '', nsn: '', tamcn: '', technicalKnowledge: '', assemblies: [] });
      toast({ title: "Success", description: "Technical record saved." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save publication.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this technical publication?")) {
      await db.templates.delete(id);
      toast({ title: "Deleted", description: "Record removed." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Technical PUBS
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => templates && exportPubsCatalog(templates)} className="h-8 text-[9px] font-bold uppercase gap-1">
            <FileDown className="h-4 w-4" /> Export Catalog
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Pub</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Register Technical Publication</DialogTitle></DialogHeader>
              <PubForm formData={formData} setFormData={setFormData} newAssembly={newAssembly} setNewAssembly={setNewAssembly} handleAddAssembly={handleAddAssembly} removeAssembly={removeAssembly} addComponentToAssembly={addComponentToAssembly} />
              <DialogFooter>
                <Button onClick={() => handleSave()} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Register Publication"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Publication</DialogTitle></DialogHeader>
          <PubForm formData={formData} setFormData={setFormData} newAssembly={newAssembly} setNewAssembly={setNewAssembly} handleAddAssembly={handleAddAssembly} removeAssembly={removeAssembly} addComponentToAssembly={addComponentToAssembly} />
          <DialogFooter>
            <Button onClick={() => handleSave(editingId!)} className="w-full" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter technical inventory..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {templates?.map(t => (
          <Card key={t.id} className="border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="font-bold text-sm text-primary truncate uppercase">{t.nomenclature}</h3>
                <div className="flex gap-4 text-[10px] font-mono text-muted-foreground uppercase font-bold">
                  <span>NSN: {t.nsn}</span>
                  <span>TAM: {t.tamcn}</span>
                </div>
                <div className="flex gap-2 mt-1">
                   <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded font-black uppercase">
                     {t.assemblies?.length || 0} Assemblies
                   </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)} className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id!)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PubForm({ formData, setFormData, newAssembly, setNewAssembly, handleAddAssembly, removeAssembly, addComponentToAssembly }: any) {
  return (
    <div className="grid gap-4 py-4 pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 grid gap-2">
          <Label>Nomenclature</Label>
          <Input value={formData.nomenclature || ''} onChange={e => setFormData({...formData, nomenclature: e.target.value})} />
        </div>
        <div className="grid gap-2">
          <Label>NSN</Label>
          <Input value={formData.nsn || ''} onChange={e => setFormData({...formData, nsn: e.target.value})} />
        </div>
        <div className="grid gap-2">
          <Label>TAMCN</Label>
          <Input value={formData.tamcn || ''} onChange={e => setFormData({...formData, tamcn: e.target.value})} />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-xs uppercase font-black text-primary flex items-center gap-2">
          <Layers className="h-4 w-4" /> System Assemblies
        </Label>
        
        <div className="grid gap-2 p-3 bg-muted/20 border rounded-lg">
          <Input placeholder="Assembly Name (e.g. Signal Enclosure)" value={newAssembly.name} onChange={e => setNewAssembly({...newAssembly, name: e.target.value})} />
          <Button variant="secondary" size="sm" onClick={handleAddAssembly} disabled={!newAssembly.name}>
            <Plus className="h-3 w-3 mr-1" /> Create Assembly
          </Button>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {formData.assemblies?.map((asm: TechnicalAssembly, idx: number) => (
            <AccordionItem key={idx} value={`asm-${idx}`} className="border rounded-lg bg-white px-3">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold text-sm uppercase">{asm.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{asm.components?.length || 0} Components Defined</p>
                  <Button variant="ghost" size="sm" onClick={() => removeAssembly(idx)} className="h-6 text-destructive text-[10px] uppercase font-bold p-0">Delete Assembly</Button>
                </div>
                
                <div className="space-y-2">
                  {asm.components?.map((comp: TechnicalComponent, cIdx: number) => (
                    <div key={comp.id} className="p-3 border-2 border-dashed rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Input 
                          className="h-7 text-xs font-bold" 
                          value={comp.name} 
                          onChange={(e) => {
                            const updated = [...formData.assemblies];
                            updated[idx].components[cIdx].name = e.target.value;
                            setFormData({...formData, assemblies: updated});
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          const updated = [...formData.assemblies];
                          updated[idx].components.splice(cIdx, 1);
                          setFormData({...formData, assemblies: updated});
                        }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                           <Label className="text-[9px] uppercase">Purpose/Notes</Label>
                           <Textarea className="h-14 text-xs" value={comp.purpose || ''} onChange={(e) => {
                             const updated = [...formData.assemblies];
                             updated[idx].components[cIdx].purpose = e.target.value;
                             setFormData({...formData, assemblies: updated});
                           }} />
                         </div>
                         <div className="space-y-1">
                           <Label className="text-[9px] uppercase">Expected Specs</Label>
                           <Textarea 
                             placeholder="Nominal: 24VDC&#10;Input: 110VAC" 
                             className="h-14 text-xs font-mono"
                             value={comp.expectedMeasurements?.map(m => `${m.name}: ${m.value}`).join('\n') || ''}
                             onChange={(e) => {
                               const lines = e.target.value.split('\n');
                               const measurements = lines.filter(l => l.includes(':')).map(l => {
                                 const [n, v] = l.split(':');
                                 return { name: n.trim(), value: v.trim() };
                               });
                               const updated = [...formData.assemblies];
                               updated[idx].components[cIdx].expectedMeasurements = measurements;
                               setFormData({...formData, assemblies: updated});
                             }}
                           />
                         </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full h-8 text-xs border-dashed" onClick={() => addComponentToAssembly(idx)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Component to {asm.name}
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label className="text-xs uppercase font-black text-primary">Field Notes (Tribal Knowledge)</Label>
        <Textarea placeholder="Document field behavior, unusual fixes, or tribal knowledge here..." className="h-32" value={formData.technicalKnowledge || ''} onChange={e => setFormData({...formData, technicalKnowledge: e.target.value})} />
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <TemplatesContent />
    </Suspense>
  );
}
