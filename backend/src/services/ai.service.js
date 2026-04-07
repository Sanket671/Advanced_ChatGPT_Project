/**
 * ai.service.js
 * Handles all communication with Google Gemini API safely.
 */

require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

// ✅ Initialize Gemini client safely
let ai;
try {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is missing in environment variables.");
    throw new Error("Missing Gemini API Key");
  }

  ai = new GoogleGenAI({ apiKey });
  console.log("✅ Gemini client initialized successfully.");
} catch (error) {
  console.error("❌ Failed to initialize Gemini client:", error.message);
}

/**
 * Generates text response using Gemini model.
 * @param {string|object|array} content - Input text or message array
 * @returns {Promise<string>} Generated response text
 */
async function generateContent(content) {
  if (!ai) {
    console.error("❌ Gemini client not initialized. Cannot generate content.");
    return "AI service unavailable.";
  }

  try {
    // 🧠 Normalize input
    let textPayload;
    if (Array.isArray(content)) {
      textPayload = content
        .map((m) => {
          if (typeof m === "string") return m;
          const role = m.role || "user";
          const body = m.content || m.text || "";
          return `${role}: ${body}`;
        })
        .join("\n");
    } else if (typeof content === "object" && content !== null && content.content) {
      textPayload = content.content;
    } else {
      textPayload = String(content || "");
    }

    if (!textPayload.trim()) {
      console.warn("⚠️ Empty content passed to generateContent().");
      return "No input provided.";
    }

    console.log("🧩 Sending content to Gemini model...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: textPayload,
      config: {
        systemInstruction: "Answer concisely but provide full context.",
      },
    });

    // 🕵️‍♀️ Extract text safely
    const textFromOutput = response.text;

    if (!textFromOutput) {
      console.warn("⚠️ Gemini returned an empty response or invalid format.");
      console.debug("Raw Gemini response:", JSON.stringify(response, null, 2));
      return "No valid response received from Gemini.";
    }

    console.log("✅ Gemini response generated successfully.");
    return textFromOutput;
  } catch (error) {
    console.error("❌ Error in generateContent():");
    console.error("Full Error : ", JSON.stringify(error,null,2));

    if (error?.status === 429 && error?.response?.status === 429) {
      console.error("⚠️ Gemini API rate limit exceeded. Try again later.");
      return "Rate limit reached. Please wait a moment.";
    }

    return error?.message || "Something went wrong with AI";
  }
}

/**
 * Generates embedding vector for a given text using Gemini embeddings model.
 * @param {string} content - Input text to embed
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
// async function generateVector(content) {
//   if (!ai) {
//     console.error("❌ Gemini client not initialized. Cannot generate vector.");
//     return Array(768).fill(0);
//   }

//   try {
//     if (!content || typeof content !== "string") {
//       console.warn("⚠️ Invalid content for generateVector():", content);
//       return Array(768).fill(0);
//     }

//     console.log("🧠 Generating embedding vector...");
//     const response = await ai.models.embedContent({
//       model: "models/embedding-001",
//       contents: [{ parts: [{ text: content }] }],
//       config: {
//         outputDimensionality: 768,
//       },
//     });

//     const vector = response?.embeddings?.[0]?.values;
//     if (!Array.isArray(vector) || vector.length !== 768) {
//       console.warn("⚠️ Invalid or incomplete embedding vector returned by Gemini.");
//       console.debug("Raw embedding response:", JSON.stringify(response, null, 2));
//       return Array(768).fill(0);
//     }

//     console.log("✅ Embedding vector generated successfully (dim=768).");
//     return vector;
//   } catch (error) {
//     console.error("❌ Error in generateVector():");
//     console.error("   →", error.message || error);

//     if (error.response?.status === 429) {
//       console.error("⚠️ Gemini embeddings rate limit exceeded.");
//     }

//     // Return zero vector fallback to prevent Pinecone crash
//     return Array(768).fill(0);
//   }
// }

// ai.service.js (only generateVector shown — keep your generateContent as-is but with try/catch)

async function generateVector(content) {
  try {
    if (!content || typeof content !== 'string') {
      console.warn('⚠️ generateVector called with invalid content:', content);
      return null;
    }

    console.log('🧠 Generating embedding vector...');
    
    // Try the primary model first
    try {
      const response = await ai.models.embedContent({
        //model: "models/text-embedding-004",
        model: "models/embedding-001",
        contents: [{ parts: [{ text: content }] }],
      });

      const vector = response?.embeddings?.[0]?.values;
      if (!Array.isArray(vector) || vector.length !== 768) {
        console.warn('⚠️ Invalid vector from embedding-001, falling back to null');
        return Array(768).fill(0);
      }
      console.log('✅ Embedding generated successfully (dim=768)');
      return vector;
    } catch (innerErr) {
      // Fallback: model might not be available in free tier
      if (innerErr?.status === 404 || innerErr?.message?.includes('not found')) {
        console.warn('⚠️ text-embedding-004 unavailable (free tier limitation) — skipping embeddings');
        return null;
      }
      throw innerErr;
    }
  } catch (err) {
    console.error("❌ Error in generateVector():\n  →", err?.message || err);
    if (err?.response?.status === 429 || err?.status === 429) {
      console.error("⚠️ Quota limit hit (429) — skipping embeddings");
    }
    return Array(768).fill(0);
  }
}


module.exports = { generateContent, generateVector };
