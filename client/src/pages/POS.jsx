import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { Search, Plus, Minus, Trash2, User, ShoppingBag, Printer, X, CheckCircle } from 'lucide-react';

// --- Receipt Modal ---
function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="p-6 print-area">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">TINDAHAN POS</h2>
            <p className="text-xs text-gray-500">{new Date(transaction.transaction_date).toLocaleString('en-PH')}</p>
            <p className="text-xs font-mono text-gray-600">{transaction.transaction_code}</p>
          </div>
          <div className="border-t border-b border-dashed py-3 space-y-1 mb-3">
            {transaction.items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{item.product_name} ({item.unit_label})</span>
                <span>x{item.quantity}</span>
                <span className="font-medium">₱{parseFloat(item.subtotal).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₱{parseFloat(transaction.subtotal).toFixed(2)}</span></div>
            {parseFloat(transaction.discount) > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₱{parseFloat(transaction.discount).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t pt-1"><span>TOTAL</span><span>₱{parseFloat(transaction.total_amount).toFixed(2)}</span></div>
            {transaction.payment_type === 'cash' && (
              <>
                <div className="flex justify-between"><span>Tendered</span><span>₱{parseFloat(transaction.amount_tendered).toFixed(2)}</span></div>
                <div className="flex justify-between text-blue-600 font-medium"><span>Change</span><span>₱{parseFloat(transaction.change_amount).toFixed(2)}</span></div>
              </>
            )}
            {transaction.payment_type === 'credit' && (
              <div className="text-center text-orange-500 text-xs mt-1">Charged to credit account</div>
            )}
          </div>
          {transaction.member_name && <p className="text-xs text-gray-500 mt-2 text-center">Customer: {transaction.member_name}</p>}
          <p className="text-center text-xs text-gray-400 mt-4">Thank you! Salamat!</p>
        </div>
        <div className="border-t p-4 flex gap-2 no-print">
          <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Printer size={16} /> Print</button>
          <button onClick={onClose} className="btn-primary flex-1">New Sale</button>
        </div>
      </div>
    </div>
  );
}

// --- Member Selector Modal ---
function MemberModal({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (q.length < 2) { setMembers([]); return; }
    const t = setTimeout(() => {
      api.get(`/members?q=${q}`).then(r => setMembers(r.data.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">Select Member</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-4">
          <input className="input" placeholder="Search by name or phone..." value={q} onChange={e => setQ(e.target.value)} autoFocus />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {members.map(m => (
            <button key={m.id} onClick={() => onSelect(m)} className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-0 transition-colors">
              <p className="font-medium text-sm">{m.full_name}</p>
              <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                <span>{m.phone}</span>
                <span className={m.credit_score < 60 ? 'text-red-500' : m.credit_score < 80 ? 'text-orange-500' : 'text-green-500'}>
                  Score: {m.credit_score}
                </span>
                <span>Available: ₱{parseFloat(m.available_credit || 0).toFixed(2)}</span>
              </div>
            </button>
          ))}
          {q.length >= 2 && members.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No members found</p>}
        </div>
      </div>
    </div>
  );
}

export default function POS() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [member, setMember] = useState(null);
  const [paymentType, setPaymentType] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [discount, setDiscount] = useState('');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);

  // Load all products and categories on mount
  useEffect(() => {
    api.get('/products').then(r => setAllProducts(r.data.data)).catch(() => {});
    api.get('/products/categories/all').then(r => setCategories(r.data.data)).catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setProducts([]); return; }
    const t = setTimeout(() => {
      api.get(`/products/search?q=${query}`).then(r => setProducts(r.data.data)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const baseProducts = query.trim() ? products : allProducts;
  const displayedProducts = activeCategory
    ? baseProducts.filter(p => p.category === activeCategory)
    : baseProducts;

  const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);
  const change = paymentType === 'cash' ? Math.max(0, (parseFloat(amountTendered) || 0) - total) : 0;

  const addToCart = useCallback((product, unit) => {
    setCart(prev => {
      const existing = prev.find(i => i.unit_id === unit.id);
      if (existing) {
        return prev.map(i => i.unit_id === unit.id
          ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
          : i
        );
      }
      return [...prev, {
        unit_id: unit.id,
        product_name: product.name,
        unit_label: unit.unit_label,
        price: parseFloat(unit.selling_price),
        qty: 1,
        subtotal: parseFloat(unit.selling_price),
        stock: parseFloat(unit.stock_quantity),
      }];
    });
    setQuery('');
    setProducts([]);
    searchRef.current?.focus();
  }, []);

  const handleCategoryClick = (cat) => {
    setActiveCategory(prev => prev === cat ? null : cat);
    setQuery('');
    setProducts([]);
  };

  const updateQty = (unit_id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.unit_id !== unit_id) return i;
      const newQty = Math.max(1, i.qty + delta);
      return { ...i, qty: newQty, subtotal: newQty * i.price };
    }));
  };

  const removeItem = (unit_id) => setCart(prev => prev.filter(i => i.unit_id !== unit_id));

  const placeOrder = async () => {
    if (!cart.length) return;
    if (paymentType === 'cash' && (parseFloat(amountTendered) || 0) < total) {
      setError('Amount tendered is less than total'); return;
    }
    if (paymentType === 'credit' && !member) {
      setError('Please select a member for credit purchase'); return;
    }

    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/transactions', {
        member_id: member?.id || null,
        payment_type: paymentType,
        discount: discountVal,
        amount_tendered: paymentType === 'cash' ? parseFloat(amountTendered) : 0,
        items: cart.map(i => ({ product_unit_id: i.unit_id, quantity: i.qty })),
      });
      if (data.success) {
        setReceipt(data.data);
        setCart([]);
        setMember(null);
        setAmountTendered('');
        setDiscount('');
        setPaymentType('cash');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const getStockBadge = (unit) => {
    if (unit.stock_quantity <= 0) return <span className="text-xs text-red-500">Out of stock</span>;
    if (unit.stock_quantity <= unit.low_stock_threshold) return <span className="text-xs text-orange-500">Low stock</span>;
    return null;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-3rem)]">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            ref={searchRef}
            className="input pl-10 text-base"
            placeholder="Search products..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveCategory(null); }}
            autoFocus
          />
          {query && (
            <button onClick={() => { setQuery(''); setProducts([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          <button
            onClick={() => { setActiveCategory(null); setQuery(''); setProducts([]); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Products
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.name)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat.name ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product List */}
        {displayedProducts.length > 0 && (
          <div className="overflow-y-auto flex-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* Product Image */}
                  <div className="w-full h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image_url}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag size={32} className="text-gray-300" />
                    )}
                  </div>
                  {/* Product Info + Units */}
                  <div className="p-2">
                    <p className="font-semibold text-xs text-gray-800 mb-2 truncate">{product.name}</p>
                    <div className="flex flex-col gap-1">
                      {product.units.map(unit => (
                        <button
                          key={unit.id}
                          onClick={() => addToCart(product, unit)}
                          disabled={unit.stock_quantity <= 0}
                          className="w-full flex justify-between items-center px-2 py-1.5 rounded-lg border-2 border-blue-100 bg-blue-50 hover:border-blue-500 hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div className="text-left">
                            <p className="text-xs font-medium text-blue-700">{unit.unit_label}</p>
                            {getStockBadge(unit)}
                          </div>
                          <p className="text-xs font-bold text-gray-900">₱{parseFloat(unit.selling_price).toFixed(2)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {query.length > 0 && displayedProducts.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl">
            <ShoppingBag size={40} className="mx-auto mb-2 opacity-30" />
            <p>No products found for "{query}"</p>
          </div>
        )}

        {!query && allProducts.length === 0 && (
          <div className="text-center text-gray-300 py-16 flex flex-col items-center">
            <Search size={48} className="mb-3" />
            <p className="text-lg">Loading products...</p>
          </div>
        )}
      </div>

      {/* Right: Cart Panel */}
      <div className="w-80 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-800">Cart ({cart.length} items)</h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-red-400 hover:text-red-600 text-xs">Clear all</button>
            )}
          </div>

          {/* Customer */}
          <button
            onClick={() => setShowMemberModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
          >
            <User size={16} className={member ? 'text-blue-500' : 'text-gray-400'} />
            {member ? (
              <div className="flex-1 text-left">
                <span className="font-medium text-blue-600">{member.full_name}</span>
                <span className="text-xs text-gray-400 ml-2">₱{parseFloat(member.available_credit || 0).toFixed(2)} credit</span>
              </div>
            ) : (
              <span className="text-gray-400">Walk-in customer (tap to select member)</span>
            )}
            {member && <button onClick={e => { e.stopPropagation(); setMember(null); setPaymentType('cash'); }} className="text-gray-400 hover:text-red-500"><X size={14} /></button>}
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 && (
            <div className="text-center text-gray-300 py-12">
              <ShoppingBag size={32} className="mx-auto mb-2" />
              <p className="text-sm">Cart is empty</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.unit_id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-gray-400">{item.unit_label} · ₱{item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(item.unit_id, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                  <Minus size={12} />
                </button>
                <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
                <button onClick={() => updateQty(item.unit_id, 1)} className="w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center text-blue-600">
                  <Plus size={12} />
                </button>
              </div>
              <div className="text-right min-w-12">
                <p className="text-sm font-bold">₱{item.subtotal.toFixed(2)}</p>
              </div>
              <button onClick={() => removeItem(item.unit_id)} className="text-gray-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Payment Panel */}
        <div className="p-4 border-t space-y-3">
          {/* Discount */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Discount</span>
            <input
              type="number"
              min="0"
              className="input text-sm py-1 flex-1"
              placeholder="₱0.00"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
          </div>

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₱{discountVal.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base text-gray-900">
              <span>TOTAL</span>
              <span>₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Type */}
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setPaymentType('cash')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === 'cash' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Cash
            </button>
            <button
              onClick={() => { setPaymentType('credit'); if (!member) setShowMemberModal(true); }}
              disabled={!member && paymentType !== 'credit'}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${paymentType === 'credit' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Credit
            </button>
          </div>

          {/* Cash Input */}
          {paymentType === 'cash' && (
            <div>
              <input
                type="number"
                min={total}
                step="1"
                className="input text-sm"
                placeholder={`Amount tendered (min ₱${total.toFixed(2)})`}
                value={amountTendered}
                onChange={e => setAmountTendered(e.target.value)}
              />
              {parseFloat(amountTendered) >= total && total > 0 && (
                <div className="flex justify-between text-blue-600 font-medium text-sm mt-1 px-1">
                  <span>Change</span>
                  <span>₱{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Credit Info */}
          {paymentType === 'credit' && member && (
            <div className="bg-orange-50 rounded-lg p-2 text-xs">
              <div className="flex justify-between"><span>Current Balance</span><span>₱{parseFloat(member.outstanding_balance || 0).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>This Purchase</span><span>+₱{total.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-orange-700 mt-1"><span>New Balance</span><span>₱{(parseFloat(member.outstanding_balance || 0) + total).toFixed(2)}</span></div>
            </div>
          )}

          {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded">{error}</p>}

          <button
            onClick={placeOrder}
            disabled={cart.length === 0 || loading || (paymentType === 'cash' && total > 0 && (parseFloat(amountTendered) || 0) < total)}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <CheckCircle size={18} />
            {loading ? 'Processing...' : `Place Order · ₱${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {showMemberModal && <MemberModal onSelect={m => { setMember(m); setShowMemberModal(false); }} onClose={() => setShowMemberModal(false)} />}
      {receipt && <ReceiptModal transaction={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
