const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Import config as ES module
import('./js/config.js').then(config => {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.static('.')); // Serve static files from current directory

    // Chat endpoint
    app.post('/api/chat', async (req, res) => {
        try {
            console.log('Sending request to OpenRouter with config:', {
                apiKey: config.default.OPENROUTER_API_KEY ? 'Present' : 'Missing',
                siteUrl: config.default.SITE_URL,
                model: "meta-llama/llama-3.2-11b-vision-instruct:free"
            });

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${config.default.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": config.default.SITE_URL,
                    "X-Title": "Judge0 IDE",
                    "Content-Type": "application/json",
                    "OpenAI-Organization": "Judge0 IDE"
                },
                body: JSON.stringify({
                    model: "meta-llama/llama-3.2-11b-vision-instruct:free",
                    messages: [{
                        role: "system",
                        content: "You are a helpful programming assistant. When analyzing code errors, provide clear explanations and specific fixes."
                    }, ...req.body.messages]
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('OpenRouter API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                throw new Error(`API Error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log('OpenRouter API Response:', data);
            res.json(data);
        } catch (error) {
            console.error('Detailed Error:', {
                message: error.message,
                stack: error.stack
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
}); 