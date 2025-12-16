import mongoose from "mongoose";
import { IProductClick } from "./IProductClick";

const ProductClickSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.ObjectId, required: true },
  email: { type: String },
  ipAddress: { type: String },
  clickedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IProductClick>("ProductClick", ProductClickSchema);
