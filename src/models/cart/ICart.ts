import { Document, Types } from "mongoose";
export interface ICartItem {
    itemId: Types.ObjectId;
    name: string;
    selectedSize: 'S' | 'S' | 'L' | 'XL' | 'XXL' | 'XXXL';
    image:Buffer,
    price:number,
    quantity: number;
}
export interface ICart extends Document {
    email: string;
    items: ICartItem[];
}
