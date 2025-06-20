//const express = require('express');
import express from "express";
//const { getSalesforceMetadata } = require('../services/salesforceService');
import getSalesforceMetadata from '../services/salesforceService.js';
//const { analyzeFieldUpdatesWithChatGPT } = require('../services/chatgptService');
import analyzeFieldUpdatesWithChatGPT from '../services/chatgptService.js';

const router = express.Router();

router.get('/analyze/customizations', async (req, res) => {
    console.log("In Metadata Route");
    //console.log("Session Tokens:", req.session.tokens);
    //console.log("Session Tokens:", JSON.stringify(req, null, 2));
    if (!req.session.tokens) {
        return res.status(403).json({ error: 'In Metadata Route. Not authenticated.' });
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

//module.exports = router;
export default router;