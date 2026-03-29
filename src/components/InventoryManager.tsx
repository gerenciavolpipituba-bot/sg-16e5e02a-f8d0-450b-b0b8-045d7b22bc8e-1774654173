import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Check, FileDown, FileText, FileSpreadsheet, Trash2 } from "lucide-react";
import { productService } from "@/services/productService";
import { sectorService } from "@/services/sectorService";
import { inventoryService } from "@/services/inventoryService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type Inventory = Database["public"]["Tables"]["inventories"]["Row"];
type InventoryCount = Database["public"]["Tables"]["inventory_counts"]["Row"];

interface InventoryManagerProps {
  onDataChange: () => void;
}

interface ConsolidatedItem {
  productId: string;
  productName: string;
  unit: string;
  totalSystemStock: number;
  totalPhysicalCount: number;
  totalDifference: number;
  sectorBreakdown: {
    sectorId: string;
    sectorName: string;
    systemStock: number;
    physicalCount: number;
    difference: number;
  }[];
}

export function InventoryManager({ onDataChange }: InventoryManagerProps) {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    loadData();

    const unsubscribe = inventoryService.subscribeToInventories(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [inventoriesData, countsData, productsData, sectorsData] = await Promise.all([
        inventoryService.getAll(),
        inventoryService.getCounts(),
        productService.getAll(),
        sectorService.getAll()
      ]);
      
      setInventories(inventoriesData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      setInventoryCounts(countsData);
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

  const handleDeleteInventory = async (inventoryId: string, inventoryName: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o inventário "${inventoryName}"?\n\nEsta ação não pode ser desfeita.`)) {
      try {
        await inventoryService.delete(inventoryId);
        
        if (selectedInventory?.id === inventoryId) {
          setSelectedInventory(null);
        }
        
        toast({
          title: "Inventário excluído",
          description: "O inventário foi removido com sucesso."
        });
        
        loadData();
        onDataChange();
      } catch (error: any) {
        toast({
          title: "Erro ao excluir inventário",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  const handleCreateInventory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const name = formData.get("name") as string;
    const profile = await userService.getCurrentProfile();
    
    if (!profile) {
      toast({
        title: "Erro",
        description: "Usuário não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      await inventoryService.create({
        name,
        created_by: profile.id,
        created_by_name: profile.full_name,
        status: "in_progress"
      });

      toast({
        title: "Inventário criado",
        description: "Inventário criado com sucesso. Você pode começar as contagens."
      });

      setIsDialogOpen(false);
      loadData();
      onDataChange();
    } catch (error: any) {
      toast({
        title: "Erro ao criar inventário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSaveCount = async (inventoryId: string, productId: string, sectorId: string, count: number) => {
    try {
      const existingCount = inventoryCounts.find(
        c => c.inventory_id === inventoryId && c.product_id === productId && c.sector_id === sectorId
      );

      if (existingCount) {
        await inventoryService.updateCount(existingCount.id, { physical_count: count });
      } else {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        await inventoryService.saveCount({
          inventory_id: inventoryId,
          product_id: productId,
          sector_id: sectorId,
          system_stock: product.current_stock,
          physical_count: count
        });
      }

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar contagem",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCompleteInventory = async (inventoryId: string) => {
    if (!window.confirm("Finalizar inventário? Isso aplicará as diferenças ao estoque.")) {
      return;
    }

    try {
      await inventoryService.update(inventoryId, { status: "completed" });
      
      toast({
        title: "Inventário finalizado",
        description: "As diferenças foram aplicadas ao estoque."
      });

      loadData();
      onDataChange();
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar inventário",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getInventoryCounts = (inventoryId: string) => {
    return inventoryCounts.filter(c => c.inventory_id === inventoryId);
  };

  const getConsolidatedData = (inventoryId: string): ConsolidatedItem[] => {
    const counts = getInventoryCounts(inventoryId);
    const productMap = new Map<string, ConsolidatedItem>();

    counts.forEach(count => {
      const product = products.find(p => p.id === count.product_id);
      const sector = sectors.find(s => s.id === count.sector_id);
      
      if (!product || !sector) return;

      if (!productMap.has(count.product_id)) {
        productMap.set(count.product_id, {
          productId: count.product_id,
          productName: product.name,
          unit: product.unit,
          totalSystemStock: 0,
          totalPhysicalCount: 0,
          totalDifference: 0,
          sectorBreakdown: []
        });
      }

      const item = productMap.get(count.product_id)!;
      const difference = count.physical_count - count.system_stock;

      item.totalSystemStock += count.system_stock;
      item.totalPhysicalCount += count.physical_count;
      item.totalDifference += difference;
      item.sectorBreakdown.push({
        sectorId: count.sector_id,
        sectorName: sector.name,
        systemStock: count.system_stock,
        physicalCount: count.physical_count,
        difference
      });
    });

    return Array.from(productMap.values());
  };

  const exportConsolidatedPDF = (inventory: Inventory) => {
    const consolidatedData = getConsolidatedData(inventory.id);
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Relatório Consolidado de Inventário", 14, 15);
    doc.setFontSize(11);
    doc.text(`Nome: ${inventory.name}`, 14, 22);
    doc.text(`Data: ${new Date(inventory.completed_at || inventory.created_at).toLocaleDateString("pt-BR")}`, 14, 28);

    const tableData = consolidatedData.map(item => [
      item.productName,
      item.totalSystemStock.toString(),
      item.totalPhysicalCount.toString(),
      item.totalDifference > 0 ? `+${item.totalDifference}` : item.totalDifference.toString(),
      item.unit
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Produto", "Estoque Sist.", "Contagem Fís.", "Diferença", "Unidade"]],
      body: tableData,
      didParseCell: function(data) {
        if (data.section === "body" && data.column.index === 3) {
          const val = parseFloat(data.cell.raw as string);
          if (val < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (val > 0) {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      }
    });

    doc.save(`consolidado-${inventory.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const exportConsolidatedExcel = (inventory: Inventory) => {
    const consolidatedData = getConsolidatedData(inventory.id);

    const excelData = consolidatedData.map(item => {
      const product = products.find(p => p.id === item.productId);
      const row: any = {
        "Código": product?.internal_code || "N/A",
        "Produto": item.productName,
        "Unidade": item.unit,
      };

      item.sectorBreakdown.forEach(sb => {
        row[`${sb.sectorName} (Contado)`] = sb.physicalCount;
      });

      row["Total Contado"] = item.totalPhysicalCount;
      row["Estoque Sistema"] = item.totalSystemStock;
      row["Diferença"] = item.totalDifference;

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F1F5F9" } },
        alignment: { horizontal: "center" }
      };
    }

    const columnWidths = Object.keys(excelData[0] || {}).map(key => {
      const maxLength = Math.max(
        key.length,
        ...excelData.map(row => String(row[key] || "").length)
      );
      return { wch: Math.min(maxLength + 2, 30) };
    });
    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidado");

    const summaryData = [
      { "Informação": "Nome do Inventário", "Valor": inventory.name },
      { "Informação": "Responsável", "Valor": inventory.created_by_name },
      { "Informação": "Data de Criação", "Valor": new Date(inventory.created_at).toLocaleString("pt-BR") },
      { "Informação": "Data de Finalização", "Valor": inventory.completed_at ? new Date(inventory.completed_at).toLocaleString("pt-BR") : "Em andamento" },
      { "Informação": "Total de Produtos", "Valor": consolidatedData.length.toString() }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet["!cols"] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    XLSX.writeFile(workbook, `inventario-consolidado-${inventory.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">Inventário</h2>
          <p className="text-sm text-muted-foreground">Contagens físicas e consolidação</p>
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
                <Label htmlFor="name">Nome do Inventário *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ex: Inventário Mensal - Janeiro 2024"
                  required
                />
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
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum inventário criado ainda. Clique em "Novo Inventário" para começar.
            </CardContent>
          </Card>
        ) : (
          inventories.map(inventory => {
            const counts = getInventoryCounts(inventory.id);
            const consolidatedData = getConsolidatedData(inventory.id);

            return (
              <Card key={inventory.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {inventory.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Responsável: {inventory.created_by_name} | Data: {new Date(inventory.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inventory.status === "completed" ? "default" : "secondary"}>
                        {inventory.status === "completed" ? "Finalizado" : "Em andamento"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteInventory(inventory.id, inventory.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedInventory?.id === inventory.id ? "secondary" : "default"}
                        onClick={() => setSelectedInventory(selectedInventory?.id === inventory.id ? null : inventory)}
                      >
                        {selectedInventory?.id === inventory.id ? "Fechar Painel" : "Acessar Contagens"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {selectedInventory?.id === inventory.id && (
                  <CardContent className="pt-0">
                    <Tabs defaultValue="count">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="count">Realizar Contagens</TabsTrigger>
                        <TabsTrigger value="consolidated">Consolidado Final</TabsTrigger>
                      </TabsList>

                      <TabsContent value="count" className="space-y-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                {sectors.map(sector => (
                                  <TableHead key={sector.id} className="text-center">
                                    {sector.name}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {products.map(product => (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{product.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Estoque: {product.current_stock} {product.unit}
                                      </p>
                                    </div>
                                  </TableCell>
                                  {sectors.map(sector => {
                                    const count = counts.find(
                                      c => c.product_id === product.id && c.sector_id === sector.id
                                    );
                                    return (
                                      <TableCell key={sector.id}>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="0"
                                          defaultValue={count?.physical_count || ""}
                                          onBlur={(e) => {
                                            const value = parseFloat(e.target.value);
                                            if (!isNaN(value)) {
                                              handleSaveCount(inventory.id, product.id, sector.id, value);
                                            }
                                          }}
                                          disabled={inventory.status === "completed"}
                                        />
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {inventory.status !== "completed" && counts.length > 0 && (
                          <div className="flex justify-end pt-4">
                            <Button onClick={() => handleCompleteInventory(inventory.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Finalizar Inventário
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="consolidated" className="space-y-4">
                        {inventory.status === "completed" && (
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
                            <div>
                              <p className="font-semibold text-primary">Resumo Consolidado</p>
                              <p className="text-sm text-muted-foreground">Soma de todos os setores e impacto global no estoque</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => exportConsolidatedPDF(inventory)} className="gap-2">
                                <FileDown className="h-4 w-4" />
                                PDF
                              </Button>
                              <Button size="sm" onClick={() => exportConsolidatedExcel(inventory)} className="gap-2 bg-green-600 hover:bg-green-700">
                                <FileSpreadsheet className="h-4 w-4" />
                                Excel
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-right">Estoque Sistema</TableHead>
                                <TableHead className="text-right">Contagem Física</TableHead>
                                <TableHead className="text-right">Diferença</TableHead>
                                <TableHead>Unidade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {consolidatedData.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhuma contagem registrada ainda
                                  </TableCell>
                                </TableRow>
                              ) : (
                                consolidatedData.map(item => (
                                  <TableRow key={item.productId}>
                                    <TableCell className="font-medium">{item.productName}</TableCell>
                                    <TableCell className="text-right">{item.totalSystemStock}</TableCell>
                                    <TableCell className="text-right">{item.totalPhysicalCount}</TableCell>
                                    <TableCell className="text-right">
                                      <span className={item.totalDifference > 0 ? "text-success" : item.totalDifference < 0 ? "text-destructive" : ""}>
                                        {item.totalDifference > 0 && "+"}
                                        {item.totalDifference}
                                      </span>
                                    </TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}