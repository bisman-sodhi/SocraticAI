// Track the current language
let currentLanguage = 'cpp';

// Debounce function to limit API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize autocomplete for Monaco editor
function initializeAutocomplete(editor) {
    // Track current suggestion
    let currentDecorationIds = [];
    let lastRequestTime = 0;
    const RATE_LIMIT_MS = 2000; // Wait 2 seconds between requests
    
    const debouncedSuggestion = debounce(async (model, position) => {
        // Check if enough time has passed since last request
        const now = Date.now();
        if (now - lastRequestTime < RATE_LIMIT_MS) {
            return;
        }
        lastRequestTime = now;
        
        const lineContent = model.getLineContent(position.lineNumber);
        const prefix = lineContent.substring(0, position.column);

        // Get suggestions from AI
        const suggestions = await getAICompletionSuggestions(
            prefix,
            currentLanguage,
            model.getValue()
        );

        // Clear previous suggestion
        if (currentDecorationIds.length > 0) {
            editor.deltaDecorations(currentDecorationIds, []);
            currentDecorationIds = [];
        }

        // If we have a suggestion, show it as ghost text
        if (suggestions.length > 0) {
            currentDecorationIds = editor.deltaDecorations([], [{
                range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                ),
                options: {
                    after: {
                        content: suggestions[0].text,
                        inlineClassName: 'ghost-text'
                    }
                }
            }]);
        }
    }, 1000); // Wait 1 second after typing stops before making API call
    
    editor.onDidType(async (e) => {
        const model = editor.getModel();
        const position = editor.getPosition();
        debouncedSuggestion(model, position);
    });

    // Handle Tab key to accept suggestion
    editor.addCommand(monaco.KeyCode.Tab, () => {
        if (currentDecorationIds.length > 0) {
            const position = editor.getPosition();
            const decorations = editor.getModel().getDecorationOptions(currentDecorationIds[0]);
            const suggestion = decorations.after.content;
            
            editor.executeEdits('suggestion', [{
                range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                ),
                text: suggestion
            }]);
            
            editor.deltaDecorations(currentDecorationIds, []);
            currentDecorationIds = [];
            
            return true;  // Prevent default Tab behavior
        }
        return false;  // Allow default Tab behavior
    });
}

// Get AI suggestions for autocomplete
async function getAICompletionSuggestions(prefix, language, fullCode) {
    try {
        const prompt = `As a coding assistant, suggest completions for this code in ${language}:

Code context:
${fullCode}

Current line being typed:
${prefix}

Provide a single completion in this format:
completion text | brief description

Consider the language syntax, common patterns, and context.`;

        const response = await window.sendChatMessage(prompt);
        
        // Parse AI response into suggestions
        return parseSuggestions(response);
    } catch (error) {
        console.error('Error getting completion suggestions:', error);
        return [];
    }
}

// Parse AI response into structured suggestions
function parseSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n');

    for (const line of lines) {
        // Look for suggestion with description
        const match = line.match(/^([^|]+)\|\s*(.+)$/);
        if (match) {
            suggestions.push({
                text: match[1].trim(),
                description: match[2].trim()
            });
            break;  // Only take the first suggestion
        }
    }

    return suggestions;
}

// Update language when it changes
function updateLanguage(newLanguage) {
    currentLanguage = newLanguage;
} 