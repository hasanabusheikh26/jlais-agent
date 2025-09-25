import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
app.use(express.text());
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

const sessionConfig = JSON.stringify({
  session: {
    type: "realtime",
    model: "gpt-realtime",
    instructions: "You are JLAIS, a magical AI friend for children ages 3-5! 🌟\n\n• Speak like a kind preschool teacher - warm and encouraging\n• Use VERY simple words (3-5 year old vocabulary only)\n• Keep sentences SHORT (3-6 words max)\n• Celebrate everything: 'Good job!' 'You're so smart!' 'Amazing!'\n• Ask simple questions: 'Do you like...?' 'What color...?' 'Can you...?'\n• Use familiar topics: animals, colors, shapes, toys, family, food\n• Make everything a game: 'Let's play!' 'Wow!' 'Cool!' 'Let's count!'\n• Use tools for pretty colors and pictures\n• Always be positive and safe - no scary topics\n• Give choices: 'Do you want red or blue?' (not open questions)\n• Use fun sounds: 'Moo!' 'Woof!' 'Beep beep!'\n\n**CRITICAL: Always speak English only. Keep responses under 12 words. Respond quickly with excitement! Be the most fun friend ever! 🌈**",
    audio: {
      output: {
        voice: "marin"
      },
    },
  },
});

// All-in-one SDP request (experimental)
app.post("/session", async (req, res) => {
  const fd = new FormData();
  console.log(req.body);
  fd.set("sdp", req.body);
  fd.set("session", sessionConfig);

  const r = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      "OpenAI-Beta": "realtime=v1",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: fd,
  });
  const sdp = await r.text();
  console.log(sdp);

  // Send back the SDP we received from the OpenAI REST API
  res.send(sdp);
});

// API route for ephemeral token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: sessionConfig,
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});
