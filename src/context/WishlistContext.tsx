import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { WishlistItem } from '@/types';
import { toast } from 'sonner';

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'wishlist'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishlistItem));
      setWishlistItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Wishlist error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast.error("Please login to save products");
      return;
    }

    if (isInWishlist(productId)) return;

    try {
      await addDoc(collection(db, 'wishlist'), {
        userId: user.uid,
        productId,
        createdAt: new Date().toISOString()
      });
      toast.success("Added to wishlist");
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      toast.error("Failed to add to wishlist");
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'wishlist'), 
        where('userId', '==', user.uid),
        where('productId', '==', productId)
      );
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'wishlist', d.id)));
      await Promise.all(deletePromises);
      
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.productId === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
