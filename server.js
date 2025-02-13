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
            const headers = {
                "Authorization": `Bearer ${config.default.OPENROUTER_API_KEY}`,
                "HTTP-Referer": config.default.SITE_URL,
                "X-Title": "Judge0 IDE",
                "Content-Type": "application/json",
                "OpenAI-Organization": "Judge0 IDE"
            };

            console.log('Request Headers:', headers);  // Add this to see exact headers

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: headers,
                body: JSON.stringify({
                    model: "meta-llama/llama-3.2-11b-vision-instruct:free",
                    messages: [{
                        role: "system",
                        content: "You are a helpful programming assistant."
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