"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ProductClickSchema = new mongoose_1.default.Schema({
    productId: { type: mongoose_1.default.Schema.ObjectId, required: true },
    email: { type: String },
    ipAddress: { type: String },
    clickedAt: { type: Date, default: Date.now }
});
exports.default = mongoose_1.default.model("ProductClick", ProductClickSchema);
//# sourceMappingURL=ProductClick.js.map