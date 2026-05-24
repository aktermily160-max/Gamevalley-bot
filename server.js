const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "EAF7LZAku2P7UBRg2ZCZAsxKzpRL6W7nMNaN6qmRzZCZCygdClreJY6eWYYmm1c88QFHMaDe6xO5YFHT1k7qilxJtSFRXCJZCFQZASPQpTOq0tGmmF2Oc7v9J4JIVVkUEfQo1I9AQo8HYSI70uWOfZAuZBZAZCzIEICPAFb6y90wwNxnuLJMk5x3TwZBs0lKvc24U9LkzyZBpQpAZDZD";
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN   || "gamevalley123";
const GROQ_API_KEY      = process.env.GROQ_API_KEY   || "YOUR_GROQ_API_KEY_HERE";
const PORT              = process.env.PORT            || 3000;

const SYSTEM_PROMPT = "You are a helpful customer service agent for GameValley Facebook page. " +
  "Always reply in Bengali (Bangla) language. Use English words when needed (Banglish is fine). " +
  "About GameValley: We sell gaming products - PS5 games, Xbox games, PC games, gaming accessories. " +
  "Delivery time: 2-3 days. " +
  "Delivery charge: 80 taka inside Dhaka, 120 taka outside Dhaka. " +
  "For payment details, ask customers to inbox us. " +
  "Keep replies short and friendly - 2 to 4 sentences. " +
  "Never say you are an AI or a bot. " +
  "If you do not know a specific price or stock, say: bistharito jante amader page e inbox korun. " +
  "Always be polite and helpful.";

app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const body = req.body;
  if (body.object !== "page") return res.sendStatus(404);
  res.sendStatus(200);
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      const senderId = event.sender.id;
      const text     = event.message.text;
      if (!text) continue;
      console.log("Message from " + senderId + ": " + text);
      try {
        const reply = await getAIReply(text);
        await sendMessage(senderId, reply);
        console.log("Replied OK");
      } catch (err) {
        console.error("Error: " + err.message);
        await sendMessage(senderId, "Dukkhito, ekhon uttor dite parchhina. Ektu pore try korun.");
      }
    }
  }
});

async function getAIReply(userMessage) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage }
      ]
    },
    {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY
      }
    }
  );
  return response.data.choices[0].message.content;
}

async function sendMessage(recipientId, text) {
  await axios.post(
    "https://graph.facebook.com/v19.0/me/messages",
    { recipient: { id: recipientId }, message: { text: text } },
    {
      params:  { access_token: PAGE_ACCESS_TOKEN },
      headers: { "Content-Type": "application/json" }
    }
  );
}

app.get("/", (req, res) => {
  res.send("GameValley Auto-Reply Bot is running!");
});

app.listen(PORT, function() {
  console.log("Server running on port " + PORT);
});
