import { Product, Sector, Movement, Inventory } from "@/types";

const STORAGE_KEYS = {
  PRODUCTS: "estoque_products",
  SECTORS: "estoque_sectors",
  MOVEMENTS: "estoque_movements",
  INVENTORIES: "estoque_inventories",
};

export const storage = {
  // Products
  getProducts: (): Product[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },
  
  saveProducts: (products: Product[]): void => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },
  
  addProduct: (product: Product): void => {
    const products = storage.getProducts();
    products.push(product);
    storage.saveProducts(products);
  },
  
  updateProduct: (id: string, updates: Partial<Product>): void => {
    const products = storage.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      storage.saveProducts(products);
    }
  },
  
  // Sectors
  getSectors: (): Sector[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEYS.SECTORS);
    return data ? JSON.parse(data) : [];
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
};