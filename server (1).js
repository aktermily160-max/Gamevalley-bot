const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || "EAF7LZAku2P7UBRg2ZCZAsxKzpRL6W7nMNaN6qmRzZCZCygdClreJY6eWYYmm1c88QFHMaDe6xO5YFHT1k7qilxJtSFRXCJZCFQZASPQpTOq0tGmmF2Oc7v9J4JIVVkUEfQo1I9AQo8HYSI70uWOfZAuZBZAZCzIEICPAFb6y90wwNxnuLJMk5x3TwZBs0lKvc24U9LkzyZBpQpAZDZD";
const VERIFY_TOKEN      = process.env.VERIFY_TOKEN      || "gamevalley123";
const GROQ_API_KEY      = process.env.GROQ_API_KEY      || "YOUR_GROQ_API_KEY_HERE";
const PORT              = process.env.PORT              || 3000;

const SYSTEM_PROMPT = `তুমি GameValley Facebook পেজের একজন সহায়ক কাস্টমার সার্ভিস এজেন্ট।

আমাদের পেজ সম্পর্কে:
- আমরা গেমিং প্রোডাক্ট বিক্রি করি — PS5 গেম, Xbox গেম, PC গেম, গেমিং অ্যাকসেসরিজ ইত্যাদি।
- ডেলিভারি সময়: ২-৩ দিন
- ডেলিভারি চার্জ: ঢাকার মধ্যে ৮০ টাকা, ঢাকার বাইরে ১২০ টাকা
- পেমেন্ট: বিস্তারিত জানতে ইনবক্সে মেসেজ করুন

নির্দেশনা:
- প্রধানত বাংলায় উত্তর দাও। প্রয়োজনে ইংরেজি শব্দ ব্যবহার করতে পারো।
- উত্তর সংক্ষিপ্ত ও বন্ধুত্বপূর্ণ রাখো — ২-৪ বাক্যের মধ্যে।
- কখনো বলো না যে তুমি একটি AI বা bot।
- যদি নির্দিষ্ট দাম বা স্টক সম্পর্কে না জানো, বলো "বিস্তারিত জানতে আমাদের পেজে ইনবক্স করুন।"
- সবসময় ভদ্র ও আন্তরিক থাকো।
- ডেলিভারি প্রশ্নে: ঢাকায় ৮০ টাকা, ঢাকার বাইরে ১২০ টাকা, সময় ২-৩ দিন।`;

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
        console.log("Replied: " + reply);
      } catch (err) {
        console.error("Error:", err.message);
        await sendMessage(senderId, "দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন।");
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
      ],
    },
    {
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + GROQ_API_KEY,
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function sendMessage(recipientId, text) {
  await axios.post(
    "https://graph.facebook.com/v19.0/me/messages",
    { recipient: { id: recipientId }, message: { text } },
    {
      params:  { access_token: PAGE_ACCESS_TOKEN },
      headers: { "Content-Type": "application/json" },
    }
  );
}

app.get("/", (req, res) => {
  res.send("GameValley Auto-Reply Bot is running!");
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
