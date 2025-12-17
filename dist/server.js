"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = __importDefault(require("./config"));
const mongoose_1 = __importDefault(require("mongoose"));
const UserRouter_1 = __importDefault(require("./routers/UserRouter"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const AmdinRoutes_1 = __importDefault(require("./routers/AmdinRoutes"));
const Item_1 = __importDefault(require("./models/items/Item"));
const CartRouter_1 = __importDefault(require("./routers/CartRouter"));
const mongoose_2 = require("mongoose");
const ProductClick_1 = __importDefault(require("./models/ProductClicks/ProductClick"));
const app = (0, express_1.default)();
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cors_1.default)({
    origin: ["https://vibrantflight.in", "https://www.vibrantflight.in"],
    credentials: true,
}));
app.set("trust proxy", true);
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        "https://vibrantflight.in",
        "https://www.vibrantflight.in",
    ];
    if (!origin) {
        return res.status(403).json({ message: "Origin missing" });
    }
    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ message: "Origin not allowed" });
    }
    next();
});
app.use("/api/users", UserRouter_1.default);
app.use("/api/admins", AmdinRoutes_1.default);
app.use("/api/cart", CartRouter_1.default);
if (config_1.default.MONGO_DB_URL) {
    mongoose_1.default.connect(config_1.default.MONGO_DB_URL).then((res) => {
        console.log("mongo db connected");
    }).catch((err) => {
        console.log("error in mongodb connection");
    });
}
app.get("/", (req, res) => {
    return res.status(200).json({
        "msg": "server is running"
    });
});
app.get("/get-items", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const category = req.query.category;
        const filter = {};
        if (category)
            filter.category = category;
        const items = await Item_1.default.find(filter).sort({ _id: -1 }).skip((page - 1) * 8).limit(8).lean();
        const itemsData = items.map((e) => ({
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
            description: e.description,
            category: e.category,
            image: `data:image/webp;base64,${e.image.toString("base64")}`,
            image1: `data:image/webp;base64,${e.image1.toString("base64")}`,
            image2: `data:image/webp;base64,${e.image2.toString("base64")}`,
            image3: `data:image/webp;base64,${e.image3.toString("base64")}`,
            fabric: e.fabric,
            errorMessage: ""
        }));
        return res.status(200).json(itemsData);
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
app.post("/items/suggested", async (req, res) => {
    try {
        const { email, limit = 4 } = req.body;
        const ipAddress = (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "").replace("::ffff:", "");
        let clickQuery;
        if (email && email !== "guest") {
            clickQuery = { email };
        }
        else {
            clickQuery = { ipAddress };
        }
        const clicks = await ProductClick_1.default.find(clickQuery).select("productId").lean();
        const clickedObjectIds = clicks.map(c => mongoose_2.Types.ObjectId.isValid(c.productId.toString())
            ? new mongoose_2.Types.ObjectId(c.productId.toString())
            : null).filter(Boolean);
        console.log("Clicks:", clicks.length);
        console.log("Valid ObjectIds:", clickedObjectIds.length);
        if (!clickedObjectIds.length) {
            return res.json({
                products: [],
                reason: "no-clicks"
            });
        }
        const products = await Item_1.default.find({ _id: { $in: clickedObjectIds } }).sort({ _id: -1 }).limit(limit).lean();
        return res.json({
            products: mapItems(products),
            reason: "clicked-only"
        });
    }
    catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
});
function mapItems(items) {
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
app.get("/api/items/:ItemID", async (req, res) => {
    try {
        const items = await Item_1.default.findById(req.params.ItemID);
        if (items) {
            const itemData = {
                itemId: items._id,
                name: items.name,
                size: {
                    S: items.size.S,
                    M: items.size.M,
                    L: items.size.L,
                    XL: items.size.XL,
                    XXL: items.size.XXL,
                    XXXL: items.size.XXXL
                },
                price: items.price,
                actualPrice: items.actualPrice,
                description: items.description,
                category: items.category,
                image: `data:image/webp;base64,${items.image.toString("base64")}`,
                image1: `data:image/webp;base64,${items.image1.toString("base64")}`,
                image2: `data:image/webp;base64,${items.image2.toString("base64")}`,
                image3: `data:image/webp;base64,${items.image3.toString("base64")}`,
                fabric: items.fabric,
                errorMessage: "",
            };
            return res.status(200).json(itemData);
        }
        else {
            return res.status(404).json({ errorMessage: "Product not found" });
        }
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
if (config_1.default.PORT) {
    app.listen(config_1.default.PORT, () => {
        console.log("server started");
    });
}
//# sourceMappingURL=server.js.map