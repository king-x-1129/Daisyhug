import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Review, Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, MessageSquare, User, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(data);
      setLoading(false);
      
      if (user) {
        setHasReviewed(data.some(r => r.userId === user.uid));
      }
    });

    return () => unsubscribe();
  }, [productId, user]);

  useEffect(() => {
    async function checkPurchase() {
      if (!user) return;
      
      try {
        // Check if user has a delivered order with this product as a customer
        const customerQuery = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid),
          where('status', '==', 'Delivered')
        );
        
        // Check if user has a delivered order with this product as a reseller
        const resellerQuery = query(
          collection(db, 'orders'),
          where('resellerId', '==', user.uid),
          where('status', '==', 'Delivered')
        );
        
        const [customerSnap, resellerSnap] = await Promise.all([
          getDocs(customerQuery),
          getDocs(resellerQuery)
        ]);
        
        const allOrders = [...customerSnap.docs, ...resellerSnap.docs].map(doc => doc.data() as Order);
        const containsProduct = allOrders.some(order => 
          order.items.some(item => item.productId === productId)
        );
        
        setHasPurchased(containsProduct);
      } catch (error) {
        console.error("Error checking purchase status:", error);
      }
    }
    
    checkPurchase();
  }, [productId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to leave a review");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch user profile to get the most accurate name
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      const profileName = !userDoc.empty ? userDoc.docs[0].data().fullName : (user.displayName || 'Anonymous');

      await addDoc(collection(db, 'reviews'), {
        productId,
        userId: user.uid,
        userName: profileName,
        userPhoto: user.photoURL || '',
        rating,
        comment,
        createdAt: new Date().toISOString()
      });
      toast.success("Review submitted successfully");
      setComment('');
      setRating(5);
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  if (loading) return <div className="py-10 text-center text-slate-400">Loading reviews...</div>;

  return (
    <div className="space-y-12 mt-16 pt-16 border-t border-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Customer Reviews</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={`w-5 h-5 ${s <= Math.round(averageRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                />
              ))}
            </div>
            <span className="text-lg font-bold text-slate-900">{averageRating.toFixed(1)} out of 5</span>
            <span className="text-slate-400">({reviews.length} reviews)</span>
          </div>
        </div>

        {user && hasPurchased && !hasReviewed && (
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 max-w-md">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2" /> Write a Review
            </h3>
            <p className="text-xs text-indigo-700 mb-4">You've purchased this product! Share your experience with others.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-6 h-6 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} 
                    />
                  </button>
                ))}
              </div>
              <Textarea 
                placeholder="What did you like or dislike?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl border-slate-200 focus:ring-indigo-500 min-h-[100px]"
              />
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
              >
                {isSubmitting ? 'Submitting...' : 'Post Review'}
              </Button>
            </form>
          </div>
        )}

        {user && !hasPurchased && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center max-w-xs">
            <p className="text-xs text-slate-500">Only customers who have purchased this product can leave a review.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.length === 0 ? (
          <div className="col-span-2 py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {review.userPhoto ? (
                      <img src={review.userPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{review.userName}</p>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(parseISO(review.createdAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed italic">"{review.comment}"</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
