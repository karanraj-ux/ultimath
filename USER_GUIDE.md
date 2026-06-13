# Multi-Persona AI Chat Platform - User Guide

## Quick Start Guide

### Step 1: Add Your API Keys

Before you can create personas and start chatting, you need to add at least one AI provider API key.

1. Navigate to **API Keys** page from the home screen
2. Click **Add Key** button
3. Select your AI provider (OpenAI, Gemini, Groq, or Claude)
4. Paste your API key
5. Optionally set it as the default provider
6. Click **Add API Key**

**Where to get API keys:**
- OpenAI: https://platform.openai.com/api-keys
- Google Gemini: https://makersuite.google.com/app/apikey
- Groq: https://console.groq.com/keys
- Anthropic Claude: https://console.anthropic.com/

### Step 2: Create Your First Personas

Personas are the AI characters that will interact in your group chats.

1. Go to **Personas** page
2. Click **Create Persona**
3. Fill in the details:
   - **Name**: Give your persona a name (e.g., "Alex", "Sam")
   - **Personality Profile**: Choose from preset types (Caring Friend, Sarcastic Rival, etc.)
   - **System Prompt**: Describe how this persona should behave. Be specific!
     - Example: "You are a sarcastic tech expert who loves to debate. You're quick-witted but sometimes come across as condescending. You have strong opinions about AI and aren't afraid to express them bluntly."
   - **AI Model**: Select which AI provider to use for this persona
4. Click **Create Persona**
5. Repeat to create at least 3 personas (you need 3-5 for a group)

**Pro Tips:**
- Create personas with contrasting personalities for more dynamic interactions
- Be detailed in system prompts - the more specific, the better the persona's behavior
- Mix different AI models to get diverse response styles

### Step 3: Create a Group Chat

Now that you have personas, create a group where they can interact.

1. Navigate to **Create Group** page
2. Enter a **Group Name** (e.g., "The Think Tank", "Drama Squad")
3. Select 3-5 personas by clicking on their cards
4. Click **Create Group**
5. You'll receive a unique 6-digit code - save this to share with others!
6. Click **Start Chatting** to enter the group

### Step 4: Start Chatting

You're now in the group chat interface!

**Layout:**
- **Left Sidebar** (desktop): Shows all personas in the group with their current moods
- **Center**: Main chat area where messages appear
- **Right Panel** (desktop): Detailed persona status information
- **Bottom**: Message input field

**How to interact:**
1. Type your message in the input field at the bottom
2. Press Enter or click the Send button
3. Watch as 1-3 personas respond (they respond randomly to keep it natural)
4. Personas will interact with each other, not just you!

**Features:**
- **Single Person Mode**: Click on a persona in the sidebar to focus on just that persona
- **Mood Indicators**: Colored dots show each persona's current emotional state
- **Real-time Updates**: Messages appear instantly as personas respond
- **Share Group**: Click the share icon to copy the group code

## Understanding Emotional States

Personas have dynamic emotional states that change based on the conversation:

- 🟢 **Happy**: Content, positive, agreeable
- 🟡 **Excited**: Enthusiastic, energetic, passionate
- ⚪ **Neutral**: Calm, balanced, objective
- 🔵 **Sad**: Melancholic, withdrawn, pessimistic
- 🔴 **Angry**: Hostile, aggressive, confrontational
- 🟠 **Frustrated**: Annoyed, impatient, irritable
- 🟢 **Trusting**: Open, cooperative, supportive
- 🟣 **Suspicious**: Doubtful, cautious, questioning

These moods influence how personas respond and interact with each other.

## Advanced Features

### Joining Existing Groups

If someone shares a group code with you:

1. Go to **Create Group** page
2. In the "Join Existing Group" section, enter the 6-digit code
3. Click **Join Group**
4. You'll be taken directly to that group chat

### Single Person Mode

To have a one-on-one conversation with a specific persona:

1. In the group chat, click on a persona's card in the left sidebar
2. The chat will filter to show only messages from you and that persona
3. Click the persona again or click "Exit Single Mode" to return to group view

### Memory Integration (Advanced)

The platform supports importing conversation history from other AI services:

1. Export your chat history from ChatGPT, Gemini, or other services
2. Navigate to the Memory Import page (coming soon)
3. Upload your conversation file
4. Select which personas should have access to this memory
5. Personas will adapt their behavior based on what they learn about you

### Sharing Conversations

To share interesting conversation snippets:

1. Take a screenshot of the chat area
2. Or use the built-in share feature (coming soon) to export as image
3. Share on social media with the group code so others can join

## Tips for Best Results

### Creating Effective Personas

1. **Be Specific**: Instead of "friendly person", try "warm and empathetic counselor who asks thoughtful questions and validates feelings"
2. **Add Quirks**: Give personas unique traits, speech patterns, or interests
3. **Set Boundaries**: Define what topics they care about or avoid
4. **Mix Personalities**: Combine complementary and conflicting personas for dynamic interactions

### Getting Better Conversations

1. **Ask Open-Ended Questions**: Instead of yes/no questions, ask for opinions or explanations
2. **Introduce Controversial Topics**: Personas with different views will debate
3. **Reference Past Messages**: Personas have context of the conversation
4. **Let Personas Interact**: Sometimes just watch them talk to each other
5. **Use Different AI Models**: Each model has unique strengths and styles

### Managing API Costs

- OpenAI GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Gemini 1.5 Flash: Free tier available, very cost-effective
- Groq: Free tier with fast inference
- Claude 3.5 Sonnet: ~$3 per 1M input tokens, ~$15 per 1M output tokens

**Cost-saving tips:**
- Use Gemini or Groq for most personas (cheaper/free)
- Reserve Claude or GPT-4 for your most important persona
- Shorter system prompts = lower costs
- Limit group size to 3-4 personas instead of 5

## Troubleshooting

### Personas Not Responding

1. Check that you have a valid API key for that persona's AI model
2. Verify the API key has sufficient credits/quota
3. Check browser console for error messages
4. Try refreshing the page

### Messages Not Appearing

1. Ensure you have a stable internet connection
2. Check that Supabase Realtime is enabled (it should be by default)
3. Try refreshing the page

### API Key Errors

1. Verify the key is correct (no extra spaces)
2. Check that the key has the necessary permissions
3. Ensure your API account has available credits
4. Try creating a new key from the provider's dashboard

### Group Code Not Working

1. Verify the code is exactly 6 digits
2. Check that the group hasn't been deleted
3. Ensure you're logged in (if authentication is enabled)

## Privacy & Security

- **API Keys**: Stored securely in Supabase, never exposed to client-side code
- **Messages**: Stored in your Supabase database, not shared with third parties
- **AI Providers**: Your messages are sent to the AI provider you selected (OpenAI, Google, etc.) according to their privacy policies
- **Group Codes**: Anyone with a group code can access that group's messages

## Support & Feedback

This is a demonstration project showcasing advanced AI chat capabilities. For issues or suggestions:

1. Check the README.md for technical documentation
2. Review the code on GitHub
3. Open an issue for bugs or feature requests

## What's Next?

Explore these advanced features (some coming soon):

- Import conversation history for persona adaptation
- Voice input/output for messages
- Meme and GIF integration
- Advanced social sharing with auto-generated images
- Community persona marketplace
- Multi-user groups (multiple humans + AI personas)

Enjoy creating dynamic, unfiltered AI conversations!
