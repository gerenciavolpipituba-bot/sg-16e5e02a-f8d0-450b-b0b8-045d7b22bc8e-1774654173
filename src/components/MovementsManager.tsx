import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowDownCircle, ArrowUpCircle, Edit3 } from "lucide-react";
import { productService } from "@/services/productService";
import { sectorService } from "@/services/sectorService";
import { movementService } from "@/services/movementService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Movement = Database["public"]["Tables"]["movements"]["Row"];

interface MovementsManagerProps {
  onDataChange: () => void;
}

export function MovementsManager({ onDataChange }: MovementsManagerProps) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    loadData();

    const unsubscribe = movementService.subscribeToChanges(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [movementsData, productsData, sectorsData] = await Promise.all([
        movementService.getAll(),
        productService.getAll(),
        sectorService.getAll()
      ]);
      setMovements(movementsData);
      setProducts(productsData.filter(p => p.status === "active"));
      setSectors(sectorsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productId = formData.get("productId") as string;
    const product = products.find(p => p.id === productId);
    const sectorId = formData.get("sectorId") as string;
    const sector = sectors.find(s => s.id === sectorId);
    const type = formData.get("type") as "entry" | "exit" | "adjustment";
    const quantity = Number(formData.get("quantity"));
    const responsible = formData.get("responsible") as string;
    const observation = formData.get("observation") as string || undefined;

    if (!product || !sector) return;

    try {
      let newStock = product.current_stock;
      if (type === "entry") {
        newStock += quantity;
      } else if (type === "exit") {
        newStock -= quantity;
      } else {
        newStock = quantity;
      }

      await movementService.create({
        product_id: product.id,
        type,
        quantity,
        sector_id: sector.id,
        responsible,
        observation
      });

      await productService.update(product.id, { 
        current_stock: Math.max(0, newStock) 
      });

      toast({
        title: "Movimentação registrada",
        description: `${getMovementLabel(type)} de ${quantity} ${product.unit} registrada com sucesso.`
      });

      setIsDialogOpen(false);
      loadData();
      onDataChange();
    } catch (error: any) {
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getMovementIcon = (type: Movement["type"]) => {
    switch (type) {
      case "entry": return <ArrowDownCircle className="h-4 w-4 text-success" />;
      case "exit": return <ArrowUpCircle className="h-4 w-4 text-destructive" />;
      case "adjustment": return <Edit3 className="h-4 w-4 text-info" />;
    }
  };

  const getMovementLabel = (type: Movement["type"]) => {
    switch (type) {
      case "entry": return "Entrada";
      case "exit": return "Saída";
      case "adjustment": return "Ajuste";
    }
  };

  const getMovementColor = (type: Movement["type"]) => {
    switch (type) {
      case "entry": return "text-success";
      case "exit": return "text-destructive";
      case "adjustment": return "text-info";
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Produto não encontrado";
  };

  const getSectorName = (sectorId: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    return sector?.name || "Setor não encontrado";
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">Movimentações</h2>
          <p className="text-sm text-muted-foreground">Registre entradas, saídas e ajustes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Movimentação *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entrada</SelectItem>
                    <SelectItem value="exit">Saída</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="productId">Produto *</Label>
                <Select name="productId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.current_stock} {product.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input id="quantity" name="quantity" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectorId">Setor *</Label>
                <Select name="sectorId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map(sector => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsável *</Label>
                <Input id="responsible" name="responsible" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observation">Observação</Label>
                <Textarea id="observation" name="observation" rows={3} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.type)}
                          <span className={getMovementColor(movement.type)}>
                            {getMovementLabel(movement.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getProductName(movement.product_id)}</p>
                          {movement.observation && (
                            <p className="text-xs text-muted-foreground">{movement.observation}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${getMovementColor(movement.type)}`}>
                          {movement.type === "entry" ? "+" : movement.type === "exit" ? "-" : ""}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{getSectorName(movement.sector_id)}</TableCell>
                      <TableCell>{movement.responsible}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(movement.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}