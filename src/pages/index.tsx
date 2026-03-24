import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  TrendingDown, 
  ArrowRightLeft, 
  LayoutDashboard,
  Plus,
  ClipboardList,
  MapPin,
  FileUp
} from "lucide-react";
import { Product, Movement } from "@/types";
import { storage } from "@/lib/storage";
import { Dashboard } from "@/components/Dashboard";
import { ProductsManager } from "@/components/ProductsManager";
import { MovementsManager } from "@/components/MovementsManager";
import { InventoryManager } from "@/components/InventoryManager";
import { SectorsManager } from "@/components/SectorsManager";
import { ImportManager } from "@/components/ImportManager";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = () => {
    setProducts(storage.getProducts());
    setMovements(storage.getMovements());
  };

  const handleDataChange = () => {
    loadData();
  };

  if (!mounted) return null;

  const lowStockCount = products.filter(p => p.status === "active" && p.currentStock <= p.minStock).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-heading font-bold">Controle de Estoque</h1>
                <p className="text-sm text-muted-foreground">Sistema de Gestão Restaurante</p>
              </div>
            </div>
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {lowStockCount} {lowStockCount === 1 ? "produto" : "produtos"} abaixo do mínimo
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Movimentação</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Inventário</span>
            </TabsTrigger>
            <TabsTrigger value="sectors" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Setores</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <FileUp className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard products={products} movements={movements} />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <ProductsManager onDataChange={handleDataChange} />
          </TabsContent>

          <TabsContent value="movements" className="space-y-6">
            <MovementsManager onDataChange={handleDataChange} />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryManager onDataChange={handleDataChange} />
          </TabsContent>

          <TabsContent value="sectors" className="space-y-6">
            <SectorsManager onDataChange={handleDataChange} />
          </TabsContent>

          <TabsContent value="import" className="space-y-6">
            <ImportManager onDataChange={handleDataChange} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}