import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Product, ProductVariant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Plus, Edit, Trash2, Search, Filter, CheckSquare, XCircle, Package, Upload, AlertCircle, Download, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageItems, setImageItems] = useState<{ id: string; file?: File; url: string }[]>([]);

  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkStockDialogOpen, setIsBulkStockDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isSingleDeleteDialogOpen, setIsSingleDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [bulkStockValue, setBulkStockValue] = useState<string>('');
  const [bulkStockMode, setBulkStockMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'createdAt'; direction: 'asc' | 'desc' | null }>({
    key: 'createdAt',
    direction: 'desc'
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    companyPrice: '',
    stock: '',
    lowStockThreshold: '5',
    tags: '',
    variants: [] as ProductVariant[]
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      stock: 0
    };
    setFormData({ ...formData, variants: [...formData.variants, newVariant] });
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setFormData({
      ...formData,
      variants: formData.variants.map(v => v.id === id ? { ...v, [field]: value } : v)
    });
  };

  const removeVariant = (id: string) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter(v => v.id !== id)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageItems.length === 0) {
      toast.error("Please add at least one image");
      return;
    }
    setUploading(true);
    
    try {
      const finalImageUrls: string[] = [];

      for (const item of imageItems) {
        if (item.file) {
          const storageRef = ref(storage, `products/${Date.now()}_${item.file.name}`);
          const snapshot = await uploadBytes(storageRef, item.file);
          const url = await getDownloadURL(snapshot.ref);
          finalImageUrls.push(url);
        } else {
          finalImageUrls.push(item.url);
        }
      }

      const data = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: Number(formData.price),
        companyPrice: Number(formData.companyPrice),
        stock: Number(formData.stock),
        lowStockThreshold: Number(formData.lowStockThreshold),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        images: finalImageUrls,
        variants: formData.variants,
        createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), data);
        toast.success("Product updated");
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success("Product added");
      }
      setIsDialogOpen(false);
      setEditingProduct(null);
      setImageItems([]);
      setFormData({ title: '', description: '', category: '', price: '', companyPrice: '', stock: '', lowStockThreshold: '5', tags: '', variants: [] });
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Operation failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      toast.success("Product deleted");
      setIsSingleDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      toast.error("Delete failed");
    }
  };
  
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const handleSort = (key: keyof Product | 'createdAt') => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'in-stock' && p.stock > (p.lowStockThreshold || 5)) ||
        (stockFilter === 'out-of-stock' && p.stock === 0) ||
        (stockFilter === 'low-stock' && p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));

      const matchesPrice = (!minPrice || p.price >= Number(minPrice)) &&
                          (!maxPrice || p.price <= Number(maxPrice));
      
      return matchesSearch && matchesCategory && matchesStock && matchesPrice;
    });

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key as keyof Product];
        let bValue = b[sortConfig.key as keyof Product];

        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

        if (sortConfig.key === 'createdAt') {
          const aDate = new Date(aValue as string).getTime();
          const bDate = new Date(bValue as string).getTime();
          return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [products, search, categoryFilter, stockFilter, minPrice, maxPrice, sortConfig]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.stock <= (p.lowStockThreshold || 5));
  }, [products]);

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProductIds(newSelected);
  };

  const handleBulkStockUpdate = async () => {
    const value = Number(bulkStockValue);
    if (isNaN(value)) {
      toast.error("Please enter a valid number");
      return;
    }

    setIsBulkProcessing(true);
    const batch = writeBatch(db);
    
    try {
      selectedProductIds.forEach(id => {
        const productRef = doc(db, 'products', id);
        if (bulkStockMode === 'set') {
          batch.update(productRef, { stock: value });
        } else {
          batch.update(productRef, { 
            stock: increment(bulkStockMode === 'add' ? value : -value) 
          });
        }
      });

      await batch.commit();
      toast.success(`Updated stock for ${selectedProductIds.size} products`);
      setIsBulkStockDialogOpen(false);
      setSelectedProductIds(new Set());
      setBulkStockValue('');
    } catch (error) {
      console.error("Bulk stock update error:", error);
      toast.error("Bulk update failed");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    const batch = writeBatch(db);

    try {
      selectedProductIds.forEach(id => {
        const productRef = doc(db, 'products', id);
        batch.delete(productRef);
      });

      await batch.commit();
      toast.success(`Deleted ${selectedProductIds.size} products`);
      setSelectedProductIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const updates: { id: string, stock: number }[] = [];

      // Expected CSV format: id,stock
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [id, stock] = line.split(',').map(s => s.trim());
        if (id && stock !== undefined && !isNaN(Number(stock))) {
          updates.push({ id, stock: Number(stock) });
        }
      }

      if (updates.length === 0) {
        toast.error("No valid updates found in CSV");
        return;
      }

      setIsBulkProcessing(true);
      const batch = writeBatch(db);
      try {
        updates.forEach(update => {
          const productRef = doc(db, 'products', update.id);
          batch.update(productRef, { stock: update.stock });
        });
        await batch.commit();
        toast.success(`Updated ${updates.length} products from CSV`);
      } catch (error) {
        console.error("CSV update error:", error);
        toast.error("CSV update failed. Ensure IDs are correct.");
      } finally {
        setIsBulkProcessing(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const downloadCSVSample = () => {
    const headers = "id,stock\n";
    const rows = products.slice(0, 5).map(p => `${p.id},${p.stock}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'stock_update_sample.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportProductsToCSV = () => {
    if (products.length === 0) {
      toast.error("No products to export");
      return;
    }

    const headers = "ID,Title,Category,Price,CompanyPrice,Stock,LowStockThreshold,CreatedAt\n";
    const rows = products.map(p => {
      // Escape commas in strings
      const title = `"${p.title.replace(/"/g, '""')}"`;
      const category = `"${p.category.replace(/"/g, '""')}"`;
      return `${p.id},${title},${category},${p.price},${p.companyPrice},${p.stock},${p.lowStockThreshold || 5},${p.createdAt}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `products_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Products exported successfully");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Products</h1>
          <p className="text-slate-500">Manage your inventory and pricing</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={exportProductsToCSV}
            className="rounded-xl border-slate-200 font-bold hidden md:flex"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">
                <Plus className="w-4 h-4 mr-2" /> Add Product
              </Button>
            } />
            <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-4 rounded-xl bg-slate-100 p-1">
                  <TabsTrigger value="general" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">General</TabsTrigger>
                  <TabsTrigger value="details" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                  <TabsTrigger value="images" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Images</TabsTrigger>
                  <TabsTrigger value="variants" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Variants</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Product Title</Label>
                      <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl" placeholder="Enter product name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price (Rs.)</Label>
                      <Input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Cost (Rs.)</Label>
                      <Input required type="number" value={formData.companyPrice} onChange={e => setFormData({...formData, companyPrice: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Base Stock</Label>
                      <Input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Low Stock Threshold</Label>
                      <Input required type="number" value={formData.lowStockThreshold} onChange={e => setFormData({...formData, lowStockThreshold: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="rounded-xl" placeholder="e.g. Electronics, Clothing" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        required 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="rounded-xl min-h-[120px]" 
                        placeholder="Describe your product in detail..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input 
                        placeholder="e.g. electronics, gadget, new" 
                        value={formData.tags} 
                        onChange={e => setFormData({...formData, tags: e.target.value})} 
                        className="rounded-xl" 
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold">Product Images</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl h-8 text-xs"
                          onClick={() => document.getElementById('multi-image-upload')?.click()}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Files
                        </Button>
                        <Input 
                          id="multi-image-upload"
                          type="file" 
                          multiple
                          accept="image/*" 
                          className="hidden"
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            const newItems = files.map(file => ({
                              id: Math.random().toString(36).substr(2, 9),
                              file,
                              url: URL.createObjectURL(file)
                            }));
                            setImageItems([...imageItems, ...newItems]);
                          }}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl h-8 text-xs"
                          onClick={() => {
                            const url = prompt("Enter image URL:");
                            if (url) {
                              setImageItems([...imageItems, { id: Math.random().toString(36).substr(2, 9), url }]);
                            }
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add URL
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {imageItems.map((item, index) => (
                        <div key={item.id} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${index === 0 ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              type="button"
                              size="icon" 
                              variant="ghost" 
                              className="w-8 h-8 text-white hover:text-indigo-400"
                              onClick={() => {
                                const newItems = [...imageItems];
                                const [selected] = newItems.splice(index, 1);
                                newItems.unshift(selected);
                                setImageItems(newItems);
                                toast.success("Primary image set");
                              }}
                              title="Set as Primary"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </Button>
                            <Button 
                              type="button"
                              size="icon" 
                              variant="ghost" 
                              className="w-8 h-8 text-white hover:text-rose-400"
                              onClick={() => {
                                setImageItems(imageItems.filter((_, i) => i !== index));
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                      {imageItems.length === 0 && (
                        <div className="col-span-4 py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                          <Upload className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs font-medium">No images added yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Product Variants</Label>
                        <p className="text-[10px] text-slate-500">Add sizes, colors, or other options</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={addVariant}
                        className="rounded-xl h-8 text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Variant
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {formData.variants.map((variant) => (
                        <div key={variant.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                          <div className="flex-grow grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-400">Name</Label>
                              <Input 
                                value={variant.name} 
                                onChange={e => updateVariant(variant.id, 'name', e.target.value)}
                                placeholder="e.g. Red, XL"
                                className="h-9 rounded-lg text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-400">Price (Optional)</Label>
                              <Input 
                                type="number"
                                value={variant.price || ''} 
                                onChange={e => updateVariant(variant.id, 'price', Number(e.target.value))}
                                placeholder="Same as base"
                                className="h-9 rounded-lg text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] uppercase text-slate-400">Stock</Label>
                              <Input 
                                type="number"
                                value={variant.stock} 
                                onChange={e => updateVariant(variant.id, 'stock', Number(e.target.value))}
                                className="h-9 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeVariant(variant.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {formData.variants.length === 0 && (
                        <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                          <Package className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs font-medium">No variants added</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button type="submit" disabled={uploading} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 font-bold shadow-lg shadow-indigo-100">
                {uploading ? 'Processing...' : (editingProduct ? 'Update Product' : 'Save Product')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    {lowStockProducts.length > 0 && (
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h2 className="text-lg font-black text-rose-900">Low Stock Alert!</h2>
            <p className="text-rose-700 text-sm">
              There are <span className="font-bold">{lowStockProducts.length}</span> products currently below their threshold.
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setStockFilter('low-stock')}
          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold px-6"
        >
          View Low Stock Items
        </Button>
      </motion.div>
    )}

    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b space-y-6 bg-slate-50/30">
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-grow space-y-2">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search by title, category, or tags..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 rounded-xl bg-white border-slate-200 h-11" 
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl bg-white border-slate-200 h-11 font-medium">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Status</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-[180px] rounded-xl bg-white border-slate-200 h-11 font-medium">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Price Range</Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rs.</span>
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      className="w-24 pl-9 rounded-xl bg-white border-slate-200 h-11 text-sm"
                    />
                  </div>
                  <span className="text-slate-300">to</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rs.</span>
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      className="w-24 pl-9 rounded-xl bg-white border-slate-200 h-11 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsBulkStockDialogOpen(true)}
                  className="rounded-xl border-slate-200 font-bold h-11 px-4"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-600" /> Bulk Stock
                </Button>
                
                {(categoryFilter !== 'all' || stockFilter !== 'all' || search !== '' || minPrice !== '' || maxPrice !== '') && (
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setCategoryFilter('all');
                      setStockFilter('all');
                      setSearch('');
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                    className="text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-11 px-4"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-bold">Image</TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Title
                  {sortConfig.key === 'title' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  ) : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                </div>
              </TableHead>
              <TableHead className="font-bold">Category</TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center">
                  Price
                  {sortConfig.key === 'price' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  ) : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                </div>
              </TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('companyPrice')}
              >
                <div className="flex items-center">
                  Cost
                  {sortConfig.key === 'companyPrice' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  ) : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                </div>
              </TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('stock')}
              >
                <div className="flex items-center">
                  Stock
                  {sortConfig.key === 'stock' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  ) : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                </div>
              </TableHead>
              <TableHead 
                className="font-bold cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  Added
                  {sortConfig.key === 'createdAt' ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                  ) : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />}
                </div>
              </TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id} className={selectedProductIds.has(p.id) ? 'bg-indigo-50/30' : ''}>
                <TableCell>
                  <Checkbox 
                    checked={selectedProductIds.has(p.id)}
                    onCheckedChange={() => toggleSelectProduct(p.id)}
                  />
                </TableCell>
                <TableCell>
                  <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                </TableCell>
                <TableCell className="font-bold text-slate-900">{p.title}</TableCell>
                <TableCell>{p.category}</TableCell>
                <TableCell className="font-bold">{formatPrice(p.price)}</TableCell>
                <TableCell className="text-slate-500">{formatPrice(p.companyPrice)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className={`text-sm font-black ${
                        p.stock === 0 ? 'text-rose-600' : 
                        p.stock <= (p.lowStockThreshold || 5) ? 'text-amber-600' : 
                        'text-slate-900'
                      }`}>
                        {p.stock}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        Units
                      </span>
                    </div>
                    
                    {p.stock === 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">Out</span>
                    ) : p.stock <= (p.lowStockThreshold || 5) ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase">Low</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">In</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {p.createdAt ? format(new Date(p.createdAt), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      setEditingProduct(p);
                      setFormData({
                        title: p.title,
                        description: p.description,
                        category: p.category,
                        price: p.price.toString(),
                        companyPrice: p.companyPrice.toString(),
                        stock: p.stock.toString(),
                        lowStockThreshold: (p.lowStockThreshold || 5).toString(),
                        tags: (p.tags || []).join(', '),
                        variants: p.variants || []
                      });
                      setImageItems(p.images.map(url => ({ id: Math.random().toString(36).substr(2, 9), url })));
                      setIsDialogOpen(true);
                    }} className="text-slate-400 hover:text-indigo-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setProductToDelete(p);
                      setIsSingleDeleteDialogOpen(true);
                    }} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedProductIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-6 border border-slate-800"
          >
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-indigo-400" />
              <span className="font-bold">{selectedProductIds.size} Products Selected</span>
            </div>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setIsBulkStockDialogOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl px-4 text-sm font-bold"
              >
                <Package className="w-4 h-4 mr-2" /> Bulk Stock Update
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                disabled={isBulkProcessing}
                className="h-10 rounded-xl px-4 text-sm font-bold"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Bulk Delete
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedProductIds(new Set())}
                className="text-slate-400 hover:text-white h-10 rounded-xl px-4 text-sm font-bold"
              >
                Deselect
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-black">Confirm Bulk Delete</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete <span className="font-bold text-rose-600">{selectedProductIds.size}</span> products? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} className="rounded-xl h-12 font-bold flex-grow">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              disabled={isBulkProcessing} 
              className="rounded-xl h-12 font-bold flex-grow"
            >
              {isBulkProcessing ? 'Deleting...' : 'Yes, Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <Dialog open={isSingleDeleteDialogOpen} onOpenChange={setIsSingleDeleteDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-black">Delete Product?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete <span className="font-bold text-slate-900">"{productToDelete?.title}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsSingleDeleteDialogOpen(false)} className="rounded-xl h-12 font-bold flex-grow">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              className="rounded-xl h-12 font-bold flex-grow"
            >
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Stock Update Dialog */}
      <Dialog open={isBulkStockDialogOpen} onOpenChange={setIsBulkStockDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Bulk Stock Update</DialogTitle>
            <DialogDescription>
              Update stock for {selectedProductIds.size} selected products.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase text-slate-400">Common Adjustment</Label>
              <div className="flex gap-2">
                <Select value={bulkStockMode} onValueChange={(v: any) => setBulkStockMode(v)}>
                  <SelectTrigger className="w-[140px] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add (+)</SelectItem>
                    <SelectItem value="subtract">Subtract (-)</SelectItem>
                    <SelectItem value="set">Set Fixed</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  placeholder="Value" 
                  value={bulkStockValue}
                  onChange={e => setBulkStockValue(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button 
                onClick={handleBulkStockUpdate}
                disabled={isBulkProcessing || !bulkStockValue}
                className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold h-11"
              >
                {isBulkProcessing ? 'Updating...' : 'Apply Adjustment'}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Or Upload CSV</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center space-y-3 bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-300" />
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-600">Upload CSV File</p>
                  <p className="text-[10px] text-slate-400">Format: id,stock</p>
                </div>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVUpload}
                  className="hidden" 
                  id="csv-upload"
                />
                <Button render={<label htmlFor="csv-upload" className="cursor-pointer" />} variant="outline" className="rounded-xl border-slate-200 font-bold h-9">
                  Select File
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                onClick={downloadCSVSample}
                className="w-full text-xs text-indigo-600 hover:text-indigo-700 font-bold"
              >
                <Download className="w-3 h-3 mr-2" /> Download Sample CSV
              </Button>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-800 leading-relaxed">
              Bulk updates are processed immediately. Ensure your values are correct before applying. 
              CSV updates will overwrite current stock values for matching IDs.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
