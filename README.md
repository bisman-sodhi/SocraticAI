# SocraticAI - AI-Enhanced Judge0 IDE

An enhanced version of Judge0 IDE with AI-powered code assistance, built on top of the original [Judge0 IDE](https://ide.judge0.com).

![Judge0 IDE Screenshot](./.github/screenshot.png)

## Features

- **AI Chat Interface**: Ask questions about your code and get intelligent responses
- **Code-Aware Conversations**: Select code segments and discuss them with the AI
- **Compilation Error Assistance**: Get AI suggestions when your code fails to compile
- **Integrated Experience**: Chat interface seamlessly integrated with the IDE layout

## Prerequisites

- Node.js (v14 or higher)
- npm
- An OpenRouter API key ([Get one here](https://openrouter.ai/))

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/bisman-sodhi/SocraticAI.git
   cd SocraticAI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   OPENROUTER_API_KEY=your_api_key_here
   SITE_URL=http://localhost:3000
   ```

4. Create a `js/config.js` file:
   ```javascript
   const config = {
       OPENROUTER_API_KEY: "your_api_key_here",
       SITE_URL: "http://localhost:3000",
       SITE_NAME: "Judge0 IDE"
   };

   export default config;
   ```

5. Start the development server:
   ```bash
   npm start
   ```

6. In a separate terminal, start a local server for the frontend:
   ```bash
   python -m http.server 8001
   ```

7. Access the IDE at `http://localhost:3000`

## Project Structure

# Judge0 IDE
[![Judge0 IDE Screenshot](./.github/screenshot.png)](https://ide.judge0.com)

[![License](https://img.shields.io/github/license/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/blob/master/LICENSE)
[![Release](https://img.shields.io/github/v/release/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/releases)
[![Stars](https://img.shields.io/github/stars/judge0/ide?color=2185d0&style=flat-square)](https://github.com/judge0/ide/stargazers)

<a href="https://www.producthunt.com/posts/judge0-ide" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=179885&theme=light" alt="" height="43px" /></a>

## About
[**Judge0 IDE**](https://ide.judge0.com) is a free and open-source online code editor that allows you to write and execute code from a rich set of languages. It's perfect for anybody who just wants to quickly write and run some code without opening a full-featured IDE on their computer. Moreover, it is also useful for teaching and learning or just trying out a new language.

Judge0 IDE is using [**Judge0**](https://ce.judge0.com) for executing the user's source code.

Visit https://ide.judge0.com, and enjoy happy coding. :)

## Community
Do you have a question, feature request, or something else on your mind? Or do you want to follow Judge0 news?

* [Subscribe to Judge0 newsletter](https://subscribe.judge0.com)
* [Join our Discord server](https://discord.gg/GRc3v6n)
* [Watch asciicasts](https://asciinema.org/~hermanzdosilovic)
* [Report an issue](https://github.com/judge0/judge0/issues/new)
* [Contact us](mailto:contact@judge0.com)
* [Schedule an online meeting with us](https://meet.judge0.com)

## Author and Contributors
Judge0 IDE was created by [Herman Zvonimir Došilović](https://github.com/hermanzdosilovic).

Thanks a lot to all [contributors](https://github.com/judge0/ide/graphs/contributors) for their contributions to this project.

## License
Judge0 IDE is licensed under the [MIT License](https://github.com/judge0/ide/blob/master/LICENSE).
