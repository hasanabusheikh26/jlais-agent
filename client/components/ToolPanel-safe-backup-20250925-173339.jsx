import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a child (ages 3-5) asks about colors, wants to see pretty colors, or when teaching about colors. Use simple, familiar themes like 'rainbow', 'ocean', 'flowers', 'animals', or 'toys'. Always use bright, happy colors that children love.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    type: "realtime",
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Simple theme name that 3-5 year olds understand (like 'rainbow', 'flowers', 'ocean', 'animals')",
            },
            colors: {
              type: "array",
              description: "Array of five bright, happy hex color codes perfect for young children",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <h3 className="text-xl font-bold text-purple-600 mb-2">🎨 {theme}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {colorBoxes}
      </div>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_color_palette"
        ) {
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                You just showed pretty colors to a 3-5 year old! Now ask them simple questions like:
                "Do you like these colors?" or "Which color is your favorite?" or "What do these colors remind you of?"
                Keep it very simple and encouraging. Use words like "Wow!" "Pretty!" "Beautiful!" 
                Maybe ask if they want to see different colors next time.
              `,
              },
            });
          }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gradient-to-b from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
        <h2 className="text-xl font-bold text-purple-700 text-center mb-4">Colors! </h2>
        {isSessionActive
          ? (
            functionCallOutput
              ? <FunctionCallOutput functionCallOutput={functionCallOutput} />
              : <div className="text-center">
                  <p className="text-lg text-purple-600">Let's play with colors!</p>
                </div>
          )
          : <div className="text-center">
              <p className="text-lg text-gray-500">🎙️ Press the big button to start!</p>
            </div>}
      </div>
    </section>
  );
}
