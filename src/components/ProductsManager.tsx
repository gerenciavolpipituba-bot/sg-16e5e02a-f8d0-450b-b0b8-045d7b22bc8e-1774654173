import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Package } from "lucide-react";
import { Product, Sector } from "@/types";
import { storage } from "@/lib/storage";

interface ProductsManagerProps {
  onDataChange: () => void;
}

export function ProductsManager({ onDataChange }: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
    setSectors(storage.getSectors());
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const product: Product = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      unit: formData.get("unit") as "kg" | "un" | "litro" | "ml" | "g",
      currentStock: Number(formData.get("currentStock")),
      minStock: Number(formData.get("minStock")),
      avgCost: Number(formData.get("avgCost")),
      internalCode: formData.get("internalCode") as string,
      status: formData.get("status") as "active" | "inactive",
      sectors: selectedSectors,
      createdAt: editingProduct?.createdAt || new Date().toISOString(),
    };

    if (editingProduct) {
      storage.updateProduct(editingProduct.id, product);
    } else {
      storage.addProduct(product);
    }

    setIsDialogOpen(false);
    setEditingProduct(null);
    setSelectedSectors([]);
    loadData();
    onDataChange();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSelectedSectors(product.sectors || []);
    setIsDialogOpen(true);
  };

  const handleSectorToggle = (sectorId: string) => {
    setSelectedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.internalCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProduct(null);
              setSelectedSectors([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input id="name" name="name" defaultValue={editingProduct?.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Input id="category" name="category" defaultValue={editingProduct?.category} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade *</Label>
                    <Select name="unit" defaultValue={editingProduct?.unit || "un"} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="litro">Litro</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="un">Unidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internalCode">Código Interno *</Label>
                    <Input id="internalCode" name="internalCode" defaultValue={editingProduct?.internalCode} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Estoque Atual *</Label>
                    <Input id="currentStock" name="currentStock" type="number" step="0.01" defaultValue={editingProduct?.currentStock} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo *</Label>
                    <Input id="minStock" name="minStock" type="number" step="0.01" defaultValue={editingProduct?.minStock} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avgCost">Custo Médio (R$) *</Label>
                    <Input id="avgCost" name="avgCost" type="number" step="0.01" defaultValue={editingProduct?.avgCost} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select name="status" defaultValue={editingProduct?.status || "active"} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Setores onde o produto está presente</Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                    {sectors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum setor cadastrado</p>
                    ) : (
                      sectors.map(sector => (
                        <div key={sector.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sector-${sector.id}`}
                            checked={selectedSectors.includes(sector.id)}
                            onCheckedChange={() => handleSectorToggle(sector.id)}
                          />
                          <Label
                            htmlFor={`sector-${sector.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {sector.name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduct ? "Salvar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.internalCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.sectors && product.sectors.length > 0 ? (
                            product.sectors.slice(0, 2).map(sectorId => {
                              const sector = sectors.find(s => s.id === sectorId);
                              return sector ? (
                                <Badge key={sectorId} variant="outline" className="text-xs">
                                  {sector.name}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">Nenhum</span>
                          )}
                          {product.sectors && product.sectors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.sectors.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={product.currentStock <= product.minStock ? "text-destructive font-semibold" : ""}>
                          {product.currentStock} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{product.minStock} {product.unit}</TableCell>
                      <TableCell className="text-right">R$ {product.avgCost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>
                          {product.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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