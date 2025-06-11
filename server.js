require("dotenv").config();
const express = require("express");
const axios = require("axios");

const metadataRoutes = require('./app/routes/metadataRoutes');
const authConfig = require('./app/config/auth');

const app = express();
const PORT = process.env.PORT || 3000;

//Used for authentication
app.use('/auth', authConfig);

app.use(express.json());
app.use('/api', metadataRoutes);

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});