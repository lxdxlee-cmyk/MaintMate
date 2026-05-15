
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
import { Plus, BookOpen, Trash2, Search, Loader2, Layers, Edit, FileDown, X, Network, Zap, ShieldAlert, ClipboardList, Cable } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const addConnectionToAssembly = (asmIndex: number) => {
    const conn: TechnicalConnection = {
      id: crypto.randomUUID(),
      type: 'Ethernet',
      sourceComponentId: '',
      destComponentId: '',
    };
    const newAssemblies = [...(formData.assemblies || [])];
    newAssemblies[asmIndex].connections.push(conn);
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
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Register Technical Publication</DialogTitle></DialogHeader>
              <PubForm 
                formData={formData} 
                setFormData={setFormData} 
                newAssembly={newAssembly} 
                setNewAssembly={setNewAssembly} 
                handleAddAssembly={handleAddAssembly} 
                removeAssembly={removeAssembly} 
                addComponentToAssembly={addComponentToAssembly}
                addConnectionToAssembly={addConnectionToAssembly}
              />
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Update Publication</DialogTitle></DialogHeader>
          <PubForm 
            formData={formData} 
            setFormData={setFormData} 
            newAssembly={newAssembly} 
            setNewAssembly={setNewAssembly} 
            handleAddAssembly={handleAddAssembly} 
            removeAssembly={removeAssembly} 
            addComponentToAssembly={addComponentToAssembly}
            addConnectionToAssembly={addConnectionToAssembly}
          />
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

function PubForm({ formData, setFormData, newAssembly, setNewAssembly, handleAddAssembly, removeAssembly, addComponentToAssembly, addConnectionToAssembly }: any) {
  return (
    <div className="grid gap-4 py-4 pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 grid gap-2">
          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Technical Identification</Label>
          <Input placeholder="Nomenclature" value={formData.nomenclature || ''} onChange={e => setFormData({...formData, nomenclature: e.target.value})} />
        </div>
        <div className="grid gap-2">
          <Label className="text-[10px] uppercase font-bold">NSN (National Stock Number)</Label>
          <Input placeholder="0000-00-000-0000" value={formData.nsn || ''} onChange={e => setFormData({...formData, nsn: e.target.value})} />
        </div>
        <div className="grid gap-2">
          <Label className="text-[10px] uppercase font-bold">TAMCN</Label>
          <Input placeholder="E0000" value={formData.tamcn || ''} onChange={e => setFormData({...formData, tamcn: e.target.value})} />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label className="text-[11px] uppercase font-black text-primary flex items-center gap-2">
          <Layers className="h-4 w-4" /> System Hierarchy & Topology
        </Label>
        
        <div className="grid gap-2 p-3 bg-muted/20 border-2 border-dashed rounded-lg">
          <Input placeholder="Assembly Name (e.g. Signal Enclosure)" value={newAssembly.name} onChange={e => setNewAssembly({...newAssembly, name: e.target.value})} />
          <Button variant="secondary" size="sm" onClick={handleAddAssembly} disabled={!newAssembly.name} className="h-8 text-[10px] uppercase font-bold">
            <Plus className="h-3 w-3 mr-1" /> Create Assembly Section
          </Button>
        </div>

        <Accordion type="multiple" className="space-y-3">
          {formData.assemblies?.map((asm: TechnicalAssembly, idx: number) => (
            <AccordionItem key={idx} value={`asm-${idx}`} className="border-2 rounded-lg bg-white px-3">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 text-left">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-bold text-sm uppercase tracking-tight">{asm.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Assembly Definition</p>
                    <p className="text-[9px] text-muted-foreground">Manage components and connections for this section.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeAssembly(idx)} className="h-6 text-destructive text-[9px] uppercase font-bold p-0">Remove Assembly</Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Zap className="h-3 w-3" />
                    <Label className="text-[10px] uppercase font-black">Components</Label>
                  </div>
                  <div className="grid gap-3">
                    {asm.components?.map((comp: TechnicalComponent, cIdx: number) => (
                      <div key={comp.id} className="p-3 border rounded-lg bg-muted/10 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input 
                            placeholder="Component Name"
                            className="h-8 text-xs font-bold uppercase" 
                            value={comp.name} 
                            onChange={(e) => {
                              const updated = [...formData.assemblies];
                              updated[idx].components[cIdx].name = e.target.value;
                              setFormData({...formData, assemblies: updated});
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            const updated = [...formData.assemblies];
                            updated[idx].components.splice(cIdx, 1);
                            setFormData({...formData, assemblies: updated});
                          }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <div className="space-y-1">
                             <Label className="text-[9px] uppercase font-bold">Purpose / Tech Specs</Label>
                             <Textarea 
                               placeholder="e.g. Signal processing, RF filter..."
                               className="h-16 text-[10px] resize-none" 
                               value={comp.purpose || ''} 
                               onChange={(e) => {
                                 const updated = [...formData.assemblies];
                                 updated[idx].components[cIdx].purpose = e.target.value;
                                 setFormData({...formData, assemblies: updated});
                               }} 
                             />
                           </div>
                           <div className="space-y-1">
                             <Label className="text-[9px] uppercase font-bold text-accent">Expected Readings</Label>
                             <Textarea 
                               placeholder="Reading: Value&#10;VDC: 24.5 +/- 0.5" 
                               className="h-16 text-[10px] font-mono resize-none bg-accent/5"
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
                    <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-bold border-dashed" onClick={() => addComponentToAssembly(idx)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Component
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Cable className="h-3 w-3" />
                    <Label className="text-[10px] uppercase font-black">Connection Map (Wires/Signal)</Label>
                  </div>
                  <div className="grid gap-3">
                    {asm.connections?.map((conn: TechnicalConnection, connIdx: number) => (
                      <div key={conn.id} className="p-3 border rounded-lg bg-primary/5 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[8px] uppercase font-bold">Source Component</Label>
                            <Select 
                              value={conn.sourceComponentId} 
                              onValueChange={(val) => {
                                const updated = [...formData.assemblies];
                                updated[idx].connections[connIdx].sourceComponentId = val;
                                setFormData({...formData, assemblies: updated});
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {asm.components.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[8px] uppercase font-bold">Dest Component</Label>
                            <Select 
                              value={conn.destComponentId} 
                              onValueChange={(val) => {
                                const updated = [...formData.assemblies];
                                updated[idx].connections[connIdx].destComponentId = val;
                                setFormData({...formData, assemblies: updated});
                              }}
                            >
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue placeholder="Select..." /></SelectTrigger>
                              <SelectContent>
                                {asm.components.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div className="space-y-1">
                             <Label className="text-[8px] uppercase font-bold">Type</Label>
                             <Select 
                               value={conn.type} 
                               onValueChange={(val) => {
                                 const updated = [...formData.assemblies];
                                 updated[idx].connections[connIdx].type = val as any;
                                 setFormData({...formData, assemblies: updated});
                               }}
                             >
                               <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                 {['Ethernet', 'Serial', 'RF', 'Power', 'Grounding', 'Control', 'Signal', 'Other'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                               </SelectContent>
                             </Select>
                           </div>
                           <div className="space-y-1">
                             <Label className="text-[8px] uppercase font-bold">Connector</Label>
                             <Input 
                               placeholder="e.g. RJ45" 
                               className="h-7 text-[10px]" 
                               value={conn.connectorType || ''}
                               onChange={(e) => {
                                 const updated = [...formData.assemblies];
                                 updated[idx].connections[connIdx].connectorType = e.target.value;
                                 setFormData({...formData, assemblies: updated});
                               }}
                             />
                           </div>
                           <div className="space-y-1">
                             <Label className="text-[8px] uppercase font-bold">Cable ID</Label>
                             <Input 
                               placeholder="W001" 
                               className="h-7 text-[10px] font-mono" 
                               value={conn.cableId || ''}
                               onChange={(e) => {
                                 const updated = [...formData.assemblies];
                                 updated[idx].connections[connIdx].cableId = e.target.value;
                                 setFormData({...formData, assemblies: updated});
                               }}
                             />
                           </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <Input 
                             placeholder="Connection notes..." 
                             className="h-7 text-[9px] flex-1 mr-2" 
                             value={conn.notes || ''}
                             onChange={(e) => {
                               const updated = [...formData.assemblies];
                               updated[idx].connections[connIdx].notes = e.target.value;
                               setFormData({...formData, assemblies: updated});
                             }}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            const updated = [...formData.assemblies];
                            updated[idx].connections.splice(connIdx, 1);
                            setFormData({...formData, assemblies: updated});
                          }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full h-8 text-[10px] uppercase font-bold border-dashed text-primary" onClick={() => addConnectionToAssembly(idx)}>
                      <Plus className="h-3 w-3 mr-1" /> Add Signal/Wire Path
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Separator />

      <div className="grid gap-2">
        <Label className="text-[11px] uppercase font-black text-primary flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Technical Documentation (Tribal Knowledge)
        </Label>
        <Textarea 
          placeholder="Document unusual field behavior, common workarounds, or undocumented technical nuances here..." 
          className="h-32 text-xs" 
          value={formData.technicalKnowledge || ''} 
          onChange={e => setFormData({...formData, technicalKnowledge: e.target.value})} 
        />
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
