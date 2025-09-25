import express from "express";
import "dotenv/config";

const app = express();
app.use(express.text());
app.use(express.json());

const apiKey = process.env.OPENAI_API_KEY;

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
  try {
    const fd = new FormData();
    fd.set("sdp", req.body);
    fd.set("session", sessionConfig);

    const r = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "OpenAI-Beta": "realtime=v1",
        Authorization: `Bearer ${apiKey}`,
      },
      body: fd,
    });
    
    const sdp = await r.text();
    res.send(sdp);
  } catch (error) {
    console.error("Session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
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

// Simple status endpoint
app.get("/", (req, res) => {
  res.json({ 
    status: "JLAIS API is running!", 
    message: "Child-optimized AI voice assistant API",
    endpoints: ["/token", "/session"],
    version: "2.0"
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

export default app;
