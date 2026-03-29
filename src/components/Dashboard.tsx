import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingDown, ArrowRightLeft, AlertTriangle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Movement = Database["public"]["Tables"]["movements"]["Row"];

interface DashboardProps {
  products: Product[];
  movements: Movement[];
}

export function Dashboard({ products, movements }: DashboardProps) {
  const activeProducts = products.filter(p => p.status === "active");
  const lowStockProducts = activeProducts.filter(p => p.current_stock <= p.min_stock);
  const recentMovements = movements.slice(0, 10);

  const getMovementColor = (type: Movement["type"]) => {
    switch (type) {
      case "entry": return "text-success";
      case "exit": return "text-destructive";
      case "adjustment": return "text-info";
    }
  };

  const getMovementLabel = (type: Movement["type"]) => {
    switch (type) {
      case "entry": return "Entrada";
      case "exit": return "Saída";
      case "adjustment": return "Ajuste";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts.length}</div>
            <p className="text-xs text-muted-foreground">Produtos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Abaixo do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimentações Hoje</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements.filter(m => {
              const today = new Date().toDateString();
              return new Date(m.created_at).toDateString() === today;
            }).length}</div>
            <p className="text-xs text-muted-foreground">Registros de hoje</p>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Produtos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-destructive">
                      {product.current_stock} {product.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mín: {product.min_stock} {product.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMovements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma movimentação registrada
            </p>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(movement => (
                <div key={movement.id} className="flex items-start justify-between py-3 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{movement.product_name}</p>
                      <Badge variant="outline" className={getMovementColor(movement.type)}>
                        {getMovementLabel(movement.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Setor ID: {movement.to_sector_id || movement.from_sector_id || "-"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {movement.created_by_name} • {new Date(movement.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm font-semibold ${getMovementColor(movement.type)}`}>
                      {movement.type === "entry" ? "+" : movement.type === "exit" ? "-" : ""}
                      {movement.quantity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}