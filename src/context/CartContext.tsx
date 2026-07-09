import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/types';

interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('resellxpk_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('resellxpk_cart', JSON.stringify(items));
    } catch {
      // localStorage unavailable (e.g., private mode quota exceeded)
    }
  }, [items]);

  const addItem = (product: Product, quantity = 1, variant?: ProductVariant) => {
    setItems(prev => {
      const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;
      const existing = prev.find(item => (item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id) === cartItemId);
      
      if (existing) {
        return prev.map(item => {
          const currentId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
          return currentId === cartItemId ? { ...item, quantity: item.quantity + quantity } : item;
        });
      }

      const newItem: CartItem = {
        ...product,
        quantity,
        selectedVariant: variant,
        // Override price if variant has one
        price: variant?.price ?? product.price
      };
      
      return [...prev, newItem];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(item => {
      const currentId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
      return currentId !== cartItemId;
    }));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    setItems(prev => prev.map(item => {
      const currentId = item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : item.id;
      return currentId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item;
    }));
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
