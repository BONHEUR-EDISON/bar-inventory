-- =========================
-- CLEAN
-- =========================
drop function if exists public.process_full_inventory cascade;
drop function if exists public.get_current_stock cascade;
drop function if exists public.handle_new_user cascade;
drop function if exists public.log_stock_changes cascade;

drop table if exists public.inventory_items cascade;
drop table if exists public.inventories cascade;
drop table if exists public.stock_movements cascade;
drop table if exists public.final_stock cascade;
drop table if exists public.products cascade;
drop table if exists public.user_organizations cascade;
drop table if exists public.organizations cascade;

create extension if not exists "uuid-ossp";

-- =========================
-- ORGANIZATIONS
-- =========================
create table public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    created_by uuid references auth.users(id),
    created_at timestamp default now()
);

-- =========================
-- USER ORG
-- =========================
create table public.user_organizations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    role text default 'member',
    created_at timestamp default now(),
    unique(user_id, organization_id)
);

-- =========================
-- PRODUCTS
-- =========================
create table public.products (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    name text not null,
    initial_stock numeric default 0,
    sale_price numeric default 0,
    min_stock numeric default 5,
    created_at timestamp default now()
);

-- =========================
-- FINAL STOCK
-- =========================
create table public.final_stock (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid references public.products(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    stock numeric not null,
    last_inventory_date timestamp,
    unique(product_id, organization_id)
);

-- =========================
-- STOCK MOVEMENTS
-- =========================
create table public.stock_movements (
    id uuid primary key default uuid_generate_v4(),
    product_id uuid references public.products(id) on delete cascade,
    organization_id uuid references public.organizations(id) on delete cascade,
    type text check (type in ('IN','OUT')),
    quantity numeric not null,
    source text,
    created_at timestamp default now()
);

-- =========================
-- INVENTORIES
-- =========================
create table public.inventories (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    created_by uuid references auth.users(id),
    inventory_date timestamp not null,
    total_value numeric default 0,
    created_at timestamp default now()
);

-- =========================
-- INVENTORY ITEMS
-- =========================
create table public.inventory_items (
    id uuid primary key default uuid_generate_v4(),
    inventory_id uuid references public.inventories(id) on delete cascade,
    product_id uuid references public.products(id) on delete cascade,
    product_name text,
    theoretical_stock numeric,
    real_stock numeric,
    difference numeric,
    movement_type text,
    unit_price numeric,
    total_price numeric,
    created_at timestamp default now()
);

-- =========================
-- INDEX
-- =========================
create index idx_products_org on public.products(organization_id);
create index idx_movements_product_org on public.stock_movements(product_id, organization_id);
create index idx_final_stock on public.final_stock(product_id, organization_id);

-- =========================
-- RLS
-- =========================
alter table public.organizations enable row level security;
alter table public.user_organizations enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.final_stock enable row level security;
alter table public.inventories enable row level security;
alter table public.inventory_items enable row level security;

-- =========================
-- POLICIES SAFE
-- =========================
create policy org_access
on public.organizations
for select
using (
    id in (
        select organization_id
        from public.user_organizations
        where user_id = auth.uid()
    )
);

create policy user_org_access
on public.user_organizations
for all
using (user_id = auth.uid());

create policy products_access
on public.products
for all
using (
    organization_id in (
        select organization_id from public.user_organizations where user_id = auth.uid()
    )
);

create policy movements_access
on public.stock_movements
for all
using (
    organization_id in (
        select organization_id from public.user_organizations where user_id = auth.uid()
    )
);

create policy final_stock_access
on public.final_stock
for all
using (
    organization_id in (
        select organization_id from public.user_organizations where user_id = auth.uid()
    )
);

create policy inventory_access
on public.inventories
for all
using (
    organization_id in (
        select organization_id from public.user_organizations where user_id = auth.uid()
    )
);

create policy inventory_items_access
on public.inventory_items
for all
using (
    inventory_id in (
        select id from public.inventories
        where organization_id in (
            select organization_id from public.user_organizations where user_id = auth.uid()
        )
    )
);

-- =========================
-- AUTO CREATE ORG FOR USER
-- =========================
create or replace function public.handle_new_user()
returns trigger as $$
declare
    org_id uuid;
begin
    insert into public.organizations(name, created_by)
    values ('My Organization', new.id)
    returning id into org_id;

    insert into public.user_organizations(user_id, organization_id, role)
    values (new.id, org_id, 'owner');

    return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- GET CURRENT STOCK
-- =========================
create or replace function public.get_current_stock(
    p_product uuid,
    p_org uuid,
    p_date timestamp default now()
)
returns numeric as $$
begin
    return (
        select
            coalesce(fs.stock, 0) +
            coalesce(sum(
                case
                    when sm.type = 'IN' then sm.quantity
                    when sm.type = 'OUT' then -sm.quantity
                end
            ), 0)
        from public.final_stock fs
        left join public.stock_movements sm
            on sm.product_id = fs.product_id
            and sm.organization_id = fs.organization_id
            and sm.created_at > coalesce(fs.last_inventory_date, '1970-01-01')
            and sm.created_at <= p_date
        where fs.product_id = p_product
        and fs.organization_id = p_org
    );
end;
$$ language plpgsql;

-- =========================
-- FULL INVENTORY FUNCTION
-- =========================
create or replace function public.process_full_inventory(
    p_org uuid,
    p_inventory_date timestamp,
    p_created_by uuid,
    p_products jsonb
)
returns void as $$
declare
    v_inventory_id uuid;
    item jsonb;

    v_product uuid;
    v_real_stock numeric;
    v_unit_price numeric;

    v_theoretical numeric;
    v_diff numeric;
    v_type text;

    v_total numeric := 0;
begin
    insert into public.inventories (
        organization_id,
        created_by,
        inventory_date
    )
    values (
        p_org,
        p_created_by,
        p_inventory_date
    )
    returning id into v_inventory_id;

    for item in select * from jsonb_array_elements(p_products)
    loop
        v_product := (item->>'product_id')::uuid;
        v_real_stock := (item->>'real_stock')::numeric;
        v_unit_price := coalesce((item->>'unit_price')::numeric, 0);

        v_theoretical := public.get_current_stock(v_product, p_org, p_inventory_date);
        v_diff := v_real_stock - v_theoretical;

        if v_diff = 0 then
            v_type := 'NONE';
        elsif v_diff > 0 then
            v_type := 'IN';
        else
            v_type := 'OUT';
        end if;

        if v_diff <> 0 then
            insert into public.stock_movements (
                product_id,
                organization_id,
                type,
                quantity,
                source,
                created_at
            )
            values (
                v_product,
                p_org,
                v_type,
                abs(v_diff),
                'inventory',
                p_inventory_date
            );
        end if;

        insert into public.inventory_items (
            inventory_id,
            product_id,
            product_name,
            theoretical_stock,
            real_stock,
            difference,
            movement_type,
            unit_price,
            total_price
        )
        select
            v_inventory_id,
            p.id,
            p.name,
            v_theoretical,
            v_real_stock,
            v_diff,
            v_type,
            v_unit_price,
            v_unit_price * abs(v_diff)
        from public.products p
        where p.id = v_product;

        v_total := v_total + (v_unit_price * abs(v_diff));

        insert into public.final_stock (
            product_id,
            organization_id,
            stock,
            last_inventory_date
        )
        values (
            v_product,
            p_org,
            v_real_stock,
            p_inventory_date
        )
        on conflict (product_id, organization_id)
        do update set
            stock = excluded.stock,
            last_inventory_date = excluded.last_inventory_date;

    end loop;

    update public.inventories
    set total_value = v_total
    where id = v_inventory_id;

end;
$$ language plpgsql;