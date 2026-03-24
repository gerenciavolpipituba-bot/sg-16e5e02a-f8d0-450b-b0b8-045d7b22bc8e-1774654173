export interface Product {
  id: string;
  name: string;
  category: string;
  unit: "kg" | "un" | "litro" | "ml" | "g";
  currentStock: number;
  minStock: number;
  avgCost: number;
  internalCode: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  type: "entry" | "exit" | "adjustment";
  quantity: number;
  sectorId: string;
  sectorName: string;
  responsible: string;
  observation?: string;
  createdAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  systemStock: number;
  physicalCount?: number;
  difference?: number;
  unit: string;
}

export interface Inventory {
  id: string;
  sectorId: string;
  sectorName: string;
  items: InventoryItem[];
  status: "draft" | "completed";
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}