import mongoose, { Document, Schema } from "mongoose";
import { IOrder } from "./IOrder";
import cartItemSchema from "../cart/CartItemSchema"; 

const orderSchema: Schema = new Schema({
  email: { type: String, required: true },
  orderId: { type: String, required: true },
  paymentId: { type: String, required: false },
  items: { type: [cartItemSchema], required: true },
  mobile: {type: Number,require:true},
  trackingId:{type:String,require:false,default:""},
  address: {type:String,require:true},
  pinCode: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: {type:String,enum:["captured","dispatched","failed","cancelled"],require:true},
});

export default mongoose.model<IOrder & Document>("Order", orderSchema);
