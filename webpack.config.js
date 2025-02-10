const webpack = require('webpack');
const dotenv = require('dotenv');

module.exports = {
    // ... other config
    plugins: [
        new webpack.DefinePlugin({
            'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY)
        })
    ]
}; 