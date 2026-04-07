'use client'

import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Product { id: string; name: string; category: string; sale_price: number; stock: number }
interface CartItem extends Product { quantity: number }

function SearchBar({ search, setSearch }: any) {
  return (
    <input
      type="text"
      placeholder="Rechercher un produit..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="p-3 border rounded-lg flex-1 bg-white shadow focus:ring-2 focus:ring-indigo-500 outline-none"
    />
  );
}

function CategoryFilter({ categories, selected, setSelected }: any) {
  return (
    <select
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      className="p-3 border rounded-lg w-40 bg-white shadow focus:ring-2 focus:ring-indigo-500 outline-none"
    >
      {categories.map((cat: string) => <option key={cat}>{cat}</option>)}
    </select>
  );
}

function ProductCard({ product, onAdd, refProp }: any) {
  return (
    <motion.div
      className="bg-white rounded-lg shadow p-4 flex flex-col justify-between hover:shadow-xl cursor-pointer h-40 relative"
      whileHover={{ scale: 1.03 }}
      layout
      ref={refProp}
    >
      <div className="truncate">
        <h2 className="font-semibold text-md truncate">{product.name}</h2>
        <p className="text-indigo-600 font-bold mt-1">{product.sale_price.toFixed(2)} $</p>
        <p className="text-gray-400 text-xs mt-1">Stock: {product.stock}</p>
      </div>
      <button
        disabled={product.stock === 0}
        onClick={() => onAdd(product, refProp)}
        className={`mt-3 py-1 rounded text-white font-medium transition ${
          product.stock === 0 ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        Ajouter
      </button>
    </motion.div>
  );
}

function CartItemRow({ item, onUpdate, onRemove }: any) {
  return (
    <motion.div
      className="flex justify-between items-center mb-2 p-2 bg-gray-50 rounded-lg shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <div className="truncate">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-gray-500 text-xs">{item.quantity} × {item.sale_price.toFixed(2)} $</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onUpdate(item.id, item.quantity - 1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">-</button>
        <input type="number" value={item.quantity} min={1} max={item.stock} onChange={(e) => onUpdate(item.id, parseInt(e.target.value))} className="w-12 text-center border rounded px-1 py-0.5" />
        <button onClick={() => onUpdate(item.id, item.quantity + 1)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">+</button>
        <button onClick={() => onRemove(item.id)} className="text-red-500 font-bold"><X size={16} /></button>
      </div>
    </motion.div>
  );
}

function CartPanel({ cart, total, onUpdate, onRemove, onCheckout, isMobile, open, onClose }: any) {
  return (
    <AnimatePresence>
      {(isMobile ? open : true) && (
        <motion.div
          className={`fixed bottom-0 left-0 w-full md:relative md:w-96 bg-white/95 shadow-lg flex flex-col h-screen md:flex-shrink-0 backdrop-blur-sm z-50`}
          initial={{ y: isMobile ? "100%" : 0 }}
          animate={{ y: 0 }}
          exit={{ y: isMobile ? "100%" : 0 }}
          transition={{ type: "tween", duration: 0.3 }}
        >
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white/95 z-10 cart-target backdrop-blur-sm">
            <h2 className="font-bold text-xl">Panier</h2>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white px-2 py-1 rounded-full text-sm">{cart.length}</span>
              {isMobile && <button onClick={onClose} className="text-gray-600 font-bold"><X size={20} /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence>
              {cart.map((item: any) => (
                <CartItemRow key={item.id} item={item} onUpdate={onUpdate} onRemove={onRemove} />
              ))}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t sticky bottom-0 bg-white/95 z-10 backdrop-blur-sm">
            <p className="font-bold text-lg">Total: {total.toFixed(2)} $</p>
            <button
              onClick={onCheckout}
              disabled={!cart.length}
              className="w-full mt-3 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              Valider
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [flyingItems, setFlyingItems] = useState<any[]>([]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => { fetchOrganization(); }, []);
  useEffect(() => { if (orgId) fetchProducts(); }, [orgId]);

  const fetchOrganization = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    setOrgId(data?.organization_id);
  };

  const fetchProducts = async () => {
    setLoading(true);
    if (!orgId) return;
    const { data: productsData, error: prodErr } = await supabase
      .from("products")
      .select("id,name,category,sale_price")
      .eq("organization_id", orgId);
    if (prodErr) { toast.error("Erreur chargement produits"); setLoading(false); return; }

    const { data: stockData, error: stockErr } = await supabase
      .from("product_stock")
      .select("product_id,stock")
      .eq("organization_id", orgId);
    if (stockErr) { toast.error("Erreur récupération stock"); setLoading(false); return; }

    const merged = productsData?.map((p: any) => ({
      ...p,
      stock: stockData?.find((s: any) => s.product_id === p.id)?.stock || 0
    })) || [];

    setProducts(merged);
    setLoading(false);
  };

  const addToCart = (product: Product, ref: any) => {
    const rect = ref.current?.getBoundingClientRect();
    const cartRect = document.querySelector(".cart-target")?.getBoundingClientRect();

    if (rect && cartRect) {
      const id = Math.random().toString(36).substr(2, 9);
      setFlyingItems([...flyingItems, { id, x: rect.left, y: rect.top, targetX: cartRect.left + 20, targetY: cartRect.top + 20 }]);
      setTimeout(() => setFlyingItems(f => f.filter(fly => fly.id !== id)), 700);
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        if (existing.quantity < product.stock) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        toast.error("Stock insuffisant"); return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    if (isMobile) setMobileCartOpen(true);
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) return setCart(p => p.filter(i => i.id !== id));
    setCart(p => p.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const total = cart.reduce((s, i) => s + i.quantity * i.sale_price, 0);

  const handleCheckout = async () => {
    if (!orgId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const itemsPayload = cart.map(item => ({ product_id: item.id, quantity: item.quantity, unit_price: item.sale_price }));
      const { error } = await supabase.rpc('create_pos_sale', { p_org: orgId, p_user: user.id, p_items: itemsPayload });
      if (error) { toast.error("Erreur lors de la validation : " + error.message); return; }

      toast.success("Commande validée !");
      setCart([]);
      fetchProducts();
      if (isMobile) setMobileCartOpen(false);
    } catch (err: any) { toast.error("Erreur inattendue : " + err.message); }
  };

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p => (selectedCategory === "All" || p.category === selectedCategory) && p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      <Toaster />

      {/* Products scroll */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto relative">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">POS</h1>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <SearchBar search={search} setSearch={setSearch} />
          <CategoryFilter categories={categories} selected={selectedCategory} setSelected={setSelectedCategory} />
        </div>

        {loading ? (
          <p className="text-center mt-20 text-gray-500">Chargement...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={addToCart}
                refProp={el => (productRefs.current[p.id] = el)}
              />
            ))}
          </div>
        )}

        {/* flying items */}
        {flyingItems.map(item => (
          <motion.div
            key={item.id}
            className="absolute bg-indigo-500 rounded-full w-4 h-4 z-50"
            initial={{ x: item.x, y: item.y, scale: 1 }}
            animate={{ x: item.targetX, y: item.targetY, scale: 0.3, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Cart */}
      <CartPanel
        cart={cart}
        total={total}
        onUpdate={updateQuantity}
        onRemove={id => setCart(p => p.filter(i => i.id !== id))}
        onCheckout={handleCheckout}
        isMobile={isMobile}
        open={mobileCartOpen}
        onClose={() => setMobileCartOpen(false)}
      />
    </div>
  );
}