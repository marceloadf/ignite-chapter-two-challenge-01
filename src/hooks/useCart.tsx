import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartItemIndex = cart.findIndex((p => p.id === productId));

      //product at cart not found
      if(cartItemIndex === -1){
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        product.amount = 1;
        const newCart = [...cart, product];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
        const existedItemAtCart = cart[cartItemIndex];
        const newAmount = existedItemAtCart.amount + 1;

        if(newAmount > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = [...cart];
        newCart[cartItemIndex].amount += 1;

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const existedItemAtCart = cart.findIndex(p => p.id == productId);

      if(existedItemAtCart === -1){
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(p => p.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount < 1) {
        return;
      }

      const existedIndexItemAtCart = cart.findIndex(p => p.id == productId);
      const existedItemAtCart = cart[existedIndexItemAtCart];

      if(existedIndexItemAtCart === -1){
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
      const newAmount = existedItemAtCart.amount + amount;

      if(newAmount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart];
      newCart[existedIndexItemAtCart].amount = amount;

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
