require("dotenv").config();

const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------
// OpenAI setup
// -----------------------------

const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// -----------------------------
// Express setup
// -----------------------------

app.use(express.json({ limit: "10mb" }));

// Serve index.html and other frontend files
app.use(express.static(path.join(__dirname)));

// -----------------------------
// AI CHAT
// -----------------------------

app.post("/api/chat", async (req, res) => {

    try {

        if (!client) {
            return res.status(503).json({
                error: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env."
            });
        }

        const { messages, think } = req.body;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Invalid messages"
            });
        }

        // Keep only valid messages
        const cleanMessages = messages
            .filter(message =>
                message &&
                typeof message.content === "string" &&
                (message.role === "user" ||
                 message.role === "assistant")
            )
            .map(message => ({
                role: message.role,
                content: message.content
            }));


        if (cleanMessages.length === 0) {
            return res.status(400).json({
                error: "No message provided"
            });
        }


        // --------------------------------
        // Select model
        // --------------------------------

        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";


        // --------------------------------
        // System instructions
        // --------------------------------

        const instructions = `
You are AI GPT, a helpful personal AI assistant.

Give accurate, useful and clear answers.

When explaining difficult topics:
- Use simple language.
- Give step-by-step explanations.
- Use examples when useful.

When writing code:
- Give clean code.
- Explain important parts.
- Point out common mistakes.

Do not reveal hidden chain-of-thought.
Provide concise reasoning summaries when useful.
        `;


        // --------------------------------
        // Reasoning setting
        // --------------------------------

        const request = {
            model: model,

            instructions: instructions,

            input: cleanMessages,

            max_output_tokens: 3000
        };


        // Think mode
        if (think === true) {

            request.reasoning = {
                effort: "medium"
            };

        }


        // --------------------------------
        // Call OpenAI
        // --------------------------------

        const response =
            await client.responses.create(request);


        // --------------------------------
        // Get final text
        // --------------------------------

        const reply =
            response.output_text ||
            "I couldn't generate a response.";


        // --------------------------------
        // Send response to browser
        // --------------------------------

        res.json({
            reply: reply
        });


    } catch (error) {

        console.error("OpenAI error:", error);

        if (error.status === 401) {

            return res.status(401).json({
                error:
                    "Invalid OpenAI API key."
            });

        }

        if (error.status === 429) {

            return res.status(429).json({
                error:
                    "Too many requests. Please try again later."
            });

        }

        res.status(500).json({
            error:
                "AI server error. Please try again."
        });

    }

});


// -----------------------------
// FRONTEND
// -----------------------------

app.get("*", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// -----------------------------
// START SERVER
// -----------------------------

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("       AI GPT SERVER RUNNING");
    console.log("================================");
    console.log("");
    console.log(`Open: http://localhost:${PORT}`);
    console.log("");
});