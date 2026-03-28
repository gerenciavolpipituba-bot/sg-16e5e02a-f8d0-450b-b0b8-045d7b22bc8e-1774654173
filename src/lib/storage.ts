import { Product, Sector, Movement, Inventory } from "@/types";

const STORAGE_KEYS = {
  PRODUCTS: "estoque_products",
  SECTORS: "estoque_sectors",
  MOVEMENTS: "estoque_movements",
  INVENTORIES: "estoque_inventories",
};

const ESTOQUE_GERAL_ID = "estoque_geral_default";

// Garantir que o setor Estoque Geral existe
const ensureEstoqueGeral = (): void => {
  if (typeof window === "undefined") return;
  
  const sectors = storage.getSectors();
  const estoqueGeralExists = sectors.some(s => s.id === ESTOQUE_GERAL_ID);
  
  if (!estoqueGeralExists) {
    const estoqueGeral: Sector = {
      id: ESTOQUE_GERAL_ID,
      name: "Estoque Geral",
      description: "Estoque geral do restaurante (setor padrão)",
      createdAt: new Date().toISOString(),
    };
    sectors.unshift(estoqueGeral);
    storage.saveSectors(sectors);
  }
};

export const storage = {
  // Reset all data
  resetAll: (): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SECTORS);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORIES);
    ensureEstoqueGeral();
  },

  // Sectors
  getSectors: (): Sector[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.SECTORS);
    const sectors = data ? JSON.parse(data) : [];
    return sectors;
  },
  
  saveSectors: (sectors: Sector[]): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.SECTORS, JSON.stringify(sectors));
  },
  
  addSector: (sector: Sector): void => {
    const sectors = storage.getSectors();
    sectors.push(sector);
    storage.saveSectors(sectors);
  },

  // Products
  getProducts: (): Product[] => {
    if (typeof window === "undefined") return [];
    ensureEstoqueGeral();
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  
  saveProducts: (products: Product[]): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },
  
  addProduct: (product: Product): void => {
    ensureEstoqueGeral();
    const products = storage.getProducts();
    
    // Garantir que o produto está vinculado ao Estoque Geral
    if (!product.sectors || !product.sectors.includes(ESTOQUE_GERAL_ID)) {
      product.sectors = product.sectors || [];
      if (!product.sectors.includes(ESTOQUE_GERAL_ID)) {
        product.sectors.unshift(ESTOQUE_GERAL_ID);
      }
    }
    
    products.push(product);
    storage.saveProducts(products);
  },
  
  updateProduct: (id: string, updates: Partial<Product>): void => {
    ensureEstoqueGeral();
    const products = storage.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      const updatedProduct = { ...products[index], ...updates };
      
      // Garantir que o produto continua vinculado ao Estoque Geral
      if (!updatedProduct.sectors || !updatedProduct.sectors.includes(ESTOQUE_GERAL_ID)) {
        updatedProduct.sectors = updatedProduct.sectors || [];
        if (!updatedProduct.sectors.includes(ESTOQUE_GERAL_ID)) {
          updatedProduct.sectors.unshift(ESTOQUE_GERAL_ID);
        }
      }
      
      products[index] = updatedProduct;
      storage.saveProducts(products);
    }
  },

  deleteProduct: (id: string): void => {
    const products = storage.getProducts();
    const filtered = products.filter(p => p.id !== id);
    storage.saveProducts(filtered);
  },

  // Atualizar produtos de uma categoria inteira para adicionar setores
  updateCategorySectors: (category: string, sectorIds: string[]): void => {
    ensureEstoqueGeral();
    const products = storage.getProducts();
    const updatedProducts = products.map(product => {
      if (product.category === category) {
        const currentSectors = product.sectors || [];
        const newSectors = Array.from(new Set([...currentSectors, ...sectorIds]));
        // Garantir Estoque Geral sempre presente
        if (!newSectors.includes(ESTOQUE_GERAL_ID)) {
          newSectors.unshift(ESTOQUE_GERAL_ID);
        }
        return { ...product, sectors: newSectors };
      }
      return product;
    });
    storage.saveProducts(updatedProducts);
  },
  
  // Movements
  getMovements: (): Movement[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return data ? JSON.parse(data) : [];
  },
  
  saveMovements: (movements: Movement[]): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  },
  
  addMovement: (movement: Movement): void => {
    const movements = storage.getMovements();
    movements.unshift(movement);
    storage.saveMovements(movements);
  },
  
  // Inventories
  getInventories: (): Inventory[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.INVENTORIES);
    return data ? JSON.parse(data) : [];
  },
  
  saveInventories: (inventories: Inventory[]): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.INVENTORIES, JSON.stringify(inventories));
  },
  
  addInventory: (inventory: Inventory): void => {
    const inventories = storage.getInventories();
    inventories.push(inventory);
    storage.saveInventories(inventories);
  },
  
  updateInventory: (id: string, updates: Partial<Inventory>): void => {
    const inventories = storage.getInventories();
    const index = inventories.findIndex(inv => inv.id === id);
    if (index !== -1) {
      inventories[index] = { ...inventories[index], ...updates };
      storage.saveInventories(inventories);
    }
  },

  deleteInventory: (id: string): void => {
    const inventories = storage.getInventories();
    const filtered = inventories.filter(inv => inv.id !== id);
    storage.saveInventories(filtered);
  },
};

// Inicializar Estoque Geral na primeira carga
if (typeof window !== "undefined") {
  ensureEstoqueGeral();
}