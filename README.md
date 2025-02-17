# Judge0 IDE with AI Features

An intelligent online code editor powered by Judge0 and OpenRouter AI. Features include:
- AI-powered code assistance
- Intelligent error fixing
- Comment-to-code generation
- Multi-language support

## Local Deployment

1. Clone the repository:
```bash
git clone https://github.com/bisman-sodhi/SocraticAI
cd SocraticAI
```

2. Install dependencies:
```bash
npm install
```

3. Get an OpenRouter API Key:
   - Visit [OpenRouter](https://openrouter.ai/keys)
   - Create an account or sign in
   - Generate a new API key
   - Copy the key (starts with 'sk-or-v1-...')

4. Set up your API key:
   - Launch the application
   - Click the model selector dropdown in the top right
   - Select "Set API Key"
   - Paste your OpenRouter API key
   - Click Save

5. Start the server:
```bash
npm start
```

6. Open `http://localhost:8001` in your browser

## Features

### 1. AI Code Assistant

There are three ways to get AI help:

a) Using the Chat Panel:
- Type your question in the chat input
- Press Enter or click Send
- View AI response in the chat panel

b) Using Code Selection:
- Select code in the editor
- Click the "Ask AI" button that appears
- Type your question about the selected code
- Get contextual help about that specific code

c) Using Error Fixes:
- When your code has compilation errors
- AI automatically suggests fixes
- View suggestions in both chat and inline

### 2. Automatic Error Fixing

When your code has compilation errors:
1. AI analyzes the error and suggests fixes
2. Error line is highlighted in red
3. Suggested fix appears below in green
4. You can:
   - Click [Accept] to apply the fix
   - Click [Reject] to dismiss the suggestion

### 3. Comment-to-Code Generation

Convert comments to working code:
1. Write a comment describing what you want
2. End it with `//` to trigger code generation
   ```cpp
   // print hello world //
   ```
3. AI generates the appropriate code below the comment
4. Generated code maintains proper indentation

Example comments:
```cpp
// create a function that adds two numbers //
// print numbers from 1 to 10 //
// read user input into variable x //
```

### 4. Language Support

The IDE supports multiple programming languages including:
- C++
- Python
- Java
- JavaScript
- And many more...

AI features automatically adapt to the selected language.

## Tips

1. For best results with comment-to-code:
   - Be specific in your comments
   - End comments with `//` to trigger generation
   - Comments should describe one operation

2. For error fixes:
   - Review the suggested fix in the chat panel
   - Check the inline suggestion
   - Accept or reject using the buttons

3. For code questions:
   - Select relevant code before asking
   - Be specific in your questions
   - Use the chat panel for general questions

## Troubleshooting

1. If AI features aren't working:
   - Check your OpenRouter API key
   - Ensure you have internet connection
   - Check browser console for errors

2. Rate Limits:
   - Free tier has request limits
   - Wait a minute between requests
   - Consider upgrading to a paid tier

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
