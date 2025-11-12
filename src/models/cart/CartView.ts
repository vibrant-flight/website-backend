import { Types } from "mongoose";

export interface CartItemView {
    itemId: Types.ObjectId;
    name: string;
    selectedSize: 'S' | 'S' | 'L' | 'XL' | 'XXL' | 'XXXL';
    image:string,
    price:number,
    quantity: number;
}
export interface CartView {
    email: string;
    items: CartItemView[];
}
