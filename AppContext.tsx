import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, Sale, InventoryStats, RestockSuggestion, SalesInsight } from '../types';
import { mockUsers, mockProducts, mockSales } from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  products: Product[];
  sales: Sale[];
  inventoryStats: InventoryStats;
  restockSuggestions: RestockSuggestion[];
  salesInsights: SalesInsight[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addSale: (productId: string, quantity: number) => void;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  getCurrentSale: () => { items: Array<{ product: Product; quantity: number }>, total: number };
  clearCurrentSale: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [currentSaleItems, setCurrentSaleItems] = useState<Array<{ product: Product; quantity: number }>>([]);

  // Initialize data when user logs in
  useEffect(() => {
    if (currentUser) {
      // Filter data by user code
      const userProducts = mockProducts.filter(p => p.id.startsWith(currentUser.code));
      const userSales = mockSales.filter(s => s.userCode === currentUser.code);
      
      setProducts(userProducts);
      setSales(userSales);
    } else {
      setProducts([]);
      setSales([]);
    }
  }, [currentUser]);

  const login = (email: string, password: string): boolean => {
    const user = mockUsers.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentSaleItems([]);
  };

  const addSale = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (product && currentUser) {
      // Add to current sale
      const existingItem = currentSaleItems.find(item => item.product.id === productId);
      if (existingItem) {
        setCurrentSaleItems(prev => 
          prev.map(item => 
            item.product.id === productId 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        );
      } else {
        setCurrentSaleItems(prev => [...prev, { product, quantity }]);
      }

      // Update product stock
      setProducts(prev => 
        prev.map(p => 
          p.id === productId 
            ? { ...p, currentStock: p.currentStock - quantity }
            : p
        )
      );

      // Add to sales history
      const newSale: Sale = {
        id: `sale_${Date.now()}`,
        userCode: currentUser.code,
        productId,
        quantity,
        totalAmount: product.price * quantity,
        timestamp: new Date()
      };
      setSales(prev => [...prev, newSale]);
    }
  };

  const updateProduct = (productId: string, updates: Partial<Product>) => {
    setProducts(prev => 
      prev.map(p => p.id === productId ? { ...p, ...updates } : p)
    );
  };

  const getCurrentSale = () => {
    const total = currentSaleItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    return { items: currentSaleItems, total };
  };

  const clearCurrentSale = () => {
    setCurrentSaleItems([]);
  };

  // Calculate inventory stats
  const inventoryStats: InventoryStats = {
    totalItems: products.reduce((sum, p) => sum + p.currentStock, 0),
    lowStock: products.filter(p => p.currentStock <= p.reorderLevel && p.currentStock > 0).length,
    outOfStock: products.filter(p => p.currentStock === 0).length,
    categories: [
      { name: 'Prescription', count: products.filter(p => p.category === 'Prescription').length, color: '#0EA5E9' },
      { name: 'OTC Medicines', count: products.filter(p => p.category === 'OTC').length, color: '#06B6D4' },
      { name: 'First Aid', count: products.filter(p => p.category === 'First Aid').length, color: '#8B5CF6' },
      { name: 'Baby Care', count: products.filter(p => p.category === 'Baby Care').length, color: '#F59E0B' },
    ]
  };

  // Generate restock suggestions
  const restockSuggestions: RestockSuggestion[] = products
    .filter(p => p.currentStock <= p.reorderLevel)
    .map(p => ({
      productId: p.id,
      productName: p.name,
      currentStock: p.currentStock,
      suggestedQuantity: Math.max(50, p.reorderLevel * 2),
      priority: p.currentStock === 0 ? 'high' : p.currentStock <= p.reorderLevel / 2 ? 'medium' : 'low',
      reason: p.currentStock === 0 ? 'Out of stock' : 'Low stock (3 units)'
    }));

  // Generate sales insights
  const salesInsights: SalesInsight[] = [
    {
      type: 'trend',
      title: 'Monthly Sales Growth',
      description: 'Sales increased by 12.4% from last month with ₱8,277 daily average',
      data: { growth: 12.4, average: 8277 }
    },
    {
      type: 'forecast',
      title: 'AI-Generated Insights',
      description: 'Sales of cold medications have increased by 27% this week, suggesting seasonal illness outbreak. Consider increasing stock levels.'
    }
  ];

  return (
    <AppContext.Provider value={{
      currentUser,
      products,
      sales,
      inventoryStats,
      restockSuggestions,
      salesInsights,
      login,
      logout,
      addSale,
      updateProduct,
      getCurrentSale,
      clearCurrentSale
    }}>
      {children}
    </AppContext.Provider>
  );
};