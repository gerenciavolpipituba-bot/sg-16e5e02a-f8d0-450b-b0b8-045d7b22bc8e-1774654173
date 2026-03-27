import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Product } from "@/types";
import { storage } from "@/lib/storage";
import * as XLSX from "xlsx";

interface ImportManagerProps {
  onDataChange: () => void;
}

interface ImportResult {
  success: number;
  updated: number;
  errors: string[];
}

export function ImportManager({ onDataChange }: ImportManagerProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const downloadTemplate = () => {
    const headers = [
      "codigo_interno",
      "nome",
      "categoria",
      "unidade",
      "estoque_atual",
      "estoque_minimo",
      "custo_medio",
      "status"
    ];
    
    const exampleRows = [
      {
        codigo_interno: "HF001",
        nome: "Tomate",
        categoria: "Hortifruti",
        unidade: "kg",
        estoque_atual: 50,
        estoque_minimo: 10,
        custo_medio: 8.50,
        status: "active"
      },
      {
        codigo_interno: "BEB001",
        nome: "Cerveja Lata",
        categoria: "Bebidas",
        unidade: "un",
        estoque_atual: 120,
        estoque_minimo: 30,
        custo_medio: 3.20,
        status: "active"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(exampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "template-importacao-produtos.xlsx");
  };

  const processFileData = (data: any[]) => {
    if (data.length === 0) {
      setResult({
        success: 0,
        updated: 0,
        errors: ["Arquivo vazio ou sem dados"]
      });
      setImporting(false);
      return;
    }

    let successCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    const existingProducts = storage.getProducts();

    data.forEach((row, index) => {
      try {
        // Normalizar nomes de colunas
        const rowData: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, "_");
          rowData[normalizedKey] = row[key];
        });

        // Extrair dados com múltiplas variações de nomes
        const nome = rowData.nome || rowData.nome_do_produto || rowData.produto;
        const categoria = rowData.categoria;
        const unidade = rowData.unidade || rowData.unidade_de_medida || rowData.un;
        const codigoInterno = rowData.codigo_interno || rowData.codigo || rowData.cod;

        // Validar campos obrigatórios
        if (!nome || !categoria || !unidade) {
          errors.push(`Linha ${index + 2}: Campos obrigatórios faltando (nome, categoria, unidade)`);
          return;
        }

        // Normalizar unidade
        const unitNormalized = String(unidade).toLowerCase().trim();
        let finalUnit: "kg" | "g" | "litro" | "ml" | "un" = "un";

        if (unitNormalized === "kg" || unitNormalized === "kilo" || unitNormalized === "quilograma") {
          finalUnit = "kg";
        } else if (unitNormalized === "g" || unitNormalized === "grama" || unitNormalized === "gramas") {
          finalUnit = "g";
        } else if (unitNormalized === "litro" || unitNormalized === "l" || unitNormalized === "lt") {
          finalUnit = "litro";
        } else if (unitNormalized === "ml" || unitNormalized === "mililitro") {
          finalUnit = "ml";
        } else if (unitNormalized === "un" || unitNormalized === "unidade" || unitNormalized === "und" || unitNormalized === "pc" || unitNormalized === "pç") {
          finalUnit = "un";
        } else {
          errors.push(`Linha ${index + 2}: Unidade inválida "${unidade}". Use: kg, g, litro, ml ou un`);
          return;
        }

        // Verificar se produto já existe
        const existingProduct = codigoInterno 
          ? existingProducts.find(p => p.internalCode === String(codigoInterno).trim())
          : null;

        const product: Product = {
          id: existingProduct?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: String(nome).trim(),
          category: String(categoria).trim(),
          unit: finalUnit,
          currentStock: parseFloat(rowData.estoque_atual || rowData.estoque || "0") || 0,
          minStock: parseFloat(rowData.estoque_minimo || rowData.minimo || "0") || 0,
          avgCost: parseFloat(rowData.custo_medio || rowData.custo || "0") || 0,
          internalCode: codigoInterno ? String(codigoInterno).trim() : `AUTO${Date.now()}${index}`,
          status: (String(rowData.status || "active").toLowerCase() === "inactive" ? "inactive" : "active") as "active" | "inactive",
          sectors: existingProduct?.sectors || [],
          createdAt: existingProduct?.createdAt || new Date().toISOString(),
        };

        if (existingProduct) {
          storage.updateProduct(existingProduct.id, product);
          updatedCount++;
        } else {
          storage.addProduct(product);
          successCount++;
        }
      } catch (error) {
        errors.push(`Linha ${index + 2}: Erro ao processar dados - ${error instanceof Error ? error.message : "erro desconhecido"}`);
      }
    });

    setResult({
      success: successCount,
      updated: updatedCount,
      errors
    });

    if (successCount > 0 || updatedCount > 0) {
      onDataChange();
    }
    setImporting(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        
        if (file.name.endsWith(".csv")) {
          const text = data as string;
          const lines = text.split("\n").filter(line => line.trim());
          
          if (lines.length < 2) {
            setResult({
              success: 0,
              updated: 0,
              errors: ["Arquivo CSV vazio ou sem dados"]
            });
            setImporting(false);
            return;
          }

          const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
          const dataLines = lines.slice(1);

          const parsedData = dataLines.map(line => {
            const values = line.split(",").map(v => v.trim());
            const rowData: Record<string, string> = {};
            headers.forEach((header, i) => {
              rowData[header] = values[i] || "";
            });
            return rowData;
          });

          processFileData(parsedData);
        } else {
          // Processar Excel
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          processFileData(jsonData);
        }
      } catch (error) {
        setResult({
          success: 0,
          updated: 0,
          errors: [`Erro ao ler arquivo: ${error instanceof Error ? error.message : "Verifique o formato do arquivo"}`]
        });
        setImporting(false);
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    
    // Limpar input para permitir re-upload do mesmo arquivo
    e.target.value = "";
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading font-bold">Importação de Produtos</h2>
        <p className="text-sm text-muted-foreground">Importe ou atualize produtos em massa via Excel ou CSV</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como importar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. Baixe o template Excel com os campos corretos
            </p>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template Excel
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              2. Preencha o arquivo com seus produtos ou use sua planilha existente
            </p>
            <p className="text-xs text-muted-foreground">
              • Campos obrigatórios: nome, categoria, unidade<br />
              • Unidades aceitas: kg, g, litro, ml, un (aceita variações como "kilo", "unidade", etc)<br />
              • Status: active ou inactive (padrão: active)<br />
              • Se o código interno já existir, o produto será atualizado automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              3. Faça upload do arquivo preenchido
            </p>
            <div className="flex items-center gap-2">
              <Button asChild disabled={importing}>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? "Processando..." : "Selecionar Arquivo"}
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={importing}
                  />
                </label>
              </Button>
              <span className="text-xs text-muted-foreground">Excel (.xlsx, .xls) ou CSV</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Alert variant={result.errors.length > 0 && result.success === 0 && result.updated === 0 ? "destructive" : "default"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {result.success > 0 && (
                <p className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <strong>{result.success} {result.success === 1 ? "produto criado" : "produtos criados"} com sucesso!</strong>
                </p>
              )}
              {result.updated > 0 && (
                <p className="flex items-center gap-2 text-info">
                  <CheckCircle2 className="h-4 w-4" />
                  <strong>{result.updated} {result.updated === 1 ? "produto atualizado" : "produtos atualizados"} com sucesso!</strong>
                </p>
              )}
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold mb-1">
                    {result.success > 0 || result.updated > 0 ? "Alguns produtos tiveram problemas:" : "Erros encontrados:"}
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {result.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... e mais {result.errors.length - 10} erros</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos aceitos na importação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead>Variações aceitas</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Exemplo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-sm">nome</TableCell>
                  <TableCell className="text-xs">nome, nome_do_produto, produto</TableCell>
                  <TableCell><span className="text-destructive font-semibold">Sim</span></TableCell>
                  <TableCell>Tomate</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">categoria</TableCell>
                  <TableCell className="text-xs">categoria</TableCell>
                  <TableCell><span className="text-destructive font-semibold">Sim</span></TableCell>
                  <TableCell>Hortifruti</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">unidade</TableCell>
                  <TableCell className="text-xs">unidade, unidade_de_medida, un</TableCell>
                  <TableCell><span className="text-destructive font-semibold">Sim</span></TableCell>
                  <TableCell>kg, g, litro, ml, un</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">codigo_interno</TableCell>
                  <TableCell className="text-xs">codigo_interno, codigo, cod</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>HF001</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">estoque_atual</TableCell>
                  <TableCell className="text-xs">estoque_atual, estoque</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">estoque_minimo</TableCell>
                  <TableCell className="text-xs">estoque_minimo, minimo</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>10</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">custo_medio</TableCell>
                  <TableCell className="text-xs">custo_medio, custo</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>8.50</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-sm">status</TableCell>
                  <TableCell className="text-xs">status</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>active, inactive</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">💡 Dica importante:</p>
            <p className="text-sm text-muted-foreground">
              Se você já tem uma planilha com colunas diferentes, o sistema tenta reconhecer automaticamente variações comuns dos nomes. 
              Por exemplo, "nome_do_produto" será reconhecido como "nome", "unidade_de_medida" como "unidade", etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}