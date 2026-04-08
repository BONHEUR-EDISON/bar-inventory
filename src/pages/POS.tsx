import { useEffect, useState, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon } from "lucide-react";
import Ticket58mm from "../components/Ticket58mm";

// ================= TYPES =================
interface Product {
    id: string;
    name: string;
    category: string;
    sale_price: number;
    stock: number;
}

interface CartItem extends Product {
    quantity: number;
}

interface Client {
    id: string;
    name: string;
    phone?: string;
    total_debt: number;
}

// ================= COMPONENT =================
export default function POS() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile' | 'bank' | 'credit'>('cash');
    const [orgId, setOrgId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [lastSale, setLastSale] = useState<CartItem[]>([]);

    const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [flyingItems, setFlyingItems] = useState<any[]>([]);

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    useEffect(() => { fetchOrganization(); }, []);
    useEffect(() => { if (orgId) { fetchProducts(); fetchClients(); } }, [orgId]);

    // ================= DATA =================
    const fetchOrganization = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from("user_organizations")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle();
        setOrgId(data?.organization_id || null);
    };

    const fetchProducts = async () => {
        if (!orgId) return;
        const { data: productsData } = await supabase
            .from("products")
            .select("id,name,category,sale_price")
            .eq("organization_id", orgId);
        const { data: stockData } = await supabase
            .from("product_stock")
            .select("product_id,stock")
            .eq("organization_id", orgId);
        const merged: Product[] = productsData?.map((p: any) => ({
            ...p,
            stock: stockData?.find((s: any) => s.product_id === p.id)?.stock || 0
        })) || [];
        setProducts(merged);
    };

    const fetchClients = async () => {
        if (!orgId) return;
        const { data } = await supabase
            .from("clients")
            .select("id,name,phone,total_debt")
            .eq("organization_id", orgId)
            .order("name");
        setClients(data || []);
    };

    // ================= CART =================
    const addToCart = (product: Product) => {
        const ref = productRefs.current[product.id];
        const rect = ref?.getBoundingClientRect();
        const cartRect = document.querySelector(".cart-target")?.getBoundingClientRect();

        if (rect && cartRect) {
            const id = Math.random().toString();
            setFlyingItems([...flyingItems, {
                id,
                x: rect.left,
                y: rect.top,
                targetX: cartRect.left,
                targetY: cartRect.top
            }]);
            setTimeout(() => setFlyingItems(f => f.filter(i => i.id !== id)), 700);
        }

        setCart(prev => {
            const existing = prev.find(i => i.id === product.id);
            if (existing) {
                if (existing.quantity < product.stock) {
                    return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                }
                toast.error("Stock insuffisant");
                return prev;
            }
            return [...prev, { ...product, quantity: 1 }];
        });

        if (isMobile) setMobileCartOpen(true);
    };

    const updateQuantity = (id: string, qty: number) => {
        if (qty <= 0) {
            setCart(p => p.filter(i => i.id !== id));
        } else {
            setCart(p => p.map(i => i.id === id ? { ...i, quantity: qty } : i));
        }
    };

    const total = cart.reduce((s, i) => s + i.quantity * i.sale_price, 0);

    // ================= CHECKOUT =================
    const handleCheckout = async () => {
        if (!orgId) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (paymentMethod === 'credit' && !selectedClient) {
            toast.error("Sélectionne un client pour crédit");
            return;
        }

        try {
            const itemsPayload = cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                unit_price: item.sale_price
            }));

            const { error } = await supabase.rpc('create_pos_sale_full', {
                p_org: orgId,
                p_user: user.id,
                p_items: itemsPayload,
                p_client: selectedClient?.id || null,
                p_payment: paymentMethod
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success(paymentMethod === 'credit'
                ? "Vente en crédit enregistrée 💳"
                : "Vente validée ✅"
            );

            // Stocker la vente pour impression ticket
            setLastSale(cart);

            setCart([]);
            setSelectedClient(null);
            setPaymentMethod('cash');
            fetchProducts();
            fetchClients();
            if (isMobile) setMobileCartOpen(false);

        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // ================= FILTER =================
    const categories = ["All", ...Array.from(new Set(products.map(p => p.category)))];
    const filtered = products.filter(p =>
        (selectedCategory === "All" || p.category === selectedCategory) &&
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    // ================= UI =================
    return (
        <div className={`${darkMode ? 'dark' : ''} flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-900 font-sans relative`}>
            <Toaster />

            {/* HEADER TOGGLE */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-white/30 dark:bg-gray-800/40 shadow-md">
                    {darkMode ? <Sun className="text-yellow-400"/> : <Moon className="text-gray-700"/>}
                </button>
            </div>

            {/* PRODUITS */}
            <div className="flex-1 p-4 overflow-y-auto">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">Point de Vente</h1>

                <div className="flex gap-3 mb-4 flex-col md:flex-row">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un produit..."
                        className="p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 text-gray-900 dark:text-gray-100"
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-gray-100"
                    >
                        {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filtered.map(p => (
                        <motion.div
                            key={p.id}
                            ref={(el) => { productRefs.current[p.id] = el; }}
                            className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-4 rounded-xl shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between transition-transform duration-200 text-gray-900 dark:text-gray-100"
                            whileHover={{ scale: 1.05 }}
                            onClick={() => addToCart(p)}
                        >
                            <h2 className="font-semibold">{p.name}</h2>
                            <p className="text-indigo-600 font-bold text-lg mt-2">{p.sale_price}$</p>
                            <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Stock: {p.stock}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* MINI-CART MOBILE */}
            <AnimatePresence>
                {isMobile && mobileCartOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: "tween", duration: 0.3 }}
                        className="fixed top-0 right-0 w-60 h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl z-50 flex flex-col p-4"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="cart-target font-bold text-lg text-gray-800 dark:text-gray-100">Panier ({cart.length})</div>
                            <button onClick={() => setMobileCartOpen(false)}><X className="text-gray-800 dark:text-gray-200"/></button>
                        </div>

                        <select
                            value={selectedClient?.id || ""}
                            onChange={(e) => {
                                const c = clients.find(x => x.id === e.target.value) || null;
                                setSelectedClient(c);
                            }}
                            className="mb-3 p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-gray-100"
                        >
                            <option value="">Client anonyme</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.total_debt > 0 && `(Dette: ${c.total_debt}$)`}
                                </option>
                            ))}
                        </select>

                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as any)}
                            className="mb-3 p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-gray-100"
                        >
                            <option value="cash">Cash</option>
                            <option value="mobile">Mobile</option>
                            <option value="bank">Banque</option>
                            <option value="credit">Crédit</option>
                        </select>

                        <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-2">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center mb-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm p-2 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
                                    <span>{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/50 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/50 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <p className="font-bold text-lg text-gray-800 dark:text-gray-100">Total: {total.toFixed(2)} $</p>
                            <button
                                onClick={handleCheckout}
                                className="w-full bg-indigo-600 text-white py-3 rounded-xl mt-3 hover:bg-indigo-700 transition-colors shadow-lg"
                            >
                                Valider
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PANIER FIXE DESKTOP */}
            {!isMobile && (
                <div className="w-96 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-xl p-6 flex flex-col">
                    <div className="cart-target mb-4 font-bold text-xl text-gray-800 dark:text-gray-100">Panier ({cart.length})</div>

                    <select
                        value={selectedClient?.id || ""}
                        onChange={(e) => {
                            const c = clients.find(x => x.id === e.target.value) || null;
                            setSelectedClient(c);
                        }}
                        className="mb-4 p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-gray-100"
                    >
                        <option value="">Client anonyme</option>
                        {clients.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.total_debt > 0 && `(Dette: ${c.total_debt}$)`}
                            </option>
                        ))}
                    </select>

                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="mb-4 p-3 border rounded-lg shadow-sm backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900 dark:text-gray-100"
                    >
                        <option value="cash">Cash</option>
                        <option value="mobile">Mobile</option>
                        <option value="bank">Banque</option>
                        <option value="credit">Crédit</option>
                    </select>

                    <div className="flex-1 overflow-y-auto max-h-[70vh] space-y-2">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center mb-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm p-2 rounded-lg shadow-sm text-gray-900 dark:text-gray-100">
                                <span>{item.name}</span>
                                <div className="flex items-center gap-2">
                                    <button className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/50 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button className="px-2 py-1 bg-gray-200/70 dark:bg-gray-700/50 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4">
                        <p className="font-bold text-lg text-gray-800 dark:text-gray-100">Total: {total.toFixed(2)} $</p>
                        <button
                            onClick={handleCheckout}
                            className="w-full bg-indigo-600 text-white py-3 rounded-xl mt-3 hover:bg-indigo-700 transition-colors shadow-lg"
                        >
                            Valider
                        </button>
                    </div>
                </div>
            )}

            {/* FLYING ITEMS ANIMATION */}
            <AnimatePresence>
                {flyingItems.map(f => (
                    <motion.div
                        key={f.id}
                        initial={{ x: f.x, y: f.y, opacity: 1, scale: 1 }}
                        animate={{ x: f.targetX, y: f.targetY, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.7 }}
                        className="fixed w-8 h-8 bg-indigo-500 rounded-full pointer-events-none z-50"
                    />
                ))}
            </AnimatePresence>

            {/* TICKET 58MM */}
            {lastSale.length > 0 && (
                <Ticket58mm
                    orgName="Ma Société"
                    clientName={selectedClient?.name}
                    items={lastSale}
                    total={lastSale.reduce((s, i) => s + i.sale_price * i.quantity, 0)}
                />
            )}
        </div>
    );
}