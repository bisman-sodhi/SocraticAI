import { IS_PUTER } from "./puter.js";
import { DEFAULT_SOURCE, DEFAULT_STDIN } from "./default_code.js";
import { getStoredApiKey, setStoredApiKey, getSelectedModel, setSelectedModel } from './local_storage.js';
import { AI_MODELS, DEFAULT_MODEL } from './models.js';
const API_KEY = ""; // Get yours at https://platform.sulu.sh/apis/judge0
const API_URL = "http://localhost:3000"; // Remove from config.js if it's there

const AUTH_HEADERS = API_KEY ? {
    "Authorization": `Bearer ${API_KEY}`
} : {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://judge0-ce.p.sulu.sh";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://judge0-extra-ce.p.sulu.sh";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = i => 100;
const MAX_PROBE_REQUESTS = 50;

var fontSize = 13;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    content: [{
        type: "row",
        content: [{
            type: "component",
            width: 40,
            componentName: "source",
            id: "source",
            title: "Source Code",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "column",
            content: [{
                type: "component",
                componentName: "stdin",
                id: "stdin",
                title: "Input",
                isClosable: false,
                componentState: {
                    readOnly: false
                }
            }, {
                type: "component",
                componentName: "stdout",
                id: "stdout",
                title: "Output",
                isClosable: false,
                componentState: {
                    readOnly: false
                }
            },
        ]
        }, {
            type: "component",
            width: 30,
            componentName: "chat",
            id: "chat",
            title: "AI Assistant",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }]
    }]
};

var gPuterFile;

const SITE_NAME = "Judge0 IDE";
const SITE_URL = window.location.origin;

function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
    let reportBody = encodeURIComponent(
        `**Error Title**: ${title}\n` +
        `**Error Timestamp**: \`${new Date()}\`\n` +
        `**Origin**: ${window.location.href}\n` +
        `**Description**:\n${content}`
    );

    $("#report-problem-btn").attr("href", `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`);
    $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

function handleRunError(jqXHR) {
    showHttpError(jqXHR);
    $runBtn.removeClass("disabled");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "runError",
        data: jqXHR
    })), "*");
}

function handleResult(data) {
    const executionTime = Math.round(performance.now() - timeStart);  // Calculate time difference
    
    // Check if compilation error
    if (data.status.id === 6) { // Status ID 6 is typically Compilation Error
        handleCompileError(data);
        return;
    }

    let stdout = decode(data.stdout || "");
    let stderr = decode(data.stderr || "");
    let compile_output = decode(data.compile_output || "");
    let message = decode(data.message || "");
    let time = (data.time === null ? "-" : data.time + "s");
    let memory = (data.memory === null ? "-" : data.memory + "KB");

    $statusLine.html(`${data.status.description}, ${time}, ${memory}, TAT: ${executionTime}ms`);

    if (stdout === "" && stderr === "" && compile_output === "" && message === "") {
        stdout = "No output";
    }

    stdoutEditor.setValue(stdout + stderr + compile_output + message);
    
    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "postExecution",
        stdout: stdout,
        stderr: stderr
    })), "*");

    if (!data.status.id) {
        handleRunError(data);
        return;
    }

    $runBtn.removeClass("disabled");
}

async function getSelectedLanguage() {
    return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId())
}

function getSelectedLanguageId() {
    return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
    return $selectLanguage.find(":selected").attr("flavor");
}

async function run() {
    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    } else {
        $runBtn.addClass("disabled");
    }

    stdoutEditor.setValue("");
    $statusLine.html("");

    let x = layout.root.getItemsById("stdout")[0];
    x.parent.header.parent.setActiveContentItem(x);

    let sourceValue = encode(sourceEditor.getValue());
    let stdinValue = encode(stdinEditor.getValue());
    let languageId = getSelectedLanguageId();
    let compilerOptions = $compilerOptions.val();
    let commandLineArguments = $commandLineArguments.val();

    let flavor = getSelectedLanguageFlavor();

    if (languageId === 44) {
        sourceValue = sourceEditor.getValue();
    }

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true
    };

    let sendRequest = function (data) {
        window.top.postMessage(JSON.parse(JSON.stringify({
            event: "preExecution",
            source_code: sourceEditor.getValue(),
            language_id: languageId,
            flavor: flavor,
            stdin: stdinEditor.getValue(),
            compiler_options: compilerOptions,
            command_line_arguments: commandLineArguments
        })), "*");

        timeStart = performance.now();
        $.ajax({
            url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: AUTH_HEADERS,
            success: function (data, textStatus, request) {
                console.log(`Your submission token is: ${data.token}`);
                let region = request.getResponseHeader('X-Judge0-Region');
                setTimeout(fetchSubmission.bind(null, flavor, region, data.token, 1), INITIAL_WAIT_TIME_MS);
            },
            error: handleRunError
        });
    }

    if (languageId === 82) {
        if (!sqliteAdditionalFiles) {
            $.ajax({
                url: `./data/additional_files_zip_base64.txt`,
                contentType: "text/plain",
                success: function (responseData) {
                    sqliteAdditionalFiles = responseData;
                    data["additional_files"] = sqliteAdditionalFiles;
                    sendRequest(data);
                },
                error: handleRunError
            });
        }
        else {
            data["additional_files"] = sqliteAdditionalFiles;
            sendRequest(data);
        }
    } else {
        sendRequest(data);
    }
}

function fetchSubmission(flavor, region, submission_token, iteration) {
    if (iteration >= MAX_PROBE_REQUESTS) {
        handleRunError({
            statusText: "Maximum number of probe requests reached.",
            status: 504
        }, null, null);
        return;
    }

    $.ajax({
        url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
        headers: {
            "X-Judge0-Region": region
        },
        success: function (data) {
            if (data.status.id <= 2) { // In Queue or Processing
                $statusLine.html(data.status.description);
                setTimeout(fetchSubmission.bind(null, flavor, region, submission_token, iteration + 1), WAIT_TIME_FUNCTION(iteration));
            } else {
                handleResult(data);
            }
        },
        error: handleRunError
    });
}

function setSourceCodeName(name) {
    $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
    return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
    clear();
    sourceEditor.setValue(content);
    selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);
}

function saveFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function openAction() {
    if (IS_PUTER) {
        gPuterFile = await puter.ui.showOpenFilePicker();
        openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
    } else {
        document.getElementById("open-file-input").click();
    }
}

async function saveAction() {
    if (IS_PUTER) {
        if (gPuterFile) {
            gPuterFile.write(sourceEditor.getValue());
        } else {
            gPuterFile = await puter.ui.showSaveFilePicker(sourceEditor.getValue(), getSourceCodeName());
            setSourceCodeName(gPuterFile.name);
        }
    } else {
        saveFile(sourceEditor.getValue(), getSourceCodeName());
    }
}

function setFontSizeForAllEditors(fontSize) {
    sourceEditor.updateOptions({ fontSize: fontSize });
    stdinEditor.updateOptions({ fontSize: fontSize });
    stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLangauges() {
    return new Promise((resolve, reject) => {
        let options = [];

        $.ajax({
            url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
            success: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let language = data[i];
                    let option = new Option(language.name, language.id);
                    option.setAttribute("flavor", CE);
                    option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                    if (language.id !== 89) {
                        options.push(option);
                    }

                    if (language.id === DEFAULT_LANGUAGE_ID) {
                        option.selected = true;
                    }
                }
            },
            error: reject
        }).always(function () {
            $.ajax({
                url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
                success: function (data) {
                    for (let i = 0; i < data.length; i++) {
                        let language = data[i];
                        let option = new Option(language.name, language.id);
                        option.setAttribute("flavor", EXTRA_CE);
                        option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                        if (options.findIndex((t) => (t.text === option.text)) === -1 && language.id !== 89) {
                            options.push(option);
                        }
                    }
                },
                error: reject
            }).always(function () {
                options.sort((a, b) => a.text.localeCompare(b.text));
                $selectLanguage.append(options);
                resolve();
            });
        });
    });
};

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    monaco.editor.setModelLanguage(sourceEditor.getModel(), $selectLanguage.find(":selected").attr("langauge_mode"));

    if (!skipSetDefaultSourceCodeName) {
        setSourceCodeName((await getSelectedLanguage()).source_file);
    }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
    let option = $selectLanguage.find(`[value=${languageId}][flavor=${flavor}]`);
    if (option.length) {
        option.prop("selected", true);
        $selectLanguage.trigger("change", { skipSetDefaultSourceCodeName: true });
    }
}

function selectLanguageForExtension(extension) {
    let language = getLanguageForExtension(extension);
    selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
    return new Promise((resolve, reject) => {
        if (languages[flavor] && languages[flavor][languageId]) {
            resolve(languages[flavor][languageId]);
            return;
        }

        $.ajax({
            url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
            success: function (data) {
                if (!languages[flavor]) {
                    languages[flavor] = {};
                }

                languages[flavor][languageId] = data;
                resolve(data);
            },
            error: reject
        });
    });
}

function setDefaults() {
    setFontSizeForAllEditors(fontSize);
    sourceEditor.setValue(DEFAULT_SOURCE);
    stdinEditor.setValue(DEFAULT_STDIN);
    $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

    $statusLine.html("");

    loadSelectedLanguage();
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");

    $statusLine.html("");
}

function refreshSiteContentHeight() {
    const navigationHeight = document.getElementById("judge0-site-navigation").offsetHeight;

    const siteContent = document.getElementById("judge0-site-content");
    siteContent.style.height = `${window.innerHeight}px`;
    siteContent.style.paddingTop = `${navigationHeight}px`;
}

function refreshLayoutSize() {
    refreshSiteContentHeight();
    layout.updateSize();
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
    $("#select-language").dropdown();
    $("[data-content]").popup({
        lastResort: "left center"
    });

    refreshSiteContentHeight();

    console.log("Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!");

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        let skipSetDefaultSourceCodeName = (data && data.skipSetDefaultSourceCodeName) || !!gPuterFile;
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
    });

    await loadLangauges();

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    $runBtn.click(run);

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                openFile(e.target.result, selectedFile.name);
            };

            reader.onerror = function (e) {
                showError("Error", "Error reading file: " + e.target.error);
            };

            reader.readAsText(selectedFile);
        }
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case "Enter": // Ctrl+Enter, Cmd+Enter
                    e.preventDefault();
                    run();
                    break;
                case "s": // Ctrl+S, Cmd+S
                    e.preventDefault();
                    save();
                    break;
                case "o": // Ctrl+O, Cmd+O
                    e.preventDefault();
                    open();
                    break;
                case "+": // Ctrl+Plus
                case "=": // Some layouts use '=' for '+'
                    e.preventDefault();
                    fontSize += 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "-": // Ctrl+Minus
                    e.preventDefault();
                    fontSize -= 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "0": // Ctrl+0
                    e.preventDefault();
                    fontSize = 13;
                    setFontSizeForAllEditors(fontSize);
                    break;
            }
        }
    });

    require(["vs/editor/editor.main"], function (ignorable) {
        try {
            layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

            layout.registerComponent("source", function (container, state) {
                sourceEditor = monaco.editor.create(container.getElement()[0], {
                    automaticLayout: true,
                    scrollBeyondLastLine: true,
                    readOnly: state.readOnly,
                    language: "cpp",
                    fontFamily: "JetBrains Mono",
                    minimap: {
                        enabled: true
                    },
                    quickSuggestions: true,
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on"
                });

                sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);

                // Add floating chat button
                const floatingChatBtn = $('<button class="floating-chat-btn">Ask AI</button>');
                container.getElement().append(floatingChatBtn);

                // Handle text selection
                sourceEditor.onDidChangeCursorSelection(e => {
                    const selection = sourceEditor.getSelection();
                    const selectedText = sourceEditor.getModel().getValueInRange(selection);

                    if (selectedText.trim()) {
                        // Get selection coordinates
                        const selectionPos = sourceEditor.getScrolledVisiblePosition(selection.getEndPosition());
                        
                        if (selectionPos) {
                            // Position button near selection but avoid covering code
                            const editorPos = container.getElement().offset();
                            const btnWidth = floatingChatBtn.outerWidth();
                            const btnHeight = floatingChatBtn.outerHeight();
                            
                            // Try to position to the right of selection
                            let left = selectionPos.left + 10;
                            let top = selectionPos.top;

                            // If button would go off screen, position it differently
                            const editorWidth = container.getElement().width();
                            if (left + btnWidth > editorWidth) {
                                left = selectionPos.left - btnWidth - 10;
                            }

                            floatingChatBtn.css({
                                display: 'block',
                                left: left + 'px',
                                top: top + 'px'
                            });
                        }
                    } else {
                        floatingChatBtn.hide();
                    }
                });

                // Handle button click
                floatingChatBtn.on('click', async () => {
                    const selection = sourceEditor.getSelection();
                    const selectedText = sourceEditor.getModel().getValueInRange(selection);
                    
                    if (selectedText.trim()) {
                        // Focus chat input and add context indicator
                        const chatInput = $('.chat-input');
                        chatInput.attr('placeholder', 'Ask about selected code...');
                        chatInput.focus();
                        
                        // Store selected text to use when sending message
                        chatInput.data('selectedCode', selectedText);
                    }
                });

                // Add this after the sourceEditor initialization
                sourceEditor.onDidChangeModelContent((e) => {
                    console.log('Content changed:', e.changes);
                    
                    const model = sourceEditor.getModel();
                    const changes = e.changes;
                    
                    for (const change of changes) {
                        const lineNumber = change.range.startLineNumber;
                        const lineContent = model.getLineContent(lineNumber);
                        console.log('Processing line:', lineNumber, 'Content:', lineContent);
                        console.log('Change text:', change.text);
                        
                        // Only process if this change completed a comment with '//'
                        if (lineContent.trim().endsWith('//')) {
                            console.log('Found potential comment end');
                            // Verify this is a proper comment
                            const trimmedContent = lineContent.trim();
                            console.log('Previous content:', trimmedContent);
                            
                            if (trimmedContent.startsWith('//') && trimmedContent !== '//') {
                                console.log('Valid comment detected');
                                // Remove the trailing // before processing
                                const cleanComment = trimmedContent.slice(2, -2).trim();
                                console.log('Clean comment:', cleanComment);
                                
                                // Use setTimeout to avoid recursive decorations
                                setTimeout(() => {
                                    handleCommentToCode(lineNumber, cleanComment);
                                }, 0);
                            }
                        }
                    }
                });
            });

            layout.registerComponent("stdin", function (container, state) {
                stdinEditor = monaco.editor.create(container.getElement()[0], {
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    readOnly: state.readOnly,
                    language: "plaintext",
                    fontFamily: "JetBrains Mono",
                    minimap: {
                        enabled: false
                    }
                });
            });

            layout.registerComponent("stdout", function (container, state) {
                stdoutEditor = monaco.editor.create(container.getElement()[0], {
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    readOnly: state.readOnly,
                    language: "plaintext",
                    fontFamily: "JetBrains Mono",
                    minimap: {
                        enabled: false
                    }
                });
            });

            layout.registerComponent("chat", function (container, state) {
                const chatElement = $(`
                    <div class="chat-container">
                        <div id="chat-messages" class="chat-messages"></div>
                        <div class="chat-input-area">
                            <input type="text" placeholder="Ask a question..." class="chat-input">
                            <button class="ui primary button chat-send">Send</button>
                        </div>
                    </div>
                `);
                
                const chatMessages = chatElement.find('.chat-messages');
                const chatInput = chatElement.find('.chat-input');
                const sendButton = chatElement.find('.chat-send');

                function parseMarkdown(text) {
                    marked.setOptions({
                        highlight: function(code, language) {
                            if (language && hljs.getLanguage(language)) {
                                return hljs.highlight(code, { language }).value;
                            }
                            return code;
                        },
                        breaks: true,
                        gfm: true,
                        headerIds: false,
                        mangle: false
                    });

                    try {
                        return marked.parse(text);
                    } catch (error) {
                        console.error('Markdown parsing error:', error);
                        return text;
                    }
                }
                // Add message to chat
                // This is the message received from the assistant
                function addMessage(content, isUser = false) {
                    const messageDiv = $(`
                        <div class="message ${isUser ? 'user' : 'assistant'}">
                            ${isUser ? content : parseMarkdown(content)}
                        </div>
                    `);
                    chatMessages.append(messageDiv);
                    chatMessages.scrollTop(chatMessages[0].scrollHeight);

                    // Initialize syntax highlighting for code blocks
                    if (!isUser) {
                        messageDiv.find('pre code').each(function(i, block) {
                            hljs.highlightElement(block);
                        });
                    }
                }

                async function handleSend() {
                    const message = chatInput.val().trim();
                    if (!message) return;

                    // Get selected code if any
                    const selectedCode = sourceEditor.getModel().getValueInRange(sourceEditor.getSelection());

                    // Add user message to chat
                    addMessage(message, true);
                    chatInput.val('');

                    // Add loading indicator
                    const loadingDiv = $(`
                        <div class="loading-message">
                            Generating<span class="loading-dots"></span>
                        </div>
                    `);
                    chatMessages.append(loadingDiv);
                    chatMessages.scrollTop(chatMessages[0].scrollHeight);

                    try {
                        const response = await sendChatMessage(message, selectedCode);
                        loadingDiv.remove();
                        addMessage(response, false);
                    } catch (error) {
                        loadingDiv.remove();
                        addMessage("Sorry, I encountered an error. Please try again.", false);
                    }
                }

                // Event handlers
                sendButton.click(handleSend);
                chatInput.on('keypress', async function(e) {
                    if (e.which === 13) {  // Enter key
                        const message = $(this).val().trim();
                        if (message) {
                            // Get selected code if any
                            const selectedCode = $(this).data('selectedCode');
                            
                            // Add user message to chat
                            $('#chat-messages').append(`
                                <div class="message user">
                                    <div class="content">
                                        <p>${message}</p>
                                        ${selectedCode ? `<pre><code>${selectedCode}</code></pre>` : ''}
                                    </div>
                                </div>
                            `);

                            // Clear input and selection context
                            $(this).val('');
                            $(this).removeData('selectedCode');
                            $(this).attr('placeholder', 'Ask a question...');

                            // Add loading indicator after user message
                            const loadingMessage = $(`
                                <div class="loading-message">
                                    Generating<span class="loading-dots"></span>
                                </div>
                            `);
                            $('#chat-messages').append(loadingMessage);
                            
                            // Scroll to show loading
                            const chatMessages = $('#chat-messages');
                            chatMessages.scrollTop(chatMessages[0].scrollHeight);

                            // Send message with selected code context
                            const response = await sendChatMessage(message, selectedCode);
                            
                            // Remove loading message
                            loadingMessage.remove();
                            
                            // Add AI response to chat
                            const responseElement = $(`
                                <div class="message assistant">
                                    <div class="content">
                                        ${parseMarkdown(response)}
                                    </div>
                                </div>
                            `);
                            $('#chat-messages').append(responseElement);
                            scrollToNewMessage(responseElement);
                        }
                    }
                });
                
                container.getElement().append(chatElement);
            });

            layout.on("initialised", function () {
                console.log("Layout initialized successfully");
                setDefaults();
                refreshLayoutSize();
                window.top.postMessage({ event: "initialised" }, "*");
            });

            layout.on("error", function(err) {
                console.error("Layout initialization error:", err);
            });

            layout.init();
        } catch (error) {
            console.error("Error during layout setup:", error);
        }
    });

    require.config({
        paths: {
            "vs": "./vendor/monaco-editor-0.44.0/min/vs"
        },
        'vs/nls': {
            availableLanguages: {}
        }
    });

    let superKey = "⌘";
    if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
        superKey = "Ctrl";
    }

    [$runBtn].forEach(btn => {
        btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
    });

    document.querySelectorAll(".description").forEach(e => {
        e.innerText = `${superKey}${e.innerText}`;
    });

    if (IS_PUTER) {
        puter.ui.onLaunchedWithItems(async function (items) {
            gPuterFile = items[0];
            openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
        });
    }

    document.getElementById("judge0-open-file-btn").addEventListener("click", openAction);
    document.getElementById("judge0-save-btn").addEventListener("click", saveAction);

    window.onmessage = function (e) {
        if (!e.data) {
            return;
        }

        if (e.data.action === "get") {
            window.top.postMessage(JSON.parse(JSON.stringify({
                event: "getResponse",
                source_code: sourceEditor.getValue(),
                language_id: getSelectedLanguageId(),
                flavor: getSelectedLanguageFlavor(),
                stdin: stdinEditor.getValue(),
                stdout: stdoutEditor.getValue(),
                compiler_options: $compilerOptions.val(),
                command_line_arguments: $commandLineArguments.val()
            })), "*");
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id && e.data.flavor) {
                selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
            }
            if (e.data.stdin) {
                stdinEditor.setValue(e.data.stdin);
            }
            if (e.data.stdout) {
                stdoutEditor.setValue(e.data.stdout);
            }
            if (e.data.compiler_options) {
                $compilerOptions.val(e.data.compiler_options);
            }
            if (e.data.command_line_arguments) {
                $commandLineArguments.val(e.data.command_line_arguments);
            }
            if (e.data.api_key) {
                AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
            }
        }
    };

    // Add API key modal handling
    $(document).ready(function() {
        // Generate model menu items
        const $dropdown = $('#judge0-api-key-btn .menu');
        $dropdown.empty();
        
        // Add API key configuration item
        $dropdown.append(`
            <div class="header">Set API Key</div>
            <div class="item" data-value="api-key">
                <i class="key icon"></i>Configure API Key
            </div>
            <div class="divider"></div>
            <div class="header">Select Model</div>
        `);
        
        // Add model items
        AI_MODELS.forEach(model => {
            $dropdown.append(`
                <div class="item" data-value="${model.id}">
                    <i class="${model.icon} icon"></i>${model.name}
                </div>
            `);
        });

        // Initialize dropdown with current model
        const currentModel = getSelectedModel();
        console.log('Initial model:', currentModel);

        // Initialize dropdown
        $('#judge0-api-key-btn.ui.dropdown').dropdown({
            onChange: function(value) {
                console.log('Dropdown value changed to:', value);
                if (value === 'api-key') {
                    $('#judge0-api-key-modal').modal('show');
                } else {
                    setSelectedModel(value);
                    console.log('Model updated in storage:', getSelectedModel());
                }
            }
        });

        // Set initial selected model
        $('#judge0-api-key-btn.ui.dropdown').dropdown('set selected', currentModel);
        console.log('Dropdown initialized with:', currentModel);
    });

    // Add this where the modal is initialized
    $('#judge0-api-key-modal').modal({
        onApprove: function() {
            const key = $('#judge0-api-key-input').val().trim();
            console.log('Saving API key:', key ? 'Key provided' : 'No key provided');
            if (key) {
                setStoredApiKey(key);
                console.log('API key saved to localStorage');
                return true;
            }
            console.log('No API key provided');
            return false;
        }
    });

    // Make sendChatMessage available globally
    window.sendChatMessage = sendChatMessage;
});

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 105; // C++ (GCC 14.1.0) (https://ce.judge0.com/languages/105)

function getEditorLanguageMode(languageName) {
    const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
    const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
        "Bash": "shell",
        "C": "c",
        "C3": "c",
        "C#": "csharp",
        "C++": "cpp",
        "Clojure": "clojure",
        "F#": "fsharp",
        "Go": "go",
        "Java": "java",
        "JavaScript": "javascript",
        "Kotlin": "kotlin",
        "Objective-C": "objective-c",
        "Pascal": "pascal",
        "Perl": "perl",
        "PHP": "php",
        "Python": "python",
        "R": "r",
        "Ruby": "ruby",
        "SQL": "sql",
        "Swift": "swift",
        "TypeScript": "typescript",
        "Visual Basic": "vb"
    }

    for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
        if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
            return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
        }
    }
    return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
    "asm": { "flavor": CE, "language_id": 45 }, // Assembly (NASM 2.14.02)
    "c": { "flavor": CE, "language_id": 103 }, // C (GCC 14.1.0)
    "cpp": { "flavor": CE, "language_id": 105 }, // C++ (GCC 14.1.0)
    "cs": { "flavor": EXTRA_CE, "language_id": 29 }, // C# (.NET Core SDK 7.0.400)
    "go": { "flavor": CE, "language_id": 95 }, // Go (1.18.5)
    "java": { "flavor": CE, "language_id": 91 }, // Java (JDK 17.0.6)
    "js": { "flavor": CE, "language_id": 102 }, // JavaScript (Node.js 22.08.0)
    "lua": { "flavor": CE, "language_id": 64 }, // Lua (5.3.5)
    "pas": { "flavor": CE, "language_id": 67 }, // Pascal (FPC 3.0.4)
    "php": { "flavor": CE, "language_id": 98 }, // PHP (8.3.11)
    "py": { "flavor": EXTRA_CE, "language_id": 25 }, // Python for ML (3.11.2)
    "r": { "flavor": CE, "language_id": 99 }, // R (4.4.1)
    "rb": { "flavor": CE, "language_id": 72 }, // Ruby (2.7.0)
    "rs": { "flavor": CE, "language_id": 73 }, // Rust (1.40.0)
    "scala": { "flavor": CE, "language_id": 81 }, // Scala (2.13.2)
    "sh": { "flavor": CE, "language_id": 46 }, // Bash (5.0.0)
    "swift": { "flavor": CE, "language_id": 83 }, // Swift (5.2.3)
    "ts": { "flavor": CE, "language_id": 101 }, // TypeScript (5.6.2)
    "txt": { "flavor": CE, "language_id": 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
    return EXTENSIONS_TABLE[extension] || { "flavor": CE, "language_id": 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}

async function sendChatMessage(message, selectedCode = null) {
    const apiKey = getStoredApiKey();
    console.log('Retrieved API key from storage:', apiKey ? 'Key exists' : 'No key found');
    
    if (!apiKey) {
        $('#judge0-api-key-modal').modal('show');
        throw new Error("Please set your OpenRouter API key");
    }

    const selectedModel = getSelectedModel();
    console.log('Using model for chat:', selectedModel);

    // Get entire source code if nothing is selected
    const codeToAnalyze = selectedCode || sourceEditor.getValue();

    try {
        // Replace proxy server call with direct OpenRouter API call
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin, // Required by OpenRouter
                "X-Title": "Judge0 IDE", // Required by OpenRouter
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{
                    role: "system",
                    content: `You are an AI programming assistant powered by ${selectedModel}. When asked about your identity, make sure to accurately state this.`
                }, {
                    role: "user",
                    content: codeToAnalyze ? 
                        `Code:\n${codeToAnalyze}\n\nQuestion: ${message}` : 
                        message
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Chat API Error:', errorData);
            throw new Error(errorData);
        }

        const data = await response.json();
        console.log('Response received from model:', selectedModel);
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Chat API Error:', error);
        return "Sorry, I encountered an error processing your request.";
    }
}

async function getAISuggestion(code, errorMessage) {
    try {
        const apiKey = getStoredApiKey();
        if (!apiKey) {
            $('#judge0-api-key-modal').modal('show');
            throw new Error("Please set your OpenRouter API key");
        }

        const selectedModel = getSelectedModel();
        const prompt = `As a programming assistant powered by ${selectedModel}, analyze this code and error:

Code:
${code}

Error:
${errorMessage}

Please provide a response in this format:
### Suggestion
1. **Error Location**: Line X - brief description
2. **Incorrect Line**: 
\`\`\`cpp
<just the code, no line numbers>
\`\`\`

3. **Corrected Line**: 
\`\`\`cpp
<just the code, no line numbers>
\`\`\`

4. **Explanation**: Brief explanation of the fix

Format your response exactly as shown above.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Judge0 IDE",
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{
                    role: "system",
                    content: "You are an AI programming assistant. Analyze code errors and provide specific fixes."
                }, {
                    role: "user",
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('AI Suggestion API Error:', errorData);
            throw new Error(errorData);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error getting AI suggestion:", error);
        return "Unable to get AI suggestion at this time.";
    }
}

// Helper function to scroll to the top of a new message
function scrollToNewMessage(messageElement) {
    const chatMessages = $('#chat-messages');
    const messageTop = messageElement.position().top;
    chatMessages.scrollTop(messageTop); // 20px padding from top
}

async function handleCompileError(response) {
    console.log('Handling compile error:', response);
    let stderr = decode(response.compile_output || "");
    console.log('Decoded error:', stderr);
    
    // Update the output
    stdoutEditor.setValue(`Compilation Error:\n${stderr}`);
    
    // Reset the status line and run button
    $statusLine.html("Compilation Error");
    $runBtn.removeClass("disabled");
    
    // Append "Suggesting fix..." message
    const loadingMessage = $(`
        <div class="message assistant">
            <div class="content">
                <p><em>Suggesting fix...</em></p>
            </div>
        </div>
    `);
    $('#chat-messages').append(loadingMessage);
    scrollToNewMessage(loadingMessage);
    
    try {
        const suggestion = await getAISuggestion(sourceEditor.getValue(), stderr);
        // Remove loading message
        loadingMessage.remove();
        
        const responseElement = $(`
            <div class="message assistant">
                <div class="content">
                    ${parseMarkdown(suggestion)}
                </div>
            </div>
        `);
        $('#chat-messages').append(responseElement);
        scrollToNewMessage(responseElement);

        const parsedSuggestion = parseSuggestion(suggestion);
        if (!parsedSuggestion) {
            console.error('Could not parse suggestion:', suggestion);
            throw new Error('Could not understand the AI suggestion format');
        }

        const { lineNumber, incorrectLine, correctedLine } = parsedSuggestion;
        console.log('Creating suggestion for line', lineNumber);
        
        // Create inline suggestion
        createInlineSuggestionWidget(incorrectLine, correctedLine, lineNumber);
    } catch (error) {
        // Remove loading message
        loadingMessage.remove();
        
        const errorElement = $(`
            <div class="message assistant">
                <div class="content">
                    <p>Error: ${error.message}</p>
                    <p>Please try running the code again or rephrase your question.</p>
                </div>
            </div>
        `);
        $('#chat-messages').append(errorElement);
        scrollToNewMessage(errorElement);
    }
}

function createInlineSuggestionWidget(incorrectLine, correctedLine, lineNumber) {
    const model = sourceEditor.getModel();
    const indentation = model.getLineContent(lineNumber).match(/^\s*/)[0];
    
    // Get total line count to prevent going beyond file boundaries
    const totalLines = model.getLineCount();
    
    // Create decorations for the error line
    const errorDecoration = {
        range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
        options: {
            isWholeLine: true,
            linesDecorationsClassName: 'line-decoration-error',
            inlineClassName: null,
            marginClassName: 'margin-decoration-error',
            minimap: {
                color: '#ff0000',
                position: 2
            }
        }
    };

    // Insert suggestion as a new line after the error line
    const insertRange = new monaco.Range(
        lineNumber + 1, 1,
        lineNumber + 1, 1
    );
    sourceEditor.executeEdits('suggestion', [{
        range: insertRange,
        text: indentation + correctedLine + '\n'
    }]);

    // Create decoration for the suggestion line
    const suggestionDecoration = {
        range: new monaco.Range(lineNumber + 1, 1, lineNumber + 1, model.getLineMaxColumn(lineNumber + 1)),
        options: {
            isWholeLine: true,
            linesDecorationsClassName: 'line-decoration-suggestion',
            inlineClassName: null,
            marginClassName: 'margin-decoration-suggestion',
            minimap: {
                color: '#00ff00',
                position: 2
            },
            after: {
                content: '[Accept] [Reject]',
                inlineClassName: 'suggestion-buttons',
                margin: '0 0 0 1em'
            }
        }
    };

    // Apply both decorations
    const decorationIds = sourceEditor.deltaDecorations([], [errorDecoration, suggestionDecoration]);

    // Handle button clicks
    sourceEditor.onMouseDown((e) => {
        const element = e.target.element;
        if (!element?.classList.contains('suggestion-buttons')) return;
        
        const text = element.textContent;
        const rect = element.getBoundingClientRect();
        const relativeX = e.event.browserEvent.clientX - rect.left;
        const isAcceptClick = relativeX < rect.width / 2;

        if (isAcceptClick) {
            // Accept code - replace only the error line
            sourceEditor.executeEdits('suggestion', [{
                range: new monaco.Range(
                    lineNumber,
                    1,
                    lineNumber,
                    model.getLineMaxColumn(lineNumber)
                ),
                text: indentation + correctedLine
            }]);
            // Remove the suggestion line in a separate edit
            sourceEditor.executeEdits('suggestion', [{
                range: new monaco.Range(
                    lineNumber + 1,
                    1,
                    lineNumber + 2,
                    1
                ),
                text: ''
            }]);
        } else {
            // Reject - only remove the suggestion line
            sourceEditor.executeEdits('suggestion', [{
                range: new monaco.Range(
                    lineNumber + 1,
                    1,
                    lineNumber + 2,
                    1
                ),
                text: ''
            }]);
        }
        
        // Remove decorations
        sourceEditor.deltaDecorations(decorationIds, []);
    });
}

function parseSuggestion(suggestion) {
    console.log('Parsing suggestion:', suggestion);
    try {
        const lines = suggestion.split('\n');
        let lineNumber, incorrectLine, correctedLine;
        let foundIncorrectLine = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            console.log('Processing line:', line);

            // Extract line number
            if (line.includes('Error Location')) {
                // Look for "Line X" or "line X" pattern
                const match = line.match(/[Ll]ine\s+(\d+)/);
                if (match) {
                    lineNumber = parseInt(match[1]);
                    console.log('Found line number:', lineNumber);
                }
            }
            
            // Extract incorrect line
            if (line.includes('```cpp') && !foundIncorrectLine) {
                if (i + 1 < lines.length) {
                    // Remove line number prefix if present (e.g., "7 | ")
                    const codeLine = lines[i + 1].trim();
                    incorrectLine = codeLine.replace(/^\d+\s*\|\s*/, '').trim();
                    console.log('Found incorrect line:', incorrectLine);
                    foundIncorrectLine = true;
                }
            }
            
            // Extract corrected line
            else if (line.includes('```cpp') && foundIncorrectLine) {
                if (i + 1 < lines.length) {
                    // Remove line number prefix if present
                    const codeLine = lines[i + 1].trim();
                    correctedLine = codeLine.replace(/^\d+\s*\|\s*/, '').trim();
                    console.log('Found corrected line:', correctedLine);
                }
            }
        }

        if (lineNumber && incorrectLine && correctedLine) {
            const result = { lineNumber, incorrectLine, correctedLine };
            console.log('Parsed suggestion data:', result);
            return result;
        }
        
        console.log('Missing required data:', { lineNumber, incorrectLine, correctedLine });
        return null;
    } catch (error) {
        console.error('Error parsing suggestion:', error);
        return null;
    }
}

