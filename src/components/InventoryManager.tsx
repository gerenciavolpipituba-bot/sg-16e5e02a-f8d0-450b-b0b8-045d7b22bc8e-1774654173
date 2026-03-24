import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList, Check, AlertCircle, FileDown } from "lucide-react";
import { Product, Sector, Inventory, InventoryItem } from "@/types";
import { storage } from "@/lib/storage";

interface InventoryManagerProps {
  onDataChange: () => void;
}

export function InventoryManager({ onDataChange }: InventoryManagerProps) {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setInventories(storage.getInventories());
    setProducts(storage.getProducts().filter(p => p.status === "active"));
    setSectors(storage.getSectors());
  };

  const handleCreateInventory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sectorId = formData.get("sectorId") as string;
    const sector = sectors.find(s => s.id === sectorId);
    const createdBy = formData.get("createdBy") as string;

    if (!sector) return;

    const items: InventoryItem[] = products.map(product => ({
      productId: product.id,
      productName: product.name,
      systemStock: product.currentStock,
      unit: product.unit,
    }));

    const inventory: Inventory = {
      id: Date.now().toString(),
      sectorId: sector.id,
      sectorName: sector.name,
      items,
      status: "draft",
      createdBy,
      createdAt: new Date().toISOString(),
    };

    storage.addInventory(inventory);
    setIsDialogOpen(false);
    loadData();
  };

  const handleCountUpdate = (inventoryId: string, productId: string, physicalCount: number) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory || inventory.status === "completed") return;

    const updatedItems = inventory.items.map(item => {
      if (item.productId === productId) {
        const difference = physicalCount - item.systemStock;
        return { ...item, physicalCount, difference };
      }
      return item;
    });

    storage.updateInventory(inventoryId, { items: updatedItems });
    loadData();
  };

  const handleCompleteInventory = (inventoryId: string) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return;

    const hasAllCounts = inventory.items.every(item => item.physicalCount !== undefined);
    if (!hasAllCounts) {
      alert("Por favor, preencha todas as contagens antes de finalizar.");
      return;
    }

    inventory.items.forEach(item => {
      if (item.difference !== 0 && item.difference !== undefined) {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        storage.addMovement({
          id: `${inventoryId}-${item.productId}-${Date.now()}`,
          productId: item.productId,
          productName: item.productName,
          type: "adjustment",
          quantity: item.physicalCount!,
          sectorId: inventory.sectorId,
          sectorName: inventory.sectorName,
          responsible: inventory.createdBy,
          observation: `Ajuste de inventário. Diferença: ${item.difference > 0 ? "+" : ""}${item.difference}`,
          createdAt: new Date().toISOString(),
        });

        storage.updateProduct(item.productId, { currentStock: item.physicalCount! });
      }
    });

    storage.updateInventory(inventoryId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });

    setSelectedInventory(null);
    loadData();
    onDataChange();
  };

  const exportInventory = (inventory: Inventory) => {
    const csvContent = [
      ["Produto", "Estoque Sistema", "Contagem Física", "Diferença", "Unidade"],
      ...inventory.items.map(item => [
        item.productName,
        item.systemStock.toString(),
        item.physicalCount?.toString() || "",
        item.difference?.toString() || "",
        item.unit,
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inventario-${inventory.sectorName}-${new Date(inventory.createdAt).toLocaleDateString("pt-BR")}.csv`;
    link.click();
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">Inventário</h2>
          <p className="text-sm text-muted-foreground">Contagem física e ajustes de estoque</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Inventário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Inventário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInventory} className="space-y-4">
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
                <Label htmlFor="createdBy">Responsável *</Label>
                <Input id="createdBy" name="createdBy" required />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Inventário</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {inventories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">
                Nenhum inventário criado ainda. Comece criando um novo inventário.
              </p>
            </CardContent>
          </Card>
        ) : (
          inventories.map(inventory => (
            <Card key={inventory.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      {inventory.sectorName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Criado por {inventory.createdBy} em {new Date(inventory.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inventory.status === "completed" ? "default" : "secondary"}>
                      {inventory.status === "completed" ? "Concluído" : "Em andamento"}
                    </Badge>
                    {inventory.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedInventory(selectedInventory?.id === inventory.id ? null : inventory)}
                      >
                        {selectedInventory?.id === inventory.id ? "Ocultar" : "Preencher"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportInventory(inventory)}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {selectedInventory?.id === inventory.id && inventory.status === "draft" && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Estoque Sistema</TableHead>
                            <TableHead className="text-right">Contagem Física</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventory.items.map(item => (
                            <TableRow key={item.productId}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.productName}</p>
                                  <p className="text-xs text-muted-foreground">{item.unit}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.systemStock}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0"
                                  defaultValue={item.physicalCount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    handleCountUpdate(inventory.id, item.productId, value);
                                  }}
                                  className="w-24 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                {item.difference !== undefined && (
                                  <span className={item.difference === 0 ? "text-muted-foreground" : item.difference > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                                    {item.difference > 0 ? "+" : ""}{item.difference}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedInventory(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => handleCompleteInventory(inventory.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Finalizar e Ajustar Estoque
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              {inventory.status === "completed" && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-success">
                      <Check className="h-4 w-4 inline mr-1" />
                      Inventário concluído em {new Date(inventory.completedAt!).toLocaleString("pt-BR")}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      {inventory.items.filter(i => i.difference !== 0).length} ajustes aplicados
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}