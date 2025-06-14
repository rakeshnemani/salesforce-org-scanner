const crypto = require("crypto");
const querystring = require("querystring");
const express = require('express');
const axios = require('axios'); // Import axios module
const fs = require('fs'); // Import fs module

const router = express.Router();

// Salesforce OAuth URLs
//const AUTH_URL = "https://login.salesforce.com/services/oauth2/authorize";
//const TOKEN_URL = "https://login.salesforce.com/services/oauth2/token";

const AUTH_URL = process.env.SALESFORCE_AUTH_URL || "https://login.salesforce.com/services/oauth2/authorize";
const TOKEN_URL = process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com/services/oauth2/token";

// Generate a random string for the code verifier
const generateCodeVerifier = () => {
    return crypto.randomBytes(32).toString("base64url");
};

// Generate a SHA256-based code challenge
const generateCodeChallenge = (codeVerifier) => {
    return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
};

// Route to start OAuth with PKCE
router.get('/salesforce', (req, res) => {
    // Store PKCE values (should be stored per session in production)
    let codeVerifier = generateCodeVerifier();
    let codeChallenge = generateCodeChallenge(codeVerifier);

    req.session.codeVerifier = codeVerifier;
    const params = querystring.stringify({
        response_type: "code",
        client_id: process.env.SALESFORCE_CLIENT_ID,
        redirect_uri: process.env.SALESFORCE_CALLBACK_URL,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
    });

    res.redirect(`${AUTH_URL}?${params}`);
});

// Callback route to exchange code for access token
router.get('/callback', async (req, res) => {
    const authCode = req.query.code;
    if (!authCode) {
        return res.status(400).send("Missing authorization code");
    }

    // Retrieve code verifier from the user's session
    const codeVerifier = req.session.codeVerifier;
    if (!codeVerifier) {
        return res.status(400).send("PKCE code verifier not found.");
    }

    try {
        const tokenResponse = await axios.post(
            TOKEN_URL,
            querystring.stringify({
                grant_type: "authorization_code",
                client_id: process.env.SALESFORCE_CLIENT_ID,
                client_secret: process.env.SALESFORCE_CLIENT_SECRET,
                redirect_uri: process.env.SALESFORCE_CALLBACK_URL,
                code: authCode,
                code_verifier: codeVerifier, // Send the original verifier
            }),
            {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            }
        );

        // Store tokens in the user's session
        req.session.tokens = response.data;

        // Save tokens to tokens.json
        fs.writeFileSync("tokens.json", JSON.stringify(tokenResponse.data, null, 2));
        res.send("Authentication Successful! Tokens saved.");
    } catch (error) {
        console.error("Error exchanging code for token:", error.response?.data || error.message);
        res.status(500).send("Authentication failed");
    }
});

// Provide route to retrieve a valid access_token (for subsequent API requests)
router.get('/access-token', (req, res) => {
    if (!req.session.tokens) {
        return res.status(404).send("Not authenticated.");
    }

    res.json(req.session.tokens);
});

module.exports = router;