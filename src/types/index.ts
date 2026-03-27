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
  sectors: string[]; // IDs dos setores onde o produto está presente
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

export interface SectorCount {
  sectorId: string;
  sectorName: string;
  items: InventoryItem[];
  photoUrl?: string;
  countedBy?: string;
  countedAt?: string;
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
  name: string;
  sectorCounts: SectorCount[];
  status: "draft" | "completed";
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  consolidatedItems?: ConsolidatedItem[];
}

export interface ConsolidatedItem {
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