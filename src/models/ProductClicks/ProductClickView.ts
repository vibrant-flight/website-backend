import { Types } from "mongoose";

export interface ProductClickView {
    productId: Types.ObjectId;
    email: string;
    ipAddress: string;
    clickedAt: Date;
    errorMessage:string;
}
