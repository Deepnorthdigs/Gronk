const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  client.user.setActivity('Mention me to chat!');
});

// Handle messages
client.on('messageCreate', async message => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the bot was mentioned
  if (!message.mentions.has(client.user.id)) return;

  try {
    // Show typing indicator
    await message.channel.sendTyping();

    // Extract the prompt (remove the bot mention)
    let prompt = message.content
      .replace(/<@!?\d+>/g, '') // Remove all mentions
      .trim();

    // Check if this is a reply to another message
    let contextMessage = '';
    if (message.reference) {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
      contextMessage = `\n\nContext from previous message by ${repliedMessage.author.username}: "${repliedMessage.content}"`;
    }

    // If prompt is empty after removing mentions
    if (!prompt) {
      await message.reply('Please provide a message after mentioning me! Example: `@Gronk what is the capital of the United States?`');
      return;
    }

    // Combine prompt with context if available
    const fullPrompt = contextMessage 
      ? `${prompt}${contextMessage}` 
      : prompt;

    // Call Grok API (xAI)
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "user", content: fullPrompt }
        ],
        temperature: 0.7
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);

    const data = await response.json();

    // Log the full response for debugging
    console.log('Full API Response:', JSON.stringify(data, null, 2));

    // Extract the response text
    let replyText = '';
    if (data.choices && data.choices.length > 0) {
      replyText = data.choices[0].message.content;
    } else if (data.error) {
      console.error('API Error:', data.error);
      replyText = `Error: ${data.error.message || 'Unknown error from Grok API'}`;
    }

    // Handle empty responses
    if (!replyText) {
      replyText = "I couldn't generate a response. Please try again.";
    }

    // Discord has a 2000 character limit, so split if needed
    if (replyText.length > 2000) {
      const chunks = replyText.match(/[\s\S]{1,2000}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(replyText);
    }

  } catch (error) {
    console.error('Error processing message:', error);
    await message.reply('Sorry, I encountered an error processing your request. Please try again later.');
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);