# SCHUNKE.IA AI Assistant Interface

A futuristic, Iron Man-inspired frontend interface for your n8n AI assistant. This interface provides a clean, techy look with interactive chat functionality and system monitoring capabilities.

## Features

- **Futuristic Design**: Blue/cyan color scheme with glowing effects and animations
- **Interactive Chat**: Real-time messaging interface with typing indicators
- **Voice Recognition**: Double-click the input field to activate voice input
- **System Monitoring**: Real-time CPU, memory, and network status
- **Quick Actions**: Weather, calendar, tasks, and settings shortcuts
- **Activity Log**: Recent system activities and user interactions
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **n8n Integration**: Ready-to-use webhook integration for your n8n workflows

## Setup Instructions

### 1. Basic Setup
1. Open `index.html` in your web browser
2. The interface will load with a welcome message from SCHUNKE.IA
3. Start chatting by typing in the input field or using voice recognition

### 2. n8n Integration
To connect with your n8n workflows:

1. **Set up a webhook in n8n**:
   - Create a new workflow in n8n
   - Add a "Webhook" node
   - Copy the webhook URL

2. **Configure the interface**:
   - Open `script.js`
   - Find the `N8NIntegration` class
   - Set your webhook URL:
     ```javascript
     this.webhookUrl = 'https://your-n8n-instance.com/webhook/your-webhook-id';
     ```
   - Optionally set an API key if required:
     ```javascript
     this.apiKey = 'your-api-key';
     ```

3. **Test the connection**:
   - Send a message in the chat interface
   - Check your n8n workflow to see if the webhook is triggered

### 3. Customization

#### Colors and Styling
Edit `styles.css` to customize the appearance:
- Change color variables in the `:root` section
- Modify animations and effects
- Adjust layout and spacing

#### Chat Responses
Edit the `generateSchunkeResponse()` function in `script.js` to customize SCHUNKE.IA's responses or integrate with your AI model.

#### Quick Actions
Modify the `handleQuickAction()` function to connect with your specific services and APIs.

## Usage

### Chat Interface
- Type messages in the input field and press Enter or click Send
- Double-click the input field to activate voice recognition
- Use keyboard shortcuts:
  - `Ctrl/Cmd + K`: Focus input field
  - `Escape`: Clear input field

### Quick Actions
Click any of the quick action buttons to trigger specific functions:
- **Weather**: Get weather information
- **Calendar**: Access calendar management
- **Tasks**: Open task organization
- **Settings**: Access system settings

### System Monitoring
The control panel shows real-time system status:
- CPU usage percentage
- Memory usage percentage
- Network connectivity status

## Browser Compatibility

- Chrome/Chromium (recommended for voice recognition)
- Firefox
- Safari
- Edge

**Note**: Voice recognition requires a modern browser with Web Speech API support.

## File Structure

```
schunke-ia/
├── index.html          # Main HTML structure
├── styles.css          # Futuristic styling and animations
├── script.js           # Interactive functionality and n8n integration
└── README.md           # This file
```

## Customization Examples

### Adding New Quick Actions
```javascript
// In script.js, add to the actions object in handleQuickAction()
newAction: () => {
    this.addSystemMessage('Executing new action...');
    // Your custom logic here
}
```

### Modifying SCHUNKE.IA Responses
```javascript
// In script.js, add to the responses object in generateSchunkeResponse()
customTopic: [
    "Custom response 1",
    "Custom response 2",
    "Custom response 3"
]
```

### Changing Colors
```css
/* In styles.css, modify the :root variables */
:root {
    --hud-blue: #your-color;
    --hud-cyan: #your-color;
    /* ... other colors */
}
```

## Troubleshooting

### Voice Recognition Not Working
- Ensure you're using a supported browser (Chrome recommended)
- Check microphone permissions
- Try refreshing the page
- **Microphone access requires a secure context** (HTTPS, or `http://localhost`).
  Opening `index.html` directly by double-clicking it (`file://...`) can silently
  block mic permissions in some browsers. Serve the folder locally instead, e.g.:
  ```
  python3 -m http.server 8000
  ```
  then open `http://localhost:8000` in your browser.

### SCHUNKE.IA voice button doesn't start a conversation
The center voice button controls the real ElevenLabs widget (hidden with
`display: none` and driven via `widget.startConversation()` /
`widget.endConversation()` in `script.js`). If it stops working after an
edit, check that:
- The `<elevenlabs-convai>` tag in `index.html` still has `id="schunkeWidget"`
- The ElevenLabs script tag (`unpkg.com/@elevenlabs/convai-widget-embed`) is
  loading successfully (check the Network tab)
- Your agent is public with authentication disabled (required for the
  embedded widget) — see ElevenLabs' widget docs if you need signed-URL auth

### n8n Integration Issues
- Verify your webhook URL is correct
- Check n8n workflow is active
- Ensure CORS is properly configured if needed

### Styling Issues
- Clear browser cache
- Check for CSS syntax errors
- Verify all files are in the same directory

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the SCHUNKE.IA interface!