// Make parseMarkdown available globally
function parseMarkdown(text) {
    marked.setOptions({
        highlight: function(code, language) {
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(code, { language }).value;
            }
            return code;
        },
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });

    try {
        return marked.parse(text);
    } catch (error) {
        console.error('Markdown parsing error:', error);
        return text;
    }
}

// Add language update handler
function updateEditorLanguage(languageName) {
    const editorMode = getEditorLanguageMode(languageName);
    sourceEditor.updateOptions({ language: editorMode });
    updateLanguage(editorMode);
}

// Function to handle converting comment to code
async function handleCommentToCode(lineNumber, commentLine) {
    try {
        const apiKey = getStoredApiKey();
        if (!apiKey) {
            $('#judge0-api-key-modal').modal('show');
            throw new Error("Please set your OpenRouter API key");
        }

        const model = sourceEditor.getModel();
        const language = model.getLanguageId();
        const selectedModel = getSelectedModel();
        
        const prompt = `Convert this comment to code in ${language}:
Comment: ${commentLine}

The code should implement what the comment describes using proper formatting.
Look at the entire code, reuse existing functions, imports, and definitions instead of redefining them.
Do not modify or repeat the main entry point (main, def main(), public static void main, etc.). Only modify it if necessary to integrate new functionality.
Use multiple lines and proper indentation when it improves readability.
Only return the code, no explanation.
Do not use markdown formatting or code blocks.
Return only the exact code that should be inserted.

Consider the language syntax and common patterns.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Judge0 IDE",
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{
                    role: "system",
                    content: `You are a code generation assistant. Generate clean, efficient ${language} code.`
                }, {
                    role: "user",
                    content: prompt
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Comment to Code API Error:', errorData);
            throw new Error(errorData);
        }

        const data = await response.json();
        const generatedCode = data.choices[0].message.content
            .replace(/```\w*\n?/g, '')
            .replace(/\n+/g, '\n')
            .trim();
        console.log('Cleaned generated code:', generatedCode);
        
        const nextLineNumber = lineNumber + 1;
        const currentLineContent = model.getLineContent(lineNumber);
        const indentation = currentLineContent.match(/^\s*/)[0];
        
        // If this is inside a block (like if, for, while), add additional indentation
        const isInsideBlock = currentLineContent.trim().startsWith('//') && 
            model.getLineContent(lineNumber - 1).trim().endsWith('{');
        const baseIndentation = isInsideBlock ? indentation + '    ' : indentation;
        
        // Handle multi-line code with proper indentation
        const lines = generatedCode.split('\n');
        const formattedCode = lines.map((line, index) => {
            // Determine proper indentation for each line
            let lineIndentation = baseIndentation;
            
            // Add extra indentation for block content
            if (index > 0) {
                const isBlockContent = lines[0].includes('{');
                const isClosingBrace = line.trim() === '}';
                
                if (isBlockContent && !isClosingBrace) {
                    lineIndentation += '    ';  // Indent block content
                }
            }
            
            return lineIndentation + line;
        }).join('\n');
        
        console.log('Inserting at line:', nextLineNumber, 'with formatted code');
        
        sourceEditor.executeEdits('comment-to-code', [{
            range: new monaco.Range(
                nextLineNumber,
                1,
                nextLineNumber,
                1
            ),
            text: formattedCode + '\n'
        }]);
        console.log('Code inserted successfully');
    } catch (error) {
        console.error('Error in handleCommentToCode:', error);
    }
    return apiKey;
}
