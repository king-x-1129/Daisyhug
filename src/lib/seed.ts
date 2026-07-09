import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

const demoProducts = [
  {
    title: "Premium Wireless Headphones",
    description: "High-quality noise-canceling wireless headphones with 40h battery life.",
    category: "Electronics",
    price: 15000,
    companyPrice: 12000,
    stock: 50,
    lowStockThreshold: 5,
    tags: ["electronics", "audio", "wireless"],
    images: ["https://picsum.photos/seed/headphones/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Cotton Slim Fit Shirt",
    description: "Breathable 100% cotton shirt, perfect for formal and casual wear.",
    category: "Clothing",
    price: 2500,
    companyPrice: 1800,
    stock: 100,
    lowStockThreshold: 10,
    tags: ["clothing", "men", "shirt"],
    images: ["https://picsum.photos/seed/shirt/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Smart Watch Series 7",
    description: "Track your fitness, heart rate, and notifications on the go.",
    category: "Electronics",
    price: 8500,
    companyPrice: 6500,
    stock: 30,
    lowStockThreshold: 5,
    tags: ["electronics", "wearable", "smartwatch"],
    images: ["https://picsum.photos/seed/watch/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Designer Silk Scarf",
    description: "Elegant silk scarf with vibrant patterns for any occasion.",
    category: "Accessories",
    price: 1200,
    companyPrice: 800,
    stock: 200,
    lowStockThreshold: 20,
    tags: ["accessories", "women", "silk"],
    images: ["https://picsum.photos/seed/scarf/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Portable Power Bank 20000mAh",
    description: "Fast charging power bank with dual USB ports.",
    category: "Electronics",
    price: 4500,
    companyPrice: 3200,
    stock: 75,
    lowStockThreshold: 10,
    tags: ["electronics", "mobile", "powerbank"],
    images: ["https://picsum.photos/seed/powerbank/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Leather Bi-fold Wallet",
    description: "Genuine leather wallet with multiple card slots and coin pocket.",
    category: "Accessories",
    price: 2200,
    companyPrice: 1500,
    stock: 120,
    lowStockThreshold: 15,
    tags: ["accessories", "men", "leather"],
    images: ["https://picsum.photos/seed/wallet/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "Non-Stick Frying Pan",
    description: "Durable non-stick frying pan, easy to clean and heat resistant.",
    category: "Home & Kitchen",
    price: 3500,
    companyPrice: 2500,
    stock: 40,
    lowStockThreshold: 8,
    tags: ["home", "kitchen", "cookware"],
    images: ["https://picsum.photos/seed/pan/600/600"],
    createdAt: new Date().toISOString()
  },
  {
    title: "USB-C Fast Charger",
    description: "20W fast charger compatible with all modern smartphones.",
    category: "Electronics",
    price: 1800,
    companyPrice: 1200,
    stock: 150,
    lowStockThreshold: 20,
    tags: ["electronics", "mobile", "charger"],
    images: ["https://picsum.photos/seed/charger/600/600"],
    createdAt: new Date().toISOString()
  }
];

export async function seedProducts() {
  const productsCol = collection(db, 'products');
  for (const product of demoProducts) {
    await addDoc(productsCol, product);
  }
  return demoProducts.length;
}
