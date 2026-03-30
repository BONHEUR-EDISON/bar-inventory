-- =========================
-- EXTENSIONS
-- =========================
create extension if not exists "uuid-ossp";

-- =========================
-- ORGANIZATIONS
-- =========================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamp default now()
);

-- =========================
-- PROFILES (LIÉ À AUTH)
-- =========================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  created_at timestamp default now()
);

-- =========================
-- PRODUCTS
-- =========================
create table products (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  initial_stock numeric default 0,
  purchase_price numeric default 0,
  sale_price numeric default 0,
  created_at timestamp default now()
);

-- =========================
-- ENTRIES (ENTRÉES)
-- =========================
create table entries (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity numeric not null,
  unit_price numeric not null,
  date date not null,
  created_at timestamp default now()
);

-- =========================
-- OUTPUTS (VENTES)
-- =========================
create table outputs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity numeric not null,
  unit_price numeric not null,
  total numeric generated always as (quantity * unit_price) stored,
  date date not null,
  created_at timestamp default now()
);

-- =========================
-- EXPENSES (DÉPENSES)
-- =========================
create table expenses (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  label text not null,
  amount numeric not null,
  date date not null,
  created_at timestamp default now()
);

-- =========================
-- INDEX (PERFORMANCE)
-- =========================
create index idx_products_org on products(organization_id);

create index idx_entries_product on entries(product_id);
create index idx_entries_org on entries(organization_id);
create index idx_entries_date on entries(date);

create index idx_outputs_product on outputs(product_id);
create index idx_outputs_org on outputs(organization_id);
create index idx_outputs_date on outputs(date);

create index idx_expenses_org on expenses(organization_id);
create index idx_expenses_date on expenses(date);

-- =========================
-- ENABLE RLS
-- =========================
alter table products enable row level security;
alter table entries enable row level security;
alter table outputs enable row level security;
alter table expenses enable row level security;

-- =========================
-- POLICIES (SÉCURITÉ)
-- =========================

-- PRODUCTS
create policy "products access"
on products
for all
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

-- ENTRIES
create policy "entries access"
on entries
for all
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

-- OUTPUTS
create policy "outputs access"
on outputs
for all
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

-- EXPENSES
create policy "expenses access"
on expenses
for all
using (
  organization_id = (
    select organization_id from profiles where id = auth.uid()
  )
);

-- =========================
-- TRIGGER AUTO PROFILE
-- =========================
create function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();