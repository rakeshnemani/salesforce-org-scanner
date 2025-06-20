require("dotenv").config();
const express = require("express");
const axios = require("axios");
const expressSession = require("express-session");
const RedisStore = require("connect-redis");
const createClient = require("redis");

const metadataRoutes = require('./app/routes/metadataRoutes');
const authConfig = require('./app/config/auth');

dotenv.config();

const startServer = async () => {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Enable trusting Heroku's reverse proxy
  app.set("trust proxy", 1);

  // Create Redis store and client
  const RedisStore = connectRedis(session);
  const redisClient = createClient({ url: process.env.REDIS_URL });
  redisClient.on("error", (err) => console.error("❌ Redis Client Error!", err));
  await redisClient.connect();
  console.log("✅ Redis connected");

  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax"
    }
  }));

  // Force HTTPS
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });

  // Body parser
  app.use(express.json());

  // Health check
  app.get('/', (req, res) => {
    res.status(200).send('OK');
  });

  // Routes
  app.use('/auth', authConfig);
  app.use('/api', metadataRoutes);

  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
};

startServer();