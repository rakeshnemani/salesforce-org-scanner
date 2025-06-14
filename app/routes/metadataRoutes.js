const express = require('express');
const { getSalesforceMetadata } = require('../services/salesforceService');
const { analyzeFieldUpdatesWithChatGPT } = require('../services/chatgptService');

const router = express.Router();

router.get('/analyze/customizations', async (req, res) => {
    if (!req.session.tokens) {
        return res.status(403).json({ error: 'In Metadata Rounte. Not authenticated.' });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
        // Shared object to accumulate data
        const responseData = {};

        // Function to send updates to the client
        const sendUpdate = (data) => {
            res.write(`data: ${JSON.stringify(data, null, 2)}\n\n`);
        };
        // Retrieve metadata and add to responseData
        const { allMetadataItemsByType, allFieldUpdates } = await getSalesforceMetadata(req, responseData, sendUpdate);
        //const chatGPTAnalysisResults = await analyzeFieldUpdatesWithChatGPT(responseData, sendUpdate, allFieldUpdates);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;