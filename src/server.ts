import express from "express";
import cors from "cors";
import config from "./config";
import mongoose from "mongoose";
import UserRouter from "./routers/UserRouter";
import cookieParser from "cookie-parser";
import AdminRouter from "./routers/AmdinRoutes";
import Item from "./models/items/Item";
import CartRouter from "./routers/CartRouter";
import { ItemView } from "./models/items/itemView";
import { Types } from "mongoose";
import { IItem } from "./models/items/IITems";
import ProductClick from "./models/ProductClicks/ProductClick";
const app:express.Application = express();
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(cors({
  origin: ["https://vibrantflight.in","https://www.vibrantflight.in"],
  credentials: true,
}));
app.set("trust proxy", true);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://vibrantflight.in",
    "https://www.vibrantflight.in",
  ];
  if(!origin) {
    return res.status(403).json({ message: "Origin missing" });
  }
  if(!allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: "Origin not allowed" });
  }
  next();
});
app.use("/api/users",UserRouter);
app.use("/api/admins",AdminRouter);
app.use("/api/cart",CartRouter);
if(config.MONGO_DB_URL) {
    mongoose.connect(config.MONGO_DB_URL).then((res)=>{
        console.log("mongo db connected");
    }).catch((err)=>{
        console.log("error in mongodb connection");
    });
}
app.get("/",(req:express.Request, res:express.Response) => {
    return res.status(200).json({
        "msg":"server is running"
    });
});
app.get("/get-items", async (req: express.Request, res: express.Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const category = req.query.category as string;
        const filter: any = {};
        if (category) filter.category = category;
        const items = await Item.find(filter).sort({ _id: -1 }).skip((page - 1) * 8).limit(8).lean();
        const itemsData: ItemView[] = items.map((e) => ({
            itemId: e._id as Types.ObjectId,
            name: e.name,
            size: {
                S: e.size.S,
                M: e.size.M,
                L: e.size.L,
                XL: e.size.XL,
                XXL: e.size.XXL,
                XXXL: e.size.XXXL
            },
            price: e.price,
            actualPrice: e.actualPrice,
            description:e.description,
            category:e.category,
            image: `data:image/webp;base64,${e.image.toString("base64")}`,
            image1: `data:image/webp;base64,${e.image1.toString("base64")}`,
            image2: `data:image/webp;base64,${e.image2.toString("base64")}`,
            image3: `data:image/webp;base64,${e.image3.toString("base64")}`,
            fabric: e.fabric,
            errorMessage: ""
        }));
        return res.status(200).json(itemsData);
    } catch (err) {
        return res.status(500).json(err);
    }
});
app.post("/items/suggested", async (req, res) => {
    try {
        const { email, limit = 4 } = req.body;
        const ipAddress = ((req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "").replace("::ffff:", "");
        const clickQuery = email && email !== "guest" ? { email } : { ipAddress };
        const clicks = await ProductClick.find(clickQuery).sort({ clickedAt: -1 }).limit(limit).select("productId").lean();
        if(!clicks.length) {
            return res.json({ products: [], reason: "no-clicks" });
        }
        const clickedIds = [...new Set(clicks.map(c => c.productId.toString()))];
        const products = await Item.find({_id: { $in: clickedIds }}).lean();
        const productMap = new Map(products.map(p => [p._id.toString(), p]));
        const orderedProducts = clickedIds.map(id => productMap.get(id)).filter(Boolean);
        return res.json({products: mapItems(orderedProducts), reason:"clicked-only"});
    } 
    catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});
function mapItems(items: any[]) {
  return items.map(e => ({
    itemId: e._id,
    name: e.name,
    size: {
        S: e.size.S,
        M: e.size.M,
        L: e.size.L,
        XL: e.size.XL,
        XXL: e.size.XXL,
        XXXL: e.size.XXXL
        },
    price: e.price,
    actualPrice: e.actualPrice,
    category: e.category,
    image: `data:image/webp;base64,${e.image.toString("base64")}`,
    image1: `data:image/webp;base64,${e.image1.toString("base64")}`,
    image2: `data:image/webp;base64,${e.image2.toString("base64")}`,
    image3: `data:image/webp;base64,${e.image3.toString("base64")}`,
    fabric: e.fabric
  }));
}
app.get("/api/items/:ItemID",async(req:express.Request,res:express.Response)=>{
    try {
        const items:IItem | null = await Item.findById(req.params.ItemID);
        if(items) {
            const itemData:ItemView = {
                itemId:items._id as Types.ObjectId,
                name:items.name,
                size:{
                    S:items.size.S,
                    M:items.size.M,
                    L:items.size.L,
                    XL:items.size.XL,
                    XXL:items.size.XXL,
                    XXXL:items.size.XXXL
                },
                price:items.price,
                actualPrice:items.actualPrice,
                description:items.description,
                category:items.category,
                image:`data:image/webp;base64,${items.image.toString("base64")}`,
                image1:`data:image/webp;base64,${items.image1.toString("base64")}`,
                image2:`data:image/webp;base64,${items.image2.toString("base64")}`,
                image3:`data:image/webp;base64,${items.image3.toString("base64")}`,
                fabric:items.fabric,
                errorMessage:"",
            }
            return res.status(200).json(itemData);
        }
        else {
            return res.status(404).json({errorMessage:"Product not found"});
        }
    }
    catch(err) {
        return res.status(500).json(err);
    }
});
if(config.PORT) {
    app.listen(config.PORT,()=>{
        console.log("server started");
    })
}