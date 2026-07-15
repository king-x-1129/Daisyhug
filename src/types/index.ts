export type UserRole = 'customer' | 'reseller' | 'admin' | 'moderator';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  mobile?: string;
  mobile2?: string;
  city?: string;
  province?: string;
  address?: string;
  permanentAddress?: string;
  paymentInfo?: {
    method: 'Bank' | 'JazzCash' | 'Easypaisa';
    details: string;
  };
  cnic?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  billDocUrl?: string;
  photoURL?: string;
  isVerified: boolean;
  walletBalance: number;
  pendingProfit: number;
  totalWithdrawn: number;
  createdAt: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number;
  stock: number;
  image?: string;
  sku?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  companyPrice: number;
  stock: number;
  lowStockThreshold?: number;
  tags?: string[];
  images: string[];
  variants?: ProductVariant[];
  createdAt: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Returned' | 'Refused' | 'Cancelled';

export interface StatusUpdate {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  resellerId?: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerAddress: string;
  items: {
    productId: string;
    title: string;
    quantity: number;
    price: number;
  }[];
  sellingPrice: number;
  companyPrice: number;
  shippingCost: number;
  profit: number;
  resellerCommission?: number;
  status: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  cancellationNote?: string;
  profitReleasedAt?: string;
  statusHistory?: StatusUpdate[];
  discount?: number;
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  method: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: string;
}


export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount?: number;
  expiryDate?: string;
  isActive: boolean;
}
