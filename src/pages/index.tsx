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
  FileUp,
  Trash2,
  LogOut,
  User
} from "lucide-react";
import { ProductsManager } from "@/components/ProductsManager";
import { MovementsManager } from "@/components/MovementsManager";
import { InventoryManager } from "@/components/InventoryManager";
import { SectorsManager } from "@/components/SectorsManager";
import { ImportManager } from "@/components/ImportManager";
import { supabase } from "@/integrations/supabase/client";
import { userService } from "@/services/userService";
import { productService } from "@/services/productService";
import { movementService } from "@/services/movementService";
import type { Database } from "@/integrations/supabase/types";
import { SEO } from "@/components/SEO";
import { AuthGuard } from "@/components/AuthGuard";
import { Dashboard } from "@/components/Dashboard";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Movement = Database["public"]["Tables"]["movements"]["Row"];

// Sistema de Controle de Estoque - Credenciais Atualizadas v1.2
export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    loadData();
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    const profile = await userService.getCurrentProfile();
    setCurrentUser(profile);
  };

  const handleLogout = async () => {
    if (window.confirm("Tem certeza que deseja sair?")) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const loadData = async () => {
    try {
      const [productsData, movementsData] = await Promise.all([
        productService.getAll(),
        movementService.getAll()
      ]);
      setProducts(productsData);
      setMovements(movementsData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDataChange = () => {
    loadData();
  };

  const handleResetDatabase = () => {
    if (window.confirm("⚠️ ATENÇÃO: Isso irá apagar TODOS os dados (produtos, movimentações, inventários e setores). Deseja continuar?")) {
      alert("Operação temporariamente desabilitada no modo nuvem.");
    }
  };

  if (!mounted) return null;

  const lowStockCount = products.filter(p => p.status === "active" && p.current_stock <= p.min_stock).length;

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
            <div className="flex items-center gap-3">
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {lowStockCount} {lowStockCount === 1 ? "produto" : "produtos"} abaixo do mínimo
                </Badge>
              )}
              {currentUser && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="font-medium">{currentUser.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
                  </div>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetDatabase}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Resetar DB</span>
              </Button>
            </div>
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