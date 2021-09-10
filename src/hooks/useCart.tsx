import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  function addLocalStorage(cart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }

  const addProduct = async (productId: number) => {
    try {
      const prevCart = [...cart];
      const isAdded = prevCart.find((product) => product.id === productId);

      const { amount } = await api
        .get<Stock>(`/stock/${productId}`)
        .then((response) => response.data);

      const actualAmount = isAdded ? isAdded.amount : 0;
      const newAmount = actualAmount + 1;

      if (newAmount > amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (isAdded) {
        isAdded.amount = newAmount;
      } else {
        const product = await api
          .get<Product>(`/products/${productId}`)
          .then((response) => response.data);

        prevCart.push({ ...product, amount: 1 });
      }

      setCart(prevCart);
      addLocalStorage(prevCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const prevCart = [...cart];
      const index = prevCart.findIndex((product) => product.id === productId);
      if (index >= 0) {
        setCart(prevCart.filter((product) => product.id !== productId));
        addLocalStorage(prevCart.filter((product) => product.id !== productId));
        return;
      }
      throw Error();
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) throw Error();
      const stock = await api
        .get<Stock>(`stock/${productId}`)
        .then((response) => response.data);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      setCart(
        cart.map((product) =>
          product.id === productId ? { ...product, amount: amount } : product
        )
      );
      addLocalStorage(
        cart.map((product) =>
          product.id === productId ? { ...product, amount: amount } : product
        )
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
