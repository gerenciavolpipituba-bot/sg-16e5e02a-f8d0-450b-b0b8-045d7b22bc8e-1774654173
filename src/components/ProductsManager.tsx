import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Package, Tags, Trash2 } from "lucide-react";
import { productService } from "@/services/productService";
import { sectorService } from "@/services/sectorService";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];

interface ProductsManagerProps {
  onDataChange: () => void;
}

export function ProductsManager({ onDataChange }: ProductsManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [categorySectors, setCategorySectors] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, sectorsData] = await Promise.all([
        productService.getAll(),
        sectorService.getAll()
      ]);
      setProducts(productsData);
      setSectors(sectorsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?\n\nEsta ação não pode ser desfeita e o produto será removido permanentemente do sistema.`)) {
      try {
        await productService.delete(productId);
        toast({
          title: "Produto excluído",
          description: `${productName} foi removido com sucesso.`
        });
        loadData();
        onDataChange();
      } catch (error: any) {
        toast({
          title: "Erro ao excluir produto",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const productData = {
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        unit: formData.get("unit") as "kg" | "un" | "litro" | "ml" | "g",
        current_stock: Number(formData.get("currentStock")),
        min_stock: Number(formData.get("minStock")),
        avg_cost: Number(formData.get("avgCost")),
        internal_code: formData.get("internalCode") as string,
        status: formData.get("status") as "active" | "inactive"
      };

      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
        toast({
          title: "Produto atualizado",
          description: `${productData.name} foi atualizado com sucesso.`
        });
      } else {
        const newProduct = await productService.create(productData);
        await productService.linkSectors(newProduct.id, selectedSectors);
        toast({
          title: "Produto cadastrado",
          description: `${productData.name} foi cadastrado com sucesso.`
        });
      }

      if (editingProduct && selectedSectors.length > 0) {
        await productService.linkSectors(editingProduct.id, selectedSectors);
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setSelectedSectors([]);
      loadData();
      onDataChange();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    const productSectors = await productService.getProductSectors(product.id);
    setSelectedSectors(productSectors);
    setIsDialogOpen(true);
  };

  const handleSectorToggle = (sectorId: string) => {
    setSelectedSectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const handleCategorySectorToggle = (sectorId: string) => {
    setCategorySectors(prev => 
      prev.includes(sectorId) 
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllProducts = () => {
    const categoryProducts = products.filter(p => p.category === selectedCategory);
    if (selectedProducts.length === categoryProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(categoryProducts.map(p => p.id));
    }
  };

  const handleCategoryBulkUpdate = async () => {
    if (!selectedCategory) {
      toast({
        title: "Erro",
        description: "Selecione uma categoria",
        variant: "destructive"
      });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um produto",
        variant: "destructive"
      });
      return;
    }

    if (categorySectors.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um setor",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const productId of selectedProducts) {
        const currentSectors = await productService.getProductSectors(productId);
        const newSectors = Array.from(new Set([...currentSectors, ...categorySectors]));
        await productService.linkSectors(productId, newSectors);
      }
      
      setIsCategoryDialogOpen(false);
      setSelectedCategory("");
      setCategorySectors([]);
      setSelectedProducts([]);
      loadData();
      onDataChange();
      
      toast({
        title: "Sucesso",
        description: `${selectedProducts.length} produto(s) da categoria "${selectedCategory}" atualizado(s)!`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar produtos",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.internal_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryProducts = selectedCategory 
    ? products.filter(p => p.category === selectedCategory)
    : [];

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
          
          <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
            setIsCategoryDialogOpen(open);
            if (!open) {
              setSelectedCategory("");
              setCategorySectors([]);
              setSelectedProducts([]);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tags className="h-4 w-4 mr-2" />
                Vincular Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Vincular Produtos a Setores</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>1. Selecione a Categoria</Label>
                  <Select value={selectedCategory} onValueChange={(value) => {
                    setSelectedCategory(value);
                    setSelectedProducts([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCategory && categoryProducts.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>2. Selecione os Produtos (opcional - marque todos ou alguns)</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleSelectAllProducts}
                        >
                          {selectedProducts.length === categoryProducts.length ? "Desmarcar Todos" : "Marcar Todos"}
                        </Button>
                      </div>
                      <div className="border rounded-lg max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background">
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Código</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryProducts.map(product => (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedProducts.includes(product.id)}
                                    onCheckedChange={() => handleProductToggle(product.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{product.internal_code}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedProducts.length} de {categoryProducts.length} produtos selecionados
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>3. Marque os setores onde os produtos selecionados devem aparecer</Label>
                      <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                        {sectors.map(sector => (
                          <div key={sector.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-sector-${sector.id}`}
                              checked={categorySectors.includes(sector.id)}
                              onCheckedChange={() => handleCategorySectorToggle(sector.id)}
                            />
                            <Label
                              htmlFor={`cat-sector-${sector.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {sector.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Os setores selecionados serão ADICIONADOS aos setores já existentes de cada produto
                      </p>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCategoryBulkUpdate}
                    disabled={!selectedCategory || selectedProducts.length === 0 || categorySectors.length === 0}
                  >
                    Aplicar aos {selectedProducts.length} Produto(s) Selecionado(s)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                    <Input id="internalCode" name="internalCode" defaultValue={editingProduct?.internal_code} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Estoque Atual *</Label>
                    <Input id="currentStock" name="currentStock" type="number" step="0.01" defaultValue={editingProduct?.current_stock} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Estoque Mínimo *</Label>
                    <Input id="minStock" name="minStock" type="number" step="0.01" defaultValue={editingProduct?.min_stock} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avgCost">Custo Médio (R$) *</Label>
                    <Input id="avgCost" name="avgCost" type="number" step="0.01" defaultValue={editingProduct?.avg_cost} required />
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                          <p className="text-xs text-muted-foreground">{product.internal_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="text-right">
                        <span className={product.current_stock <= product.min_stock ? "text-destructive font-semibold" : ""}>
                          {product.current_stock} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{product.min_stock} {product.unit}</TableCell>
                      <TableCell className="text-right">R$ {product.avg_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.status === "active" ? "default" : "secondary"}>
                          {product.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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