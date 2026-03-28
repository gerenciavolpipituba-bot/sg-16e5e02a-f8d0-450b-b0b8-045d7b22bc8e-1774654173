import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Check, FileDown, Printer, Camera, FileText, FileSpreadsheet } from "lucide-react";
import { Product, Sector, Inventory, SectorCount } from "@/types";
import { storage } from "@/lib/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
    setInventories(storage.getInventories().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setProducts(storage.getProducts().filter(p => p.status === "active"));
    setSectors(storage.getSectors());
  };

  const handleCreateInventory = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const createdBy = formData.get("createdBy") as string;

    const sectorCounts: SectorCount[] = sectors.map(sector => {
      const sectorProducts = products.filter(p => p.sectors?.includes(sector.id));
      return {
        sectorId: sector.id,
        sectorName: sector.name,
        items: sectorProducts.map(p => ({
          productId: p.id,
          productName: p.name,
          systemStock: p.currentStock,
          unit: p.unit,
        }))
      };
    }).filter(sc => sc.items.length > 0);

    if (sectorCounts.length === 0) {
      alert("Nenhum produto está associado aos setores ativos. Associe os produtos aos setores no 'Cadastro de Produtos' primeiro.");
      return;
    }

    const inventory: Inventory = {
      id: Date.now().toString(),
      name,
      sectorCounts,
      status: "draft",
      createdBy,
      createdAt: new Date().toISOString(),
    };

    storage.addInventory(inventory);
    setIsDialogOpen(false);
    loadData();
  };

  const handleCountUpdate = (inventoryId: string, sectorId: string, productId: string, physicalCount: number | undefined) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory || inventory.status === "completed") return;

    const updatedSectorCounts = inventory.sectorCounts.map(sc => {
      if (sc.sectorId === sectorId) {
        const updatedItems = sc.items.map(item => {
          if (item.productId === productId) {
            return { ...item, physicalCount };
          }
          return item;
        });
        return { ...sc, items: updatedItems };
      }
      return sc;
    });

    storage.updateInventory(inventoryId, { sectorCounts: updatedSectorCounts });
    loadData();
    if (selectedInventory?.id === inventoryId) {
      setSelectedInventory({ ...inventory, sectorCounts: updatedSectorCounts });
    }
  };

  const handlePhotoUpload = (inventoryId: string, sectorId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoUrl = event.target?.result as string;
      const inventory = inventories.find(inv => inv.id === inventoryId);
      if (!inventory) return;

      const updatedSectorCounts = inventory.sectorCounts.map(sc => {
        if (sc.sectorId === sectorId) {
          return { ...sc, photoUrl };
        }
        return sc;
      });

      storage.updateInventory(inventoryId, { sectorCounts: updatedSectorCounts });
      loadData();
      if (selectedInventory?.id === inventoryId) {
        setSelectedInventory({ ...inventory, sectorCounts: updatedSectorCounts });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteInventory = (inventoryId: string) => {
    const inventory = inventories.find(inv => inv.id === inventoryId);
    if (!inventory) return;

    const productMap = new Map();

    inventory.sectorCounts.forEach(sc => {
      sc.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            totalSystemStock: prod?.currentStock || 0,
            totalPhysicalCount: 0,
            totalDifference: 0,
            sectorBreakdown: []
          });
        }
        
        const consolidated = productMap.get(item.productId);
        const physical = item.physicalCount || 0;

        consolidated.totalPhysicalCount += physical;
        consolidated.sectorBreakdown.push({
          sectorId: sc.sectorId,
          sectorName: sc.sectorName,
          systemStock: 0,
          physicalCount: physical,
          difference: 0
        });
      });
    });

    const consolidatedItems = Array.from(productMap.values()).map(ci => {
      ci.totalDifference = ci.totalPhysicalCount - ci.totalSystemStock;
      
      if (ci.totalDifference !== 0) {
        storage.addMovement({
          id: `adj-${inventoryId}-${ci.productId}-${Date.now()}`,
          productId: ci.productId,
          productName: ci.productName,
          type: "adjustment",
          quantity: ci.totalPhysicalCount,
          sectorId: "consolidated",
          sectorName: "Inventário Consolidado",
          responsible: inventory.createdBy,
          observation: `Ajuste do Inv. ${inventory.name}. Dif: ${ci.totalDifference > 0 ? "+" : ""}${ci.totalDifference}`,
          createdAt: new Date().toISOString(),
        });
        storage.updateProduct(ci.productId, { currentStock: ci.totalPhysicalCount });
      }
      return ci;
    });

    storage.updateInventory(inventoryId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      consolidatedItems
    });

    setSelectedInventory(null);
    loadData();
    onDataChange();
  };

  const exportSectorPDF = (inventoryName: string, sector: SectorCount) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Contagem de Inventario - ${sector.sectorName}`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Inventario: ${inventoryName}`, 14, 22);
    
    const tableData = sector.items.map(item => [
      item.productName,
      item.unit,
      "" 
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Produto', 'Unidade', 'Contagem Fisica (Anotar)']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
    });

    doc.save(`contagem-${sector.sectorName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const exportConsolidatedPDF = (inventory: Inventory) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Relatorio Consolidado de Inventario`, 14, 15);
    doc.setFontSize(11);
    doc.text(`Nome: ${inventory.name}`, 14, 22);
    doc.text(`Data: ${new Date(inventory.completedAt || inventory.createdAt).toLocaleDateString("pt-BR")}`, 14, 28);
    
    if (!inventory.consolidatedItems) return;

    const tableData = inventory.consolidatedItems.map(item => [
      item.productName,
      item.totalSystemStock.toString(),
      item.totalPhysicalCount.toString(),
      item.totalDifference > 0 ? `+${item.totalDifference}` : item.totalDifference.toString(),
      item.unit
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Produto', 'Estoque Sist.', 'Contagem Fis.', 'Diferenca', 'Unidade']],
      body: tableData,
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const val = parseFloat(data.cell.raw as string);
          if (val < 0) {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (val > 0) {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      }
    });

    doc.save(`consolidado-${inventory.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const exportConsolidatedExcel = (inventory: Inventory) => {
    if (!inventory.consolidatedItems) return;

    const excelData = inventory.consolidatedItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      const row: any = {
        "Código": product?.internalCode || "N/A",
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
    
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
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
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidado");

    const summaryData = [
      { "Informação": "Nome do Inventário", "Valor": inventory.name },
      { "Informação": "Responsável", "Valor": inventory.createdBy },
      { "Informação": "Data de Criação", "Valor": new Date(inventory.createdAt).toLocaleString("pt-BR") },
      { "Informação": "Data de Finalização", "Valor": new Date(inventory.completedAt || "").toLocaleString("pt-BR") },
      { "Informação": "Total de Produtos", "Valor": inventory.consolidatedItems.length.toString() },
      { "Informação": "Setores Envolvidos", "Valor": inventory.sectorCounts.map(sc => sc.sectorName).join(", ") }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    XLSX.writeFile(workbook, `inventario-consolidado-${inventory.name.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-heading font-bold">Inventário Consolidado</h2>
          <p className="text-sm text-muted-foreground">Contagem física multi-setor e ajuste de estoque</p>
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
              <DialogTitle>Iniciar Novo Inventário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInventory} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Inventário (Ex: Março 2026) *</Label>
                <Input id="name" name="name" placeholder="Inventário Mensal..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="createdBy">Responsável Geral *</Label>
                <Input id="createdBy" name="createdBy" placeholder="Seu nome" required />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                O sistema gerará as planilhas automaticamente baseado nos setores vinculados a cada produto no Cadastro.
              </p>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
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
              <p className="text-muted-foreground text-center">Nenhum inventário criado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          inventories.map(inventory => (
            <Card key={inventory.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {inventory.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Responsável: {inventory.createdBy} | Data: {new Date(inventory.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inventory.status === "completed" ? "default" : "secondary"}>
                      {inventory.status === "completed" ? "Finalizado" : "Em andamento"}
                    </Badge>
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
                  <Tabs defaultValue={inventory.status === "completed" ? "consolidated" : inventory.sectorCounts[0]?.sectorId}>
                    <TabsList className="mb-4 flex-wrap h-auto w-full justify-start">
                      {inventory.sectorCounts.map(sc => (
                         <TabsTrigger key={sc.sectorId} value={sc.sectorId}>Setor: {sc.sectorName}</TabsTrigger>
                      ))}
                      {inventory.status === "completed" && (
                         <TabsTrigger value="consolidated" className="bg-primary/5">Consolidado Final</TabsTrigger>
                      )}
                    </TabsList>

                    {inventory.sectorCounts.map(sc => (
                      <TabsContent key={sc.sectorId} value={sc.sectorId} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/30 p-4 rounded-lg border">
                          <div>
                            <p className="font-semibold">{sc.sectorName}</p>
                            <p className="text-sm text-muted-foreground">{sc.items.length} produtos para contagem física</p>
                          </div>
                          {inventory.status === "draft" && (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => exportSectorPDF(inventory.name, sc)}>
                                <Printer className="h-4 w-4 mr-2" />
                                Baixar PDF para Impressão
                              </Button>
                              <div className="relative">
                                <Input 
                                  type="file" 
                                  accept="image/*" 
                                  capture="environment"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={(e) => handlePhotoUpload(inventory.id, sc.sectorId, e)}
                                />
                                <Button variant="secondary" size="sm" className="relative pointer-events-none">
                                  <Camera className="h-4 w-4 mr-2" />
                                  {sc.photoUrl ? "Mudar Foto da Planilha" : "Anexar Foto da Planilha"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {sc.photoUrl && (
                          <div className="mt-2 bg-muted/10 p-2 rounded-lg border inline-block">
                            <p className="text-xs text-muted-foreground mb-2">Comprovante de contagem anexado:</p>
                            <img src={sc.photoUrl} alt="Comprovante de contagem" className="h-40 object-cover rounded-md border shadow-sm" />
                          </div>
                        )}

                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Unidade</TableHead>
                                {inventory.status === "draft" && <TableHead className="text-right w-[200px]">Contagem Física</TableHead>}
                                {inventory.status === "completed" && <TableHead className="text-right">Total Contado (Setor)</TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sc.items.map(item => (
                                <TableRow key={item.productId}>
                                  <TableCell className="font-medium">{item.productName}</TableCell>
                                  <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                                  {inventory.status === "draft" ? (
                                    <TableCell className="text-right">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Qtd..."
                                        value={item.physicalCount === undefined ? "" : item.physicalCount}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          handleCountUpdate(inventory.id, sc.sectorId, item.productId, val === "" ? undefined : parseFloat(val));
                                        }}
                                        className="w-32 text-right ml-auto"
                                      />
                                    </TableCell>
                                  ) : (
                                    <TableCell className="text-right font-medium">{item.physicalCount || 0}</TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    ))}

                    {inventory.status === "completed" && inventory.consolidatedItems && (
                      <TabsContent value="consolidated" className="space-y-4">
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
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-right">Estoque Sistema</TableHead>
                                <TableHead className="text-right">Soma Física (Geral)</TableHead>
                                <TableHead className="text-right">Diferença</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {inventory.consolidatedItems.map(item => (
                                <TableRow key={item.productId}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{item.productName}</p>
                                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">{item.totalSystemStock}</TableCell>
                                  <TableCell className="text-right font-medium">{item.totalPhysicalCount}</TableCell>
                                  <TableCell className="text-right">
                                     <span className={item.totalDifference === 0 ? "text-muted-foreground" : item.totalDifference > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                       {item.totalDifference > 0 ? "+" : ""}{item.totalDifference}
                                     </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>
                    )}

                    {inventory.status === "draft" && (
                      <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
                        <Button variant="ghost" onClick={() => setSelectedInventory(null)}>Ocultar Painel</Button>
                        <Button 
                          onClick={() => {
                            if(window.confirm("Atenção: Finalizar irá consolidar os dados de todos os setores e aplicar a diferença no estoque do sistema de forma permanente. Deseja continuar?")) {
                              handleCompleteInventory(inventory.id);
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Consolidar Contagens e Ajustar Estoque
                        </Button>
                      </div>
                    )}
                  </Tabs>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}