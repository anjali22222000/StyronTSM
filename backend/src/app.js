import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();

import { apiLimiter } from "./middleware/rateLimiters.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import steelPriceRoutes from "./routes/steelPriceRoutes.js";
import featuredProductRoutes from "./routes/featuredProductRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import emailTemplateRoutes from "./routes/emailTemplateRoutes.js";

export const app = express();

app.use(helmet());
// CLIENT_URL in .env can be a single origin or a comma-separated list
// (e.g. "https://your-app.vercel.app,http://localhost:5173")
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api/", apiLimiter);

app.get("/api/health", (req, res) => res.json({ success: true, message: "OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/users", userRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/steel-prices", steelPriceRoutes);
app.use("/api/featured-products", featuredProductRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/email-templates", emailTemplateRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
