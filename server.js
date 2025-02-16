import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import config from './js/config.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        console.log('Received chat request with model:', req.body.model);
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": req.headers.authorization,
                "HTTP-Referer": req.headers["http-referer"],
                "X-Title": req.headers["x-title"],
                "Content-Type": "application/json"
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter API Error:', {
                status: response.status,
                statusText: response.statusText,
                headers: req.headers,
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