require("dotenv").config();
const express = require("express");
const axios = require("axios");
const expressSession = require("express-session");
const RedisStore = require("connect-redis").default;
const { createClient } = require("redis");

const metadataRoutes = require('./app/routes/metadataRoutes');
const authConfig = require('./app/config/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trusting Heroku's reverse proxy
app.set("trust proxy", 1);

// Create a Redis client with your Redis Cloud URL
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on("error", (err) => console.error("Redis Client Error!", err));
await redisClient.connect();

// Sessions (keep this SECRET and use a strong password!)
app.use(
  expressSession({ 
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: true // <- Heroku is HTTPS
    },
  })
);

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// check health of ec2
app.get('/', (req, res) => {
  res.status(200).send('OK'); // or whatever health response you want
});


//Used for authentication
app.use('/auth', authConfig);

//app.use(express.json());
app.use('/api', metadataRoutes);

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});