import { CartItemView } from "../cart/CartView";
export interface OrderView {
  email: string;
  orderId: string;
  paymentId: string;
  items: CartItemView[];
  amount: number;
  status:"captured" | "dispatched" | "failed" | "cancelled";
  mobile: number;
  trackingId:string;
  address: string;
  pinCode:number;
  errorMessage?: string;
}
