import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus } from "lucide-react";
import { Sector } from "@/types";
import { storage } from "@/lib/storage";

interface SectorsManagerProps {
  onDataChange: () => void;
}

export function SectorsManager({ onDataChange }: SectorsManagerProps) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSectors();
  }, []);

  const loadSectors = () => {
    setSectors(storage.getSectors());
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const sector: Sector = {
      id: Date.now().toString(),
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      createdAt: new Date().toISOString(),
    };

    storage.addSector(sector);
    setIsDialogOpen(false);
    loadSectors();
    onDataChange();
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">Setores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os setores do restaurante</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Setor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Setor *</Label>
                <Input id="name" name="name" placeholder="Ex: Cozinha, Bar, Estoque..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" rows={3} placeholder="Descrição opcional..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sectors.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">
                Nenhum setor cadastrado. Comece adicionando setores como Cozinha, Bar, Estoque, etc.
              </p>
            </CardContent>
          </Card>
        ) : (
          sectors.map(sector => (
            <Card key={sector.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-primary" />
                  {sector.name}
                </CardTitle>
              </CardHeader>
              {sector.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{sector.description}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}