"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/users/User"));
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = __importDefault(require("../config"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AuthAdmin_1 = __importDefault(require("../middleWare/AuthAdmin"));
const Item_1 = __importDefault(require("../models/items/Item"));
const Order_1 = __importDefault(require("../models/orders/Order"));
const AdminRouter = express_1.default.Router();
AdminRouter.post("/login", [
    (0, express_validator_1.body)("userName").not().isEmpty().withMessage("User Name can not left empty"),
    (0, express_validator_1.body)("password").not().isEmpty().withMessage("Password can not left empty"),
], async (req, res) => {
    let userData = {
        firstName: "",
        lastName: "",
        email: "",
        userName: req.body.userName,
        password: req.body.password,
        errorMessage: "",
        isAdmin: false,
        lastLogIn: null,
    };
    try {
        let errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            userData = {};
            const errorArray = errors.array();
            userData.errorMessage = errorArray.length > 0 ? errorArray[0].msg : "Validation error";
            return res.status(400).json(userData);
        }
        else {
            let token = await req.cookies["token"];
            let adminToken = await req.cookies["adminToken"];
            if (token || adminToken) {
                userData = {};
                userData.errorMessage = "you have already loged in";
                return res.status(400).json(userData);
            }
            else {
                let user = await User_1.default.findOne({ $or: [{ userName: userData.userName }, { email: userData.userName }] });
                if (user) {
                    if (await bcryptjs_1.default.compare(userData.password, user.password)) {
                        let payLoad = {
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.email,
                        };
                        if (!user.isAdmin) {
                            userData = {};
                            userData.errorMessage = "You have no access to this service";
                            return res.status(401).json(userData);
                        }
                        if (config_1.default.ADMIN_SECRET_KEY) {
                            let token = jsonwebtoken_1.default.sign(payLoad, config_1.default.ADMIN_SECRET_KEY);
                            user = await User_1.default.findOneAndUpdate({ userName: user.userName }, { lastLogIn: new Date() });
                            userData = {};
                            res.cookie("adminToken", token, { httpOnly: true, sameSite: 'none', secure: true, domain: '.thegerado.com', path: '/', maxAge: 1000 * 60 * 60 * 24 * 30, });
                            return res.status(200).json(userData);
                        }
                        else {
                            userData = {};
                            userData.errorMessage = "Something went wrong. Our team has been notified and is working on a fix.";
                            return res.status(500).json(userData);
                        }
                    }
                    else {
                        userData = {};
                        userData.errorMessage = "Invalid Password";
                        return res.status(400).json(userData);
                    }
                }
                else {
                    userData = {};
                    userData.errorMessage = "Username or email dose not exist";
                    return res.status(400).json(userData);
                }
            }
        }
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.get('/orders', AuthAdmin_1.default, async (req, res) => {
    try {
        const orders = await (await Order_1.default.find().lean()).reverse();
        if (!orders || orders.length === 0) {
            return res.status(200).json([]);
        }
        const ordersData = orders.map(order => ({
            userName: order.userName,
            orderId: order.orderId,
            paymentId: order.paymentId,
            items: order.items.map(item => ({
                ...item,
                image: `data:image/webp;base64,${item.image.toString("base64")}`
            })),
            amount: order.amount,
            trackingId: order.trackingId,
            status: order.status,
            mobile: order.mobile,
            address: order.address
        }));
        return res.status(200).json(ordersData);
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.patch("/dispatch", AuthAdmin_1.default, async (req, res) => {
    try {
        const { orderId, trackingId } = req.body;
        if (orderId) {
            if (trackingId == "") {
                return res.status(400).json({ errorMessage: "tracking Id cant left empty" });
            }
            const order = await Order_1.default.findOneAndUpdate({ orderId }, { status: "dispatched", trackingId: trackingId });
            return res.status(200).json({});
        }
        else {
            return res.status(401).json({ errorMessage: "invalid order id" });
        }
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.patch("/cancel-order", AuthAdmin_1.default, async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) {
            return res.status(400).json({ errorMessage: "orderId is required" });
        }
        const order = await Order_1.default.findOneAndUpdate({ orderId: orderId }, { status: "cancelled" }, { new: true });
        if (!order) {
            return res.status(404).json({ errorMessage: "Order not found" });
        }
        const items = order.items;
        for (const cartItem of items) {
            const { itemId, selectedSize, quantity } = cartItem;
            const sizePath = `size.${selectedSize}`;
            await Item_1.default.findByIdAndUpdate(itemId, { $inc: { [sizePath]: quantity } }, { new: true });
        }
        return res.status(200).json({ message: "Order cancelled and stock updated." });
    }
    catch (err) {
        console.error("Cancel order error:", err);
        return res.status(500).json({ errorMessage: "Internal server error" });
    }
});
AdminRouter.post("/upload", AuthAdmin_1.default, (0, express_validator_1.body)("name").not().isEmpty().withMessage("Name can not left empty"), (0, express_validator_1.body)("price").not().isEmpty().withMessage("Price can not left empty"), (0, express_validator_1.body)("actualPrice").not().isEmpty().withMessage("Need to enter actual price"), (0, express_validator_1.body)("image").not().isEmpty().withMessage("Imaage can not left can not left empty"), async (req, res) => {
    try {
        let itemData = {
            itemId: '',
            name: req.body.name,
            size: {
                S: req.body.size.S,
                M: req.body.size.M,
                L: req.body.size.L,
                XL: req.body.size.XL,
                XXL: req.body.size.XXL,
                XXXL: req.body.size.XXXL
            },
            actualPrice: req.body.actualPrice,
            price: req.body.price,
            description: req.body.description,
            washcare: req.body.washcare,
            details: req.body.details,
            specifications: req.body.specifications,
            category: req.body.category,
            image: req.body.image,
            image1: req.body.image1,
            image2: req.body.image2,
            image3: req.body.image3,
            fabric: req.body.fabric
        };
        let errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            itemData = {};
            const errorArray = errors.array();
            itemData.errorMessage = errorArray.length > 0 ? errorArray[0].msg : "Validation error";
            return res.status(400).json(itemData);
        }
        else {
            if (!itemData.image.startsWith('data:image/webp;base64,')) {
                itemData = {};
                itemData.errorMessage = "Only JPG or WebP images are allowed";
                return res.status(400).json(itemData);
            }
            else {
                let base64Data = itemData.image.replace(/^data:image\/webp;base64,/, "");
                let base64Data1 = itemData.image1.replace(/^data:image\/webp;base64,/, "");
                let base64Data2 = itemData.image2.replace(/^data:image\/webp;base64,/, "");
                let base64Data3 = itemData.image3.replace(/^data:image\/webp;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const buffer1 = Buffer.from(base64Data1, 'base64');
                const buffer2 = Buffer.from(base64Data2, 'base64');
                const buffer3 = Buffer.from(base64Data3, 'base64');
                let item = await new Item_1.default({ ...itemData, image: buffer, image1: buffer1, image2: buffer2, image3: buffer3 });
                item.save();
                itemData = {};
                return res.status(200).json(itemData);
            }
        }
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.delete("/delete-product", AuthAdmin_1.default, async (req, res) => {
    try {
        const { productId } = req.body;
        if (productId === "") {
            return res.status(500).json({ errorMessage: "Product Id cant left empty" });
        }
        else {
            await Item_1.default.findByIdAndDelete(productId);
            return res.status(200).json({});
        }
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.patch("/update-item", AuthAdmin_1.default, async (req, res) => {
    try {
        const { itemId, S = 0, M = 0, L = 0, XL = 0, XXL = 0, XXXL = 0, } = req.body;
        if (!itemId) {
            return res.status(400).json({ errorMessage: "itemId is required" });
        }
        const item = await Item_1.default.findById(itemId);
        if (!item) {
            return res.status(404).json({ errorMessage: "Item not found" });
        }
        const updatedSizes = {
            "size.S": (item.size?.S || 0) + S,
            "size.M": (item.size?.M || 0) + M,
            "size.L": (item.size?.L || 0) + L,
            "size.XL": (item.size?.XL || 0) + XL,
            "size.XXL": (item.size?.XXL || 0) + XXL,
            "size.XXXL": (item.size?.XXXL || 0) + XXXL,
        };
        await Item_1.default.findByIdAndUpdate(itemId, { $set: updatedSizes });
        return res.status(200).json({ message: "Stock updated successfully" });
    }
    catch (err) {
        console.error("Stock update error:", err);
        return res.status(500).json({ errorMessage: "Internal server error" });
    }
});
AdminRouter.get("/items-list", AuthAdmin_1.default, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const items = await Item_1.default.find().sort({ _id: -1 }).skip((page - 1) * 8).limit(8);
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
            actualPrice: e.actualPrice,
            price: e.price,
            description: e.description,
            washcare: e.washcare,
            details: e.details,
            specifications: e.specifications,
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
AdminRouter.get("/me", AuthAdmin_1.default, async (req, res) => {
    try {
        let userData = req.body.userData;
        return res.status(200).json(userData);
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
AdminRouter.get("/logout", AuthAdmin_1.default, async (req, res) => {
    try {
        res.clearCookie("adminToken", { httpOnly: true, sameSite: "none", secure: true, domain: ".thegerado.com", path: "/", });
        return res.status(200).json({});
    }
    catch (err) {
        return res.status(500).json(err);
    }
});
exports.default = AdminRouter;
//# sourceMappingURL=AmdinRoutes.js.map