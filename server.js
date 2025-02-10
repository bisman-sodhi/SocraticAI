const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
                "HTTP-Referer": config.SITE_URL,
                "X-Title": "Judge0 IDE",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-thinking-exp:free",
                messages: [{
                    role: "system",
                    content: "You are a helpful programming assistant. When analyzing code errors, provide clear explanations and specific fixes."
                }, ...req.body.messages]
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`)); 