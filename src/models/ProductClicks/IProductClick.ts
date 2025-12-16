import { Document, Types } from "mongoose";
export interface IProductClick extends Document {
    productId: Types.ObjectId,
    email: string,
    ipAddress: string,
    clickedAt: Date,
}
