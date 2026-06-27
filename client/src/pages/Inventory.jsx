import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api/axios';
import { Plus, RefreshCw, X, AlertTriangle, Package, Pencil } from 'lucide-react';

function StockBadge({ qty, threshold }) {
  if (qty <= 0) return <span className="badge bg-red-100 text-red-700">Out of Stock</span>;
  if (qty <= threshold) return <span className="badge bg-orange-100 text-orange-700">Low Stock</span>;
  return <span className="badge bg-green-100 text-green-700">OK</span>;
}

function RestockModal({ unit, productName, onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async ({ quantity, notes }) => {
    setLoading(true);
    try {
      await api.post('/inventory/restock', { product_unit_id: unit.id, quantity: parseFloat(quantity), notes });
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Restock: {productName} ({unit.unit_label})</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Current stock: <strong>{unit.stock_quantity}</strong></p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {err && <p className="text-red-500 text-sm">{err}</p>}
          <div>
            <label className="label">Quantity to Add</label>
            <input type="number" step="0.001" min="0.001" className="input"
              {...register('quantity', { required: 'Required', min: { value: 0.001, message: 'Must be > 0' } })} />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input type="text" className="input" placeholder="e.g. Supplier delivery" {...register('notes')} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Add Stock'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddProductModal({ categories, onClose, onDone }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { units: [{ unit_label: '', unit_type: 'piece', buying_price: '', selling_price: '', stock_quantity: 0, low_stock_threshold: 5, pieces_per_unit: 1 }] } });
  const [units, setUnits] = useState([{ unit_label: '', unit_type: 'wholesale', buying_price: '', selling_price: '', stock_quantity: 0, low_stock_threshold: 5, pieces_per_unit: 1, parent_label: '' }]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const addUnit = () => setUnits(prev => [...prev, { unit_label: '', unit_type: 'piece', buying_price: '', selling_price: '', stock_quantity: 0, low_stock_threshold: 5, pieces_per_unit: 1, parent_label: '' }]);
  const removeUnit = (i) => setUnits(prev => prev.filter((_, idx) => idx !== i));
  const updateUnit = (i, field, value) => setUnits(prev => prev.map((u, idx) => idx === i ? { ...u, [field]: value } : u));

  const onSubmit = async (data) => {
    if (!units.length) { setErr('Add at least one unit'); return; }
    for (const u of units) {
      if (!u.unit_label || !u.buying_price || !u.selling_price) { setErr('Fill all unit fields'); return; }
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      if (data.category_id) fd.append('category_id', data.category_id);
      if (data.image?.[0]) fd.append('image', data.image[0]);
      fd.append('units', JSON.stringify(units));
      await api.post('/products', fd);
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const nonPieceLabels = units.filter(u => u.unit_type !== 'piece').map(u => u.unit_label).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-4">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="font-semibold text-lg">Add New Product</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" {...register('name', { required: 'Required' })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" {...register('category_id')}>
                <option value="">— No category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Product Image</label>
              <input type="file" accept="image/*" className="input text-sm py-1" {...register('image')} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Unit Types</label>
              <button type="button" onClick={addUnit} className="text-blue-600 text-sm flex items-center gap-1 hover:underline"><Plus size={14} /> Add Unit</button>
            </div>
            <div className="space-y-3">
              {units.map((unit, i) => (
                <div key={i} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium text-gray-600">Unit #{i + 1}</span>
                    {units.length > 1 && <button type="button" onClick={() => removeUnit(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label text-xs">Label *</label>
                      <input className="input text-sm" placeholder="e.g. Piece, Box, Pack" value={unit.unit_label} onChange={e => updateUnit(i, 'unit_label', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Type *</label>
                      <select className="input text-sm" value={unit.unit_type} onChange={e => updateUnit(i, 'unit_type', e.target.value)}>
                        <option value="piece">Piece</option>
                        <option value="pack">Pack</option>
                        <option value="wholesale">Wholesale</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Buying Price *</label>
                      <input type="number" step="0.01" min="0" className="input text-sm" value={unit.buying_price} onChange={e => updateUnit(i, 'buying_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Selling Price *</label>
                      <input type="number" step="0.01" min="0" className="input text-sm" value={unit.selling_price} onChange={e => updateUnit(i, 'selling_price', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Initial Stock</label>
                      <input type="number" step="0.001" min="0" className="input text-sm" value={unit.stock_quantity} onChange={e => updateUnit(i, 'stock_quantity', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Low Stock Alert</label>
                      <input type="number" step="0.001" min="0" className="input text-sm" value={unit.low_stock_threshold} onChange={e => updateUnit(i, 'low_stock_threshold', e.target.value)} />
                    </div>
                    {unit.unit_type === 'piece' && (
                      <>
                        <div>
                          <label className="label text-xs">Pieces per Parent Unit</label>
                          <input type="number" step="0.001" min="1" className="input text-sm" value={unit.pieces_per_unit} onChange={e => updateUnit(i, 'pieces_per_unit', e.target.value)} />
                        </div>
                        {nonPieceLabels.length > 0 && (
                          <div>
                            <label className="label text-xs">Parent Unit</label>
                            <select className="input text-sm" value={unit.parent_label} onChange={e => updateUnit(i, 'parent_label', e.target.value)}>
                              <option value="">— None —</option>
                              {nonPieceLabels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({ product, categories, onClose, onDone }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: product.name, category_id: product.category_id || '' },
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', data.name);
      fd.append('category_id', data.category_id || '');
      if (data.image?.[0]) fd.append('image', data.image[0]);
      await api.put(`/products/${product.id}`, fd);
      onDone();
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Edit Product</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {err && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{err}</p>}
          <div>
            <label className="label">Product Name *</label>
            <input className="input" {...register('name', { required: 'Required' })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category_id')}>
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Replace Image</label>
            <input type="file" accept="image/*" className="input text-sm py-1" {...register('image')} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockUnit, setRestockUnit] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/products'), api.get('/products/categories/all')])
      .then(([p, c]) => { setProducts(p.data.data); setCategories(c.data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="relative">
        <input className="input pl-9 max-w-xs" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading inventory...</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Buy</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Sell</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No products found</td></tr>
              )}
              {filtered.map(product =>
                product.units.map((unit, ui) => (
                  <tr key={`${product.id}-${unit.id}`} className="hover:bg-gray-50">
                    {ui === 0 && (
                      <td className="px-4 py-3 font-medium" rowSpan={product.units.length}>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img src={`http://localhost:5000${product.image_url}`} alt={product.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center"><Package size={14} className="text-gray-400" /></div>
                          )}
                          <span>{product.name}</span>
                          <button onClick={() => setEditProduct(product)} className="text-gray-400 hover:text-blue-500">
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                    {ui === 0 && <td className="px-4 py-3 text-gray-500" rowSpan={product.units.length}>{product.category || '—'}</td>}
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-700">{unit.unit_label}</span>
                      <span className="ml-1 text-xs text-gray-400">({unit.unit_type})</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">₱{parseFloat(unit.buying_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">₱{parseFloat(unit.selling_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={unit.stock_quantity <= 0 ? 'text-red-600 font-bold' : unit.stock_quantity <= unit.low_stock_threshold ? 'text-orange-500 font-bold' : 'text-gray-700'}>
                        {parseFloat(unit.stock_quantity).toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StockBadge qty={unit.stock_quantity} threshold={unit.low_stock_threshold} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRestockUnit({ ...unit, productName: product.name })}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        <RefreshCw size={12} /> Restock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {restockUnit && (
        <RestockModal
          unit={restockUnit}
          productName={restockUnit.productName}
          onClose={() => setRestockUnit(null)}
          onDone={load}
        />
      )}
      {showAdd && <AddProductModal categories={categories} onClose={() => setShowAdd(false)} onDone={load} />}
      {editProduct && <EditProductModal product={editProduct} categories={categories} onClose={() => setEditProduct(null)} onDone={load} />}
    </div>
  );
}
