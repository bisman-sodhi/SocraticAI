# SocraticAI IDE

SocraticAI IDE is an enhanced version of [Judge0 IDE](https://github.com/judge0/ide) that adds AI-powered features to help developers write and debug code more efficiently. Built on top of the excellent Judge0 IDE, this project adds:

- AI-powered code suggestions and error fixes
- Natural language to code conversion
- Context-aware code chat assistant
- Multi-language support

## Demo

- Try it live: [SocraticAI IDE](https://bisman-sodhi.github.io/SocraticAI/)
- Watch the demo: [YouTube Demo Video](https://youtu.be/98xezoHYNtU?si=P3Gf3xK5qHPUY_RD)

## Features

1. **AI Code Assistant**
   - Get help with errors and bugs
   - Convert comments to code
   - Ask questions about selected code

2. **Code Execution**
   - Run code in multiple languages through Judge0 API
   - View input/output in real-time
   - Monaco Editor with syntax highlighting
   - Intelligent error detection and suggestions

## Usage

1. **Code Execution**
   - Click "Run" or press Ctrl+Enter (⌘+Enter on Mac)

2. **AI Features**
   - **Comment-to-Code Generation**:
     - Write a comment describing what you want and end it with `//` to trigger code generation
     - Example: `// print hello world //`
     - AI generates the appropriate code below the comment
     - Generated code maintains proper indentation
   - **Automatic Error Fixing**: AI automatically suggests fixes for compilation errors:
     - AI analyzes the error and suggests fixes
     - Error line is highlighted in red
     - Suggested fix appears below in green
     - You can:
       - Click [Accept] to apply the fix
       - Click [Reject] to dismiss the suggestion
   - **Code Chat**: 
     - Select code and click "Ask AI"
     - Or use the chat panel for general questions
     - Context-aware responses based on your code

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-username/SocraticAI.git
cd SocraticAI
```

2. Serve the files using Python's built-in HTTP server:
```bash
python -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Configuration

1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Click the settings icon in the IDE
3. Select "Configure API Key"
4. Enter your OpenRouter API key
5. You can also select different AI models from the same menu

## Credits

This project builds upon:
- [Judge0 IDE](https://github.com/judge0/ide) - The base IDE platform
- [OpenRouter](https://openrouter.ai/) - AI model provider
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Judge0 CE API](https://ce.judge0.com/) - Code execution API

## License

This project is licensed under the same terms as Judge0 IDE. See the LICENSE file for details.
