import express from "express";
import Cart from "./../models/cart/Cart";
import Item from "./../models/items/Item";
import mongoose from "mongoose";
import AuthUser from "../middleWare/AuthUser";
import { ICart } from "../models/cart/ICart";
import { IItem } from "../models/items/IITems";
import { CartView } from "../models/cart/CartView";
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../models/orders/Order";
const CartRouter = express.Router();
CartRouter.post("/add-to-cart", AuthUser, async (req, res) => {
    try {
        const email = req.body.userData?.email;
        const itemId = req.body.itemId;
        const selectedSize = req.body.selectedSize;
        const quantity = req.body.quantity;
        if (!email || !itemId || !selectedSize || !quantity) {
            return res.status(400).json({ errorMessage: "All fields are required" });
        }
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ errorMessage: "Invalid item ID" });
        }
        const item:IItem | null = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ errorMessage: "Item not found" });
        }
        let cart: ICart | null = await Cart.findOne({ email });
        if (!cart) {
            cart = new Cart({ email, items: [{ itemId,price:item.price,name:item.name, selectedSize, quantity, image: item.image }] });
        } else {
            const existingItem = cart.items.find(i => i.itemId.toString() === itemId && i.selectedSize === selectedSize);
            if (existingItem) {
                const availableItem = await Item.findById(itemId);
                if (availableItem) {
                    const sizeQty = availableItem.size[selectedSize as keyof typeof availableItem.size] ?? 0;
                    if (sizeQty >= existingItem.quantity + quantity) {
                        existingItem.quantity = Math.max(1, existingItem.quantity + quantity);
                    } 
                    else {
                        return res.status(400).json({ errorMessage: "The requested quantity exceeds the available stock when combined with the quantity already in your cart"});
                    }
                }

            } 
            else {
                cart.items.push({ itemId,price:item.price,name:item.name, selectedSize, quantity, image: item.image });
            }
        }
        await cart.save();
        const cartView:CartView = {
            email: cart.email,
            items: cart.items.map(i => ({
                itemId: i.itemId,
                name:i.name,
                price:i.price,
                selectedSize: i.selectedSize,
                quantity: i.quantity,
                image: `data:image/webp;base64,${i.image.toString("base64")}`
            }))
        };

        return res.status(200).json(cartView);

    } catch (err) {
        return res.status(500).json({error: err instanceof Error ? err.message : "unknown error"});
    }
});
CartRouter.get("/get-cart-items",AuthUser,async(req:express.Request,res:express.Response)=>{
    try {
        const email = req.body.userData?.email;
        let cart:ICart | null = await Cart.findOne({email:email}).lean();
        if(cart) {
            if(cart.items && cart.items.length > 0) {
                const validItemIds = cart.items.map(i => String(i.itemId)).filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
                const existingItems = validItemIds.length? await Item.find({ _id: { $in: validItemIds } }).lean(): [];
                const existingMap = new Map(existingItems.map(e => [String(e._id), e]));
                const existingIdSet = new Set(existingItems.map(e => String(e._id)));
                let toRemove: any[] = [];
                for (const cartItem of cart.items) {
                    const itemIdStr = String(cartItem.itemId);
                    if (!existingIdSet.has(itemIdStr)) {
                        toRemove.push(cartItem);
                        continue;
                    }
                    const dbItem = existingMap.get(itemIdStr);
                    const size = cartItem.selectedSize;
                    if (!dbItem?.size || dbItem.size[size] === undefined || dbItem.size[size] <= 0) {
                        toRemove.push(cartItem);
                        continue;
                    }
                    if (cartItem.quantity > dbItem.size[size]) {
                        toRemove.push(cartItem);
                        continue;
                    }
                }
                if(toRemove.length > 0) {
                    const pullConditions = toRemove.map(m => ({
                        itemId: mongoose.Types.ObjectId.isValid(m.itemId)
                            ? new mongoose.Types.ObjectId(String(m.itemId))
                            : String(m.itemId)
                    }));
                    await Cart.updateOne({ email },{ $pull: { items: { $or: pullConditions } } });
                    cart.items = cart.items.filter(i => !toRemove.includes(i));
                }
            }
            const cartData:CartView = {
                email: cart.email,
                items: cart.items.map(i => ({
                    itemId: i.itemId,
                    name:i.name,
                    price:i.price,
                    selectedSize: i.selectedSize,
                    quantity: i.quantity,
                    image: `data:image/webp;base64,${i.image.toString("base64")}`
                }))
            };
            return res.status(200).json(cartData);
        }
        else {
            return res.status(200).json({});
        }
    }
    catch(err) {
        return res.status(500).json({error: err instanceof Error ? err.message : "unknown error"});
    }
});
CartRouter.put('/remove-item', AuthUser, async (req, res) => {
    try {
        const { itemId,size } = req.body;
        const email = req.body.userData.email;

        const pullQuery: any = { selectedSize: size };
        if (mongoose.Types.ObjectId.isValid(itemId)) {
            pullQuery.itemId = new mongoose.Types.ObjectId(itemId);
        } else {
            pullQuery.itemId = itemId;
        }

        const result = await Cart.updateOne(
            { email },
            { $pull: { items: pullQuery } }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: "Item not found in cart" });
        }
        return res.status(200).json({ message: "Item removed" });
    } 
    catch (err) {
        return res.status(500).json({ message: "Error removing item", error: err });
    }
});
CartRouter.patch('/clear-cart',AuthUser,async(req:express.Request,res:express.Response)=> {
    try {
        const {email} = req.body.userData;
        if(email) {
            const cart:ICart | null = await Cart.findOneAndDelete({email:email});
            if(cart) {
                return res.status(200).json({});
            }
            else {
                return res.status(500).json({errorMessage:"can not clear"});
            }
        }
        else {
            return res.status(401).json({errorMessage:"no access"});
        }
    }
    catch(err) {
        return res.status(500).json({error: err instanceof Error ? err.message : "unknown error"});
    }
});
CartRouter.put("/update-order-service",async (req:express.Request,res:express.Response)=>{
    try {
        const {orderId,newAddress,newPinCode}=req.body;
        if(orderId=="") {
            return res.status(400).json({errorMessage:"Order Id not provided"});
        }
        else if(newAddress=="") {
            return res.status(400).json({errorMessage:"New Address can not left empty"});
        }
        else {
            const order = await Order.findOneAndUpdate({orderId:orderId},{address:newAddress,pinCode:newPinCode});
            return res.status(200).json({});
        }
    }
    catch(err) {
        return res.status(500).json({error: err instanceof Error ? err.message : "Unknown error" });
    }
});
CartRouter.post("/create-order", async (req:express.Request, res:express.Response) => {
    try {
        const { amount } = req.body;
        const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
        const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
        if(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            const razorpay = new Razorpay({
                key_id: RAZORPAY_KEY_ID,
                key_secret: RAZORPAY_KEY_SECRET,
            });
            const options = {
                amount: amount, 
                currency: "INR",
                receipt: "order_" + Date.now(),
            };
            const order = await razorpay.orders.create(options);
            return res.json({ order });
        }
        else {
            return res.status(500).json("Environment veriable error");
        }
    } 
    catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
});
CartRouter.post("/verify-payment", async (req, res) => {
    try {
        const { order_id, payment_id, signature, userData, mobile, address,pinCode } = req.body;
        let Status: "captured" | "dispatched" | "failed" = "captured";
        const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
        if (!RAZORPAY_KEY_SECRET) {
            Status = "failed";
        }
        if (RAZORPAY_KEY_SECRET) {
            const expectedSignature = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(order_id + "|" + payment_id).digest("hex");
            if(expectedSignature !== signature) {
                Status = "failed";
            }
        }
        const email = userData?.email;
        if(!email) {
            Status = "failed";
        }
        const cart = await Cart.findOne({ email });
        const items = cart?.items || [];
        const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await Order.create({
            email,
            orderId: order_id,
            paymentId: payment_id,
            mobile,
            address,
            pinCode,
            trackingId:"",
            items,
            amount: cart && cart.items.length ? amount : 0,
            status: Status,
        });
        if(Status !== "captured") {
            return res.status(500).json({ errorMessage: "payment fail" });
        }
        for (const item of items) {
            await Item.findOneAndUpdate({ _id: item.itemId },{$inc:{[`size.${item.selectedSize}`]:-item.quantity}});
        }
        return res.json({ success: true, message: "Order verified, stock updated, and saved" });
    } 
    catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
});
CartRouter.post("/place-cod-order",AuthUser,async(req:express.Request,res:express.Response)=>{
    try {
        const {userData,mobile,address,pinCode} = req.body;
        const email = userData?.email;
        if (!email) {
            return res.status(401).json({errorMessage:"Login to place order"});
        }
        const cart = await Cart.findOne({email});
        if (!cart || cart.items.length === 0) {
            return res.status(401).json({ errorMessage: "Your cart is empty" });
        }
        const items = cart.items;
        await Order.create({
            email,
            orderId: "order_" + Date.now(),
            paymentId:"",
            mobile,
            address,
            pinCode,
            paymentMode: "COD",
            items,
            amount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            status: "captured",
        });
        for (const item of items) {
            await Item.findOneAndUpdate(
                { _id: item.itemId },
                { $inc: { [`size.${item.selectedSize}`]: -item.quantity } }
            );
            const updatedItem = await Item.findById(item.itemId);
        }
        return res.status(200).json({});
    } 
    catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
    }
});
export default CartRouter;
