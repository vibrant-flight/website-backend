import { Document } from "mongoose";
import { ICartItem } from "../cart/ICart";

export interface IOrder extends Document {
  email: string;
  orderId: string;
  paymentId:string,
  items: ICartItem[];
  amount: number;  
  trackingId:string;
  mobile: number;
  address: string;
  pinCode:number,
  status: "captured" | "dispatched" | "failed" | "cancelled";
}
