import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ShopLayout } from "@/components/layout/ShopLayout";
import { RedirectIfAuthed, RequireRole } from "./guards";

const Landing = lazy(() => import("@/pages/public/Landing"));
const Login = lazy(() => import("@/pages/public/Login"));
const Register = lazy(() => import("@/pages/public/Register"));
const NotFound = lazy(() => import("@/pages/public/NotFound"));

const Discover = lazy(() => import("@/pages/shop/Discover"));
const ProductDetail = lazy(() => import("@/pages/shop/ProductDetail"));
const Cart = lazy(() => import("@/pages/shop/Cart"));
const Checkout = lazy(() => import("@/pages/shop/Checkout"));
const OrderSuccess = lazy(() => import("@/pages/shop/OrderSuccess"));
const Orders = lazy(() => import("@/pages/shop/Orders"));
const OrderDetail = lazy(() => import("@/pages/shop/OrderDetail"));
const Account = lazy(() => import("@/pages/shop/Account"));

export function Router() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RedirectIfAuthed />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={["user"]} />}>
          <Route element={<ShopLayout />}>
            <Route path="/discover" element={<Discover />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/orders/:id/success" element={<OrderSuccess />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
