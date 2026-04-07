/**
 * mock-ai.service.js
 * Mock AI service for testing when Gemini API quota is exceeded
 * Simulates AI responses for development/testing
 */

const responses = [
  "That's an interesting question! Let me think about that...",
  "Based on what you mentioned, here are some key points...",
  "I understand your concern. Here's what I know about this topic...",
  "Great question! This is actually quite important to understand...",
  "Let me provide you with a comprehensive answer to that...",
  "You're asking something many people wonder about...",
  "That's a valid point. Let me elaborate on that...",
  "This is a common topic. Here's what I can tell you...",
];

/**
 * Generates mock content response
 * @param {string|object|array} content - Input content
 * @returns {Promise<string>} Mock AI response
 */
async function generateContent(content) {
  console.log("🤖 MOCK MODE: Generating mock AI response...");
  
  // Simulate some processing delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Use a random response or create one based on input
  const randomIndex = Math.floor(Math.random() * responses.length);
  const baseResponse = responses[randomIndex];
  
  // If content is an array of messages, reference the last user message
  let userInput = "your question";
  if (Array.isArray(content) && content.length > 0) {
    const lastUserMsg = content.reverse().find(m => m.role === "user");
    if (lastUserMsg && lastUserMsg.content) {
      userInput = lastUserMsg.content.substring(0, 50);
    }
  }
  
  const mockResponse = `${baseResponse}\n\nRegarding "${userInput}", I can provide you with detailed insights and information to help you understand this better. In a production environment with an active Gemini API key, you would receive a real AI-generated response. This mock response is being shown because the API quota has been exceeded.`;
  
  return mockResponse;
}

/**
 * Generates mock embedding vector
 * @param {string} content - Input text
 * @returns {Promise<null>} Returns null (embeddings disabled in test mode)
 */
async function generateVector(content) {
  console.log("🤖 MOCK MODE: Skipping embeddings...");
  return null; // Embeddings not needed in mock mode
}

module.exports = { generateContent, generateVector };
