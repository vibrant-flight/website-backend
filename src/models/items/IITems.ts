import { Document } from "mongoose";
export interface IItem extends Document {
    name: string;
    size: {
        S: number;
        M: number;
        L: number;
        XL: number;
        XXL: number;
        XXXL: number;
    };
    price: number;
    category: "tshirts" | "shirts" | "sweatshirts" | "hoodies" | "overtees";
    actualPrice:number;
    description:string;
    image: Buffer;
    image1: Buffer;
    image2: Buffer;
    image3: Buffer;
    fabric: string;
}
