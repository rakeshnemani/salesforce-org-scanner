require("dotenv").config();
const express = require("express");
const axios = require("axios");
const expressSession = require("express-session");

const metadataRoutes = require('./app/routes/metadataRoutes');
const authConfig = require('./app/config/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Sessions (keep this SECRET and use a strong password!)
app.use(
  expressSession({ 
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false
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