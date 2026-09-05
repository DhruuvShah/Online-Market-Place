export type Role = "user" | "seller";

export type Currency = "INR" | "USD";

export type Money = {
  amount: number;
  currency: Currency;
};

export type ProductImage = {
  url: string;
  thumbnail: string;
  id: string;
};

export type Address = {
  _id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isDefault: boolean;
};

export type User = {
  _id: string;
  username: string;
  email: string;
  fullName: {
    firstName: string;
    lastName: string;
  };
  role: Role;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  _id: string;
  title: string;
  description?: string;
  price: Money;
  seller: string;
  images: ProductImage[];
  stock: number;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Cart = {
  _id: string;
  user: string;
  items: CartItem[];
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "SHIPPED"
  | "DELIVERED";

// title, image and seller are snapshotted by the order service at checkout, so
// an order keeps showing what was bought even if the listing later changes.
export type OrderItem = {
  _id?: string;
  product: string;
  title?: string;
  image?: string;
  seller?: string;
  quantity: number;
  price: Money;
};

export type Order = {
  _id: string;
  user: string;
  items: OrderItem[];
  status: OrderStatus;
  totalPrice: Money;
  shippingAddress: Omit<Address, "_id" | "isDefault">;
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export type Payment = {
  _id: string;
  order: string;
  paymentId?: string;
  razorpayOrderId: string;
  status: PaymentStatus;
  price: Money;
};

export type CartLine = {
  productId: string;
  quantity: number;
  title: string | null;
  image: string | null;
  stock: number | null;
  price: Money | null;
  lineTotal: number | null;
};

export type CartTotals = {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  currency: Currency;
};

export type CartView = {
  cart: { _id: string; user: string; items: CartLine[] };
  totals: CartTotals;
};

export type ShippingAddressInput = {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type ProductSort =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "title";

export type ProductView = "grid" | "list" | "large";

export type PageMeta = {
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
};
