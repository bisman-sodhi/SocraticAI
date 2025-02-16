# Judge0 IDE

A simple and powerful online code editor that supports multiple programming languages and provides AI-powered error assistance.

## Features

- Code execution in multiple programming languages
- Real-time code compilation and execution
- Integrated AI assistant for:
  - Code error analysis and fixes
  - Inline code suggestions
  - Programming questions and answers
- Dark theme with syntax highlighting
- Input/Output console
- File operations (open/save)

## Setup and Running

1. Clone the repository:
```bash
git clone https://github.com/judge0/ide.git
cd ide
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open `http://localhost:3000` in your browser

## Setting up the AI Assistant

1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. In the IDE, click the "Configure" dropdown in the top right
3. Select "Configure API Key"
4. Enter your OpenRouter API key
5. Click Save

## Using the AI Features

### Error Assistance
When your code has a compilation error:
1. The error will be displayed in the output panel
2. The AI assistant will automatically analyze the error
3. You'll receive:
   - An explanation of the error
   - The exact line where the error occurred
   - A suggested fix
4. Click "Accept" next to the suggestion to apply the fix

### Code Questions
1. Type your programming question in the chat input at the bottom
2. Press Enter or click Send
3. The AI will respond with relevant code examples and explanations

## Configuration

- Select different AI models from the Configure dropdown
- Customize editor settings like font size and theme
- Configure compiler options for different languages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
