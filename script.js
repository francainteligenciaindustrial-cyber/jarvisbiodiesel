// SCHUNKE.IA Interface JavaScript
//
// Voice architecture:
//   1. A native browser SpeechRecognition instance runs continuously in the
//      background, listening only for the wake word ("Schunke"). This never
//      talks to ElevenLabs — it's just local, free wake-word spotting.
//   2. When the wake word is heard, that listener stops (releasing the mic)
//      and we start a REAL ElevenLabs conversation using the official
//      @elevenlabs/client SDK (Conversation.startSession). This is a
//      documented, code-controllable API — unlike the <elevenlabs-convai>
//      widget we used before, which did not reliably expose a JS API to
//      trigger on this build.
//   3. When that conversation ends, we go back to step 1 automatically.
//
// This is why script.js is loaded as a module (see index.html) — it needs
// to `import` the SDK from a CDN.

import { Conversation } from "https://cdn.jsdelivr.net/npm/@elevenlabs/client/+esm";

const SCHUNKE_AGENT_ID = "agent_5601kxpwvjzhfzqa2dakf1h64bn5";

// Phonetic variants to catch, since browser speech-to-text may transcribe
// "Schunke" in a few different ways depending on accent/mic quality.
const WAKE_WORDS = ["schunke", "chunke", "shunke", "xunke", "chunk", "chunque"];

class SchunkeInterface {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.voiceButton = document.getElementById('voiceButton');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.voiceIndicator = document.getElementById('voiceIndicator');

        this.wakeWordRecognition = null;
        this.isWakeListening = false;
        this._pendingStartConversation = false;

        this.conversation = null;
        this.isConversationActive = false;

