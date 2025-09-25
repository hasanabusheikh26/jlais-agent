import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
app.use(express.text());
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client (only in development)
let vite;
if (process.env.NODE_ENV !== 'production') {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.use(vite.middlewares);
}

const sessionConfig = JSON.stringify({
  session: {
    type: "realtime",
    model: "gpt-realtime",
    instructions: "You are JLAIS, a magical AI friend for children ages 3-5! 🌟\n\n• Speak like a kind preschool teacher - warm and encouraging\n• Use VERY simple words (3-5 year old vocabulary only)\n• Keep sentences SHORT (3-6 words max)\n• Celebrate everything: 'Good job!' 'You're so smart!' 'Amazing!'\n• Ask simple questions: 'Do you like...?' 'What color...?' 'Can you...?'\n• Use familiar topics: animals, colors, shapes, toys, family, food\n• Make everything a game: 'Let's play!' 'Wow!' 'Cool!' 'Let's count!'\n• Use tools for pretty colors and pictures\n• Always be positive and safe - no scary topics\n• Give choices: 'Do you want red or blue?' (not open questions)\n• Use fun sounds: 'Moo!' 'Woof!' 'Beep beep!'\n\n**MISHEARING HELP:**\n• If unclear, ask: 'Did you say colors?' or 'Did you want to play?'\n• Repeat back what you heard: 'You said red? Cool!'\n• Offer choices: 'Do you want colors or animals?'\n• Stay positive when confused: 'Let me try again!'\n• If child says 'more' or 'again', repeat last action\n\n**CRITICAL: Always speak English only. Keep responses under 12 words. Respond quickly with excitement! Be the most fun friend ever! 🌈**",
    audio: {
      output: {
        voice: "marin"
      },
      input: {
        turn_detection: {
          type: "server_vad",
          threshold: 0.4,           // Lower threshold for quieter child voices
          silence_duration_ms: 800, // Longer pause detection (kids think slower)
          prefix_padding_ms: 300,   // More padding to catch full words
          create_response: true
        }
      }
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
    if (process.env.NODE_ENV === 'production') {
      // In production, serve a simple HTML file
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JLAIS - AI Friend for Kids</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
      .gradient-bg { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    </style>
</head>
<body class="gradient-bg min-h-screen">
    <div id="root">
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <h1 class="text-3xl font-bold text-purple-600 mb-4">🌟 JLAIS</h1>
                <p class="text-lg text-gray-700 mb-6">Your magical AI friend for ages 3-5!</p>
                <p class="text-sm text-gray-500 mb-4">This is a serverless deployment. For full functionality, please run locally.</p>
                <div class="space-y-2">
                    <p class="text-sm"><strong>Features:</strong></p>
                    <p class="text-xs">✅ Child-optimized voice recognition</p>
                    <p class="text-xs">✅ Smart mishearing handling</p>
                    <p class="text-xs">✅ Beautiful color learning tools</p>
                    <p class="text-xs">✅ Safe and encouraging for kids</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } else {
      // Development mode with Vite
      const template = await vite.transformIndexHtml(
        url,
        fs.readFileSync("./client/index.html", "utf-8"),
      );
      const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
      const appHtml = await render(url);
      const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    }
  } catch (e) {
    if (vite) {
      vite.ssrFixStacktrace(e);
    }
    next(e);
  }
});

// Export for Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Express server running on *:${port}`);
  });
}
