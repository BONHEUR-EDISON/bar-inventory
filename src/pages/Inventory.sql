-- =========================
-- EXTENSIONS
-- =========================
create extension if not exists "uuid-ossp";

-- =========================
-- ORGANIZATIONS
-- =========================
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp default now()
);

-- =========================
-- USER ↔ ORGANIZATION
-- =========================
create table if not exists public.user_organizations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    role text not null default 'member',
    created_at timestamp default now(),
    unique (user_id, organization_id)
);

-- =========================
-- INVITATIONS
-- =========================
create table if not exists public.invitations (
    id uuid primary key default uuid_generate_v4(),
    email text not null,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    role text default 'member',
    token uuid default uuid_generate_v4(),
    accepted boolean default false,
    invited_by uuid references auth.users(id) on delete set null,
    created_at timestamp default now()
);

-- =========================
-- USER SETTINGS
-- =========================
create table if not exists public.user_settings (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid unique references auth.users(id) on delete cascade,
    theme text default 'light',
    created_at timestamp default now()
);

-- =========================
-- AUDIT LOGS
-- =========================
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete set null,
    action text,
    organization_id uuid references public.organizations(id) on delete cascade,
    created_at timestamp default now()
);

-- =========================
-- PRODUCTS
-- =========================
create table if not exists public.products (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    initial_stock numeric default 0,
    purchase_price numeric default 0,
    sale_price numeric default 0,
    created_at timestamp default now()
);

-- =========================
-- ENTRIES (ajouts de stock)
-- =========================
create table if not exists public.entries (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    product_id uuid references public.products(id) on delete cascade,
    quantity numeric not null,
    unit_price numeric not null,
    date date not null default now(),
    created_at timestamp default now()
);

-- =========================
-- OUTPUTS (ventes / sorties)
-- =========================
create table if not exists public.outputs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    product_id uuid references public.products(id) on delete cascade,
    quantity numeric not null,
    unit_price numeric not null,
    total numeric generated always as (quantity * unit_price) stored,
    date date not null default now(),
    created_at timestamp default now()
);

-- =========================
-- EXPENSES
-- =========================
create table if not exists public.expenses (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    label text not null,
    amount numeric not null,
    date date not null default now(),
    created_at timestamp default now()
);

-- =========================
-- FINAL STOCK (pour inventaire)
-- =========================
create table if not exists public.final_stock (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid references public.products(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    stock numeric not null,
    last_inventory_date date not null,
    created_at timestamp default now(),
    unique(product_id, organization_id)
);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_products_org on products(organization_id);
create index if not exists idx_entries_product on entries(product_id);
create index if not exists idx_entries_org on entries(organization_id);
create index if not exists idx_entries_date on entries(date);
create index if not exists idx_outputs_product on outputs(product_id);
create index if not exists idx_outputs_org on outputs(organization_id);
create index if not exists idx_outputs_date on outputs(date);
create index if not exists idx_expenses_org on expenses(organization_id);
create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_final_stock_org on final_stock(organization_id);

-- =========================
-- ENABLE RLS
-- =========================
alter table public.products enable row level security;
alter table public.entries enable row level security;
alter table public.outputs enable row level security;
alter table public.expenses enable row level security;
alter table public.organizations enable row level security;
alter table public.user_organizations enable row level security;
alter table public.invitations enable row level security;
alter table public.user_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.final_stock enable row level security;

-- =========================
-- POLICIES (RLS)
-- =========================
create policy "products access" on products for all
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "entries access" on entries for all
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "outputs access" on outputs for all
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "expenses access" on expenses for all
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "org_select" on organizations for select
using (id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "membership_select" on user_organizations for select
using (user_id = auth.uid());

create policy "membership_insert_admin" on user_organizations for insert
with check (exists (select 1 from user_organizations uo where uo.user_id = auth.uid() and uo.organization_id = user_organizations.organization_id and uo.role in ('owner', 'admin')));

create policy "invitation_select" on invitations for select
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "invitation_insert_admin" on invitations for insert
with check (exists (select 1 from user_organizations uo where uo.user_id = auth.uid() and uo.organization_id = invitations.organization_id and uo.role in ('owner', 'admin')));

create policy "settings_select" on user_settings for select
using (user_id = auth.uid());

create policy "settings_insert" on user_settings for insert
with check (user_id = auth.uid());

create policy "audit_select" on audit_logs for select
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

create policy "final_stock_access" on final_stock for all
using (organization_id in (select organization_id from user_organizations where user_id = auth.uid()));

-- =========================
-- FUNCTION: HANDLE NEW USER
-- =========================
create or replace function public.handle_new_user()
returns trigger as $$
declare
    org_id uuid;
begin
    insert into public.organizations (name, created_by)
    values ('My Organization', new.id)
    returning id into org_id;

    insert into public.user_organizations (user_id, organization_id, role)
    values (new.id, org_id, 'owner');

    insert into public.user_settings (user_id)
    values (new.id);

    return new;
end;
$$ language plpgsql security definer;

-- =========================
-- TRIGGER: ON AUTH USER CREATED
-- =========================
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- INVENTAIRE AUTOMATIQUE
-- =========================
create or replace function public.run_inventory(date_start date, date_end date, org uuid)
returns table(
    product_id uuid,
    product_name text,
    stock_initial numeric,
    total_entries numeric,
    total_outputs numeric,
    final_stock numeric
) as $$
begin
    return query
    with last_stock as (
        select
            p.id as product_id,
            p.name as product_name,
            coalesce(fs.stock, p.initial_stock) as stock_initial
        from public.products p
        left join lateral (
            select f.stock
            from public.final_stock f
            where f.product_id = p.id
              and f.organization_id = org
            order by f.last_inventory_date desc
            limit 1
        ) fs on true
        where p.organization_id = org
    ),
    entries_sum as (
        select
            product_id,
            sum(quantity) as total_entries
        from public.entries
        where organization_id = org
          and date >= date_start
          and date <= date_end
        group by product_id
    ),
    outputs_sum as (
        select
            product_id,
            sum(quantity) as total_outputs
        from public.outputs
        where organization_id = org
          and date >= date_start
          and date <= date_end
        group by product_id
    )
    select
        ls.product_id,
        ls.product_name,
        ls.stock_initial,
        coalesce(e.total_entries,0) as total_entries,
        coalesce(o.total_outputs,0) as total_outputs,
        ls.stock_initial + coalesce(e.total_entries,0) - coalesce(o.total_outputs,0) as final_stock
    from last_stock ls
    left join entries_sum e on e.product_id = ls.product_id
    left join outputs_sum o on o.product_id = ls.product_id;
end;
$$ language plpgsql security definer;

-- =========================
-- ENREGISTRER L'INVENTAIRE
-- =========================
create or replace function public.save_inventory(date_start date, date_end date, org uuid)
returns void as $$
declare
    rec record;
begin
    for rec in select * from public.run_inventory(date_start, date_end, org)
    loop
        insert into public.final_stock(product_id, organization_id, stock, last_inventory_date, created_at)
        values (rec.product_id, org, rec.final_stock, date_end, now())
        on conflict (product_id, organization_id)
        do update set stock = excluded.stock, last_inventory_date = excluded.last_inventory_date;
    end loop;
end;
$$ language plpgsql security definer;