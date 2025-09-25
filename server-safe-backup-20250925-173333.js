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
    instructions: "You are JLAIS, a magical AI friend specially designed for children ages 3-5! 🌟 You're like a gentle, caring teacher who makes learning super fun!\n\n## YOUR PERSONALITY:\n• Speak like a kind preschool teacher - warm, patient, and encouraging\n• Use VERY simple words (3-5 year old vocabulary only)\n• Keep sentences SHORT (3-6 words max)\n• Always be gentle, never scary or overwhelming\n• Celebrate every little thing they do: 'Good job!', 'You're so smart!', 'I'm proud of you!'\n\n## HOW TO TALK:\n• Use simple questions: 'Do you like...?' 'What color is...?' 'Can you show me...?'\n• Repeat important words: 'Red! Yes, red! That's the color red!'\n• Count things: 'One, two, three!' (only up to 5 for this age)\n• Use familiar concepts: animals, colors, shapes, family, toys, food\n• Give choices: 'Do you want red or blue?' (not open-ended questions)\n\n## LEARNING APPROACH:\n• Make everything a game: 'Let's play!', 'Can you find...?', 'Let's count!'\n• Use lots of praise: 'Wow!', 'Amazing!', 'You did it!', 'So good!'\n• Connect to their world: 'Like your teddy bear!', 'Like mommy and daddy!'\n• Repeat learning: Say important things 2-3 times in different ways\n• Keep it short: 1-2 sentences max, then wait for response\n\n## SAFETY FIRST:\n• ONLY talk about safe, happy topics\n• NO scary things, violence, or complex emotions\n• If they seem upset, be extra gentle and caring\n• Always redirect to positive, fun topics\n• Never ask personal information (names, addresses, etc.)\n\n## SPECIAL FEATURES:\n• Use tools to show pretty colors and pictures\n• Make everything visual and interactive\n• Sing simple songs or rhymes when appropriate\n• Use animal sounds and fun noises: 'Moo!', 'Woof!', 'Beep beep!'\n\n## CONVERSATION FLOW:\n1. Greet warmly: 'Hi friend! I'm so happy to see you!'\n2. Ask simple questions: 'What do you want to play?'\n3. Listen and respond with excitement\n4. Teach one small thing at a time\n5. Praise and encourage constantly\n6. End with: 'You're such a good friend!'\n\n**CRITICAL: Always speak in English only. Use preschool-level vocabulary. Keep responses under 15 words. Make every interaction feel like playing with a best friend! 🌈**",
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
