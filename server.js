import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

import metadataRoutes from './app/routes/metadataRoutes.js';
import authConfig from './app/config/auth.js';

dotenv.config();

const startServer = async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Trust reverse proxy (required by Heroku for HTTPS redirect)
  app.set("trust proxy", 1);

  // Create Redis client
  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err) => console.error("❌ Redis Client Error!", err));
  await redisClient.connect();
  console.log("✅ Redis connected");

  // Configure Redis store
  const store = new RedisStore({ client: redisClient });

  // Configure session middleware
  app.use(session({
    store,
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax"
    }
  }));

  // Redirect all HTTP requests to HTTPS in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/', (req, res) => {
    res.status(200).send('OK');
  });

  // Routes
  app.use('/auth', authConfig);
  app.use('/api', metadataRoutes);

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