        this.initializeInterface();
        this.setupEventListeners();
        this.initializeWakeWordListener();
        this.startSystemAnimations();
    }

    initializeInterface() {
        this.addTypingIndicator();
        this.initializeHUDAnimations();
        this.startDynamicUpdates();
    }

    setupEventListeners() {
        // Manual click also works, in case someone doesn't want to rely on
        // the wake word (or is in a noisy environment).
        this.voiceButton.addEventListener('click', () => {
            if (this.isConversationActive) {
                this.endConversation();
            } else if (this.isWakeListening) {
                this._pendingStartConversation = true;
                this.wakeWordRecognition.stop();
            } else {
                this.startConversation();
            }
        });
    }

    // ---------- Always-on wake-word listening ----------

    initializeWakeWordListener() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            this.updateVoiceStatus('VOZ NÃO SUPORTADA NESTE NAVEGADOR');
            this.addSystemMessage('[ERROR] Este navegador não suporta reconhecimento de voz. Use o botão para falar com a SCHUNKE.IA.');
            return;
        }

        this.wakeWordRecognition = new SpeechRecognition();
        this.wakeWordRecognition.continuous = true;
        this.wakeWordRecognition.interimResults = true;
        this.wakeWordRecognition.lang = 'pt-BR';

        this.wakeWordRecognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.toLowerCase();

            if (this.containsWakeWord(transcript)) {
                this.addSystemMessage(`[WAKE] Palavra de ativação detectada`);
                // Stop wake-word listening first so it releases the
                // microphone cleanly before the real conversation grabs it
                // (see onend below, which actually starts the conversation).
                this._pendingStartConversation = true;
                this.wakeWordRecognition.stop();
            }
        };

        this.wakeWordRecognition.onerror = (event) => {
            // 'no-speech' and 'aborted' fire constantly in always-on mode —
            // that's expected, not a real error.
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                console.warn('Wake-word listener error:', event.error);
            }
        };

        this.wakeWordRecognition.onend = () => {
            this.isWakeListening = false;
            this.voiceIndicator.classList.remove('active');

            if (this._pendingStartConversation) {
                this._pendingStartConversation = false;
                this.startConversation();
            } else if (!this.isConversationActive) {
                // Browsers auto-stop recognition after a period of silence —
                // restart it so it's effectively "always listening".
                setTimeout(() => this.startWakeWordListening(), 300);
            }
        };

        this.startWakeWordListening();
    }

    startWakeWordListening() {
        if (!this.wakeWordRecognition || this.isWakeListening || this.isConversationActive) {
            return;
        }
        try {
            this.wakeWordRecognition.start();
            this.isWakeListening = true;
            this.voiceButton.className = 'voice-button';
            this.updateVoiceStatus('OUVINDO "SCHUNKE"...');
        } catch (error) {
            // start() throws if called while already running — safe to ignore.
        }
    }

    containsWakeWord(transcript) {
        return WAKE_WORDS.some(word => transcript.includes(word));
    }

    // ---------- Real ElevenLabs conversation ----------

    async startConversation() {
        if (this.isConversationActive) return;

        try {
            this.updateVoiceStatus('CONECTANDO...');
            this.voiceButton.className = 'voice-button processing';

            this.conversation = await Conversation.startSession({
                agentId: SCHUNKE_AGENT_ID,

                onConnect: () => {
                    this.isConversationActive = true;
                    this.voiceButton.className = 'voice-button listening';
                    this.voiceIndicator.classList.add('active');
                    this.updateVoiceStatus('CONVERSA ATIVA — DIGA "ENCERRAR" OU CLIQUE PRA SAIR');
                    this.addSystemMessage('[AUDIO] CONVERSA INICIADA COM SCHUNKE.IA');
                },

                onDisconnect: () => {
                    this.isConversationActive = false;
                    this.conversation = null;
                    this.voiceButton.className = 'voice-button';
                    this.voiceIndicator.classList.remove('active');
                    this.addSystemMessage('[AUDIO] CONVERSA ENCERRADA');
                    this.startWakeWordListening();
                },

                onMessage: (message) => {
                    if (message.source === 'user') {
                        this.addUserMessage(message.message);
                    } else {
                        this.addSchunkeMessage(message.message);
                    }
                },

                onError: (error) => {
                    console.error('ElevenLabs conversation error:', error);
                    this.addSystemMessage('[ERROR] FALHA NA CONVERSA COM SCHUNKE.IA');
                    this.isConversationActive = false;
                    this.conversation = null;
                    this.voiceButton.className = 'voice-button';
                    this.startWakeWordListening();
                },
            });
        } catch (error) {
            console.error('Failed to start conversation:', error);
            this.updateVoiceStatus('[ERROR] FALHA AO CONECTAR');
            this.addSystemMessage('[ERROR] NÃO FOI POSSÍVEL CONECTAR À SCHUNKE.IA');
            this.voiceButton.className = 'voice-button';
            this.startWakeWordListening();
        }
    }

    async endConversation() {
        if (this.conversation) {
            try {
                await this.conversation.endSession();
            } catch (error) {
                console.error('Error ending conversation:', error);
            }
            this.conversation = null;
        }
    }

    updateVoiceStatus(text) {
        const statusText = this.voiceStatus.querySelector('.status-text');
        statusText.textContent = text;
    }

    // ---------- Chat log rendering ----------

    addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>[USER] ${this.escapeHtml(message)}</p>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    addSchunkeMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message schunke-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>[SCHUNKE.IA] ${this.escapeHtml(message)}</p>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    addSystemMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${this.escapeHtml(message)}</p>
                <span class="message-time">${this.getCurrentTime()}</span>
            </div>
        `;
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.className = 'message schunke-message typing-indicator';
        typingElement.id = 'typingIndicator';
        typingElement.innerHTML = `
            <div class="message-avatar">
                <div class="avatar-ring"></div>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(typingElement);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    addTypingIndicator() {
        const style = document.createElement('style');
        style.textContent = `
            .typing-dots {
                display: flex;
                gap: 4px;
                align-items: center;
            }

            .typing-dots span {
                width: 8px;
                height: 8px;
                background: var(--hud-blue);
                border-radius: 50%;
                animation: typingPulse 1.4s infinite ease-in-out;
            }

            .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

            @keyframes typingPulse {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- Ambient HUD animations (unrelated to voice) ----------

    startSystemAnimations() {
        this.createFloatingParticles();
        this.animateStatusDots();
    }

    initializeHUDAnimations() {
        this.animateLoadingBars();
        this.animateChartBars();
        this.animateDataDisplays();
    }

    startDynamicUpdates() {
        setInterval(() => {
            this.updateLoadingProgress();
        }, 2000);

        setInterval(() => {
            this.updateChartData();
        }, 3000);

        setInterval(() => {
            this.addLogEntry();
        }, 5000);
    }

    animateLoadingBars() {
        const progressBars = document.querySelectorAll('.loading-progress');
        progressBars.forEach((bar) => {
            const currentWidth = parseInt(bar.style.width);
            const targetWidth = Math.floor(Math.random() * 30) + 70; // 70-100%

            let width = currentWidth;
            const interval = setInterval(() => {
                if (width < targetWidth) {
                    width += 2;
                    bar.style.width = width + '%';
                } else {
                    clearInterval(interval);
                }
            }, 100);
        });
    }

    animateChartBars() {
        const bars = document.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            setInterval(() => {
                const newHeight = Math.floor(Math.random() * 40) + 50; // 50-90%
                bar.style.height = newHeight + '%';
            }, 2000 + (index * 500));
        });
    }

    animateDataDisplays() {
        const circles = document.querySelectorAll('.display-circle .circle-label');

        setInterval(() => {
            circles.forEach((circle) => {
                if (Math.random() > 0.7) {
                    circle.textContent = Math.floor(Math.random() * 100).toString();
                }
            });
        }, 3000);
    }

    updateLoadingProgress() {
        const progressBars = document.querySelectorAll('.loading-progress');
        progressBars.forEach(bar => {
            const currentWidth = parseInt(bar.style.width);
            const change = (Math.random() - 0.5) * 10; // -5 to +5
            const newWidth = Math.max(20, Math.min(100, currentWidth + change));
            bar.style.width = newWidth + '%';
        });
    }

    updateChartData() {
        const bars = document.querySelectorAll('.bar');
        const labels = document.querySelectorAll('.chart-labels span');

        bars.forEach((bar, index) => {
            const newHeight = Math.floor(Math.random() * 50) + 30; // 30-80%
            bar.style.height = newHeight + '%';
            if (labels[index]) {
                labels[index].textContent = newHeight;
            }
        });
    }

    addLogEntry() {
        const logContent = document.querySelector('.log-content');
        const logEntries = [
            '[SYSTEM] SCHUNKE.IA INITIALIZED',
            '[AUDIO] WAKE-WORD LISTENER ACTIVE',
            '[NETWORK] ELEVENLABS CONNECTED',
            '[STATUS] ALL SYSTEMS OPERATIONAL',
            '[READY] AWAITING "SCHUNKE"',
            '[SCAN] SYSTEM INTEGRITY CHECK',
            '[AI] NEURAL NETWORK ACTIVE',
            '[SECURITY] ENCRYPTION ENABLED',
            '[MONITOR] REAL-TIME ANALYSIS'
        ];

        const randomEntry = logEntries[Math.floor(Math.random() * logEntries.length)];
        const logLine = document.createElement('div');
        logLine.className = 'log-line';
        logLine.textContent = randomEntry;

        logContent.appendChild(logLine);

        const entries = logContent.querySelectorAll('.log-line');
        if (entries.length > 8) {
            entries[0].remove();
        }
    }

    createFloatingParticles() {
        const container = document.querySelector('.floating-elements');
        if (!container) {
            return;
        }

        setInterval(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 5 + 5) + 's';
            particle.style.animationDelay = Math.random() * 2 + 's';

            container.appendChild(particle);

            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 10000);
        }, 3000);
    }

    animateStatusDots() {
        const statusDots = document.querySelectorAll('.status-dot');
        statusDots.forEach(dot => {
            setInterval(() => {
                dot.style.boxShadow = `0 0 ${Math.random() * 15 + 5}px var(--hud-blue)`;
            }, 2000);
        });
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// n8n Integration Functions
class N8NIntegration {
    constructor() {
        this.webhookUrl = ''; // Set your n8n webhook URL here
        this.apiKey = ''; // Set your n8n API key here
    }

    async sendToN8N(message, context = {}) {
        if (!this.webhookUrl) {
            console.warn('n8n webhook URL not configured');
            return null;
        }

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : ''
                },
                body: JSON.stringify({
                    message: message,
                    timestamp: new Date().toISOString(),
                    context: context
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending to n8n:', error);
            return null;
        }
    }

    async getN8NResponse(message) {
        const result = await this.sendToN8N(message);
        return result ? result.response : null;
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const schunke = new SchunkeInterface();
    const n8n = new N8NIntegration();

    window.schunkeInterface = schunke;
    window.n8nIntegration = n8n;
});

// Keyboard shortcut: Escape ends an active conversation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && window.schunkeInterface && window.schunkeInterface.isConversationActive) {
        window.schunkeInterface.endConversation();
    }
});
