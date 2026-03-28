-- Criar enum para tipos de usuário
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'stock_keeper', 'viewer');

-- Criar enum para status de produto
CREATE TYPE product_status AS ENUM ('active', 'inactive');

-- Criar enum para status de inventário
CREATE TYPE inventory_status AS ENUM ('in_progress', 'completed');

-- Criar enum para tipo de movimentação
CREATE TYPE movement_type AS ENUM ('entry', 'exit', 'adjustment', 'transfer');

-- Adicionar role e department ao profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'viewer';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department text;

-- Criar tabela de setores
CREATE TABLE sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Criar tabela de produtos
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  min_stock numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  status product_status DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

-- Criar tabela de relação produto-setor
CREATE TABLE product_sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES sectors(id) ON DELETE CASCADE,
  stock_quantity numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, sector_id)
);

-- Criar tabela de inventários
CREATE TABLE inventories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status inventory_status DEFAULT 'in_progress',
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name text
);

-- Criar tabela de contagens de inventário
CREATE TABLE inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid REFERENCES inventories(id) ON DELETE CASCADE,
  sector_id uuid REFERENCES sectors(id) ON DELETE CASCADE,
  sector_name text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  system_stock numeric DEFAULT 0,
  physical_count numeric DEFAULT 0,
  difference numeric DEFAULT 0,
  unit text NOT NULL,
  counted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  counted_by_name text,
  counted_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de movimentações
CREATE TABLE movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  type movement_type NOT NULL,
  quantity numeric NOT NULL,
  from_sector_id uuid REFERENCES sectors(id) ON DELETE SET NULL,
  to_sector_id uuid REFERENCES sectors(id) ON DELETE SET NULL,
  reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name text
);

-- Criar índices para melhor performance
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_inventories_status ON inventories(status);
CREATE INDEX idx_inventory_counts_inventory ON inventory_counts(inventory_id);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_created_at ON movements(created_at);
CREATE INDEX idx_product_sectors_product ON product_sectors(product_id);
CREATE INDEX idx_product_sectors_sector ON product_sectors(sector_id);