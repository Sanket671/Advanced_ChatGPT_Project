// Import the Pinecone library(Pinecone doesn't store data in sequence, but it stores based on similarity)
const { Pinecone } = require('@pinecone-database/pinecone')

// Initialize a Pinecone client(pc) with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// already created 'cohort-chat-gpt' index in pinecone
const cohortChatGptIndex = pc.Index('cohort-chat-gpt')

async function createMemory({ vectors, metadata, messageId }) {
  // Validate
  if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
    console.warn("createMemory: skipping upsert because vectors missing or invalid.", { messageId });
    return;
  }

  // dimension check (expects 768)
  if (vectors.length !== 768) {
    console.warn(`createMemory: vector length ${vectors.length} !== 768 — skipping upsert. messageId=${messageId}`);
    return;
  }

  // check non-zero content (Pinecone rejects all-zero vectors)
  const hasNonZero = vectors.some((v) => Math.abs(v) > 1e-12);
  if (!hasNonZero) {
    console.warn("createMemory: vector contains only zeros — skipping upsert. messageId=", messageId);
    return;
  }

  // safe upsert
  try {
    await cohortChatGptIndex.upsert([
      {
        id: String(messageId),
        values: vectors,
        metadata,
      },
    ]);
  } catch (err) {
    console.error("createMemory: Pinecone upsert failed:", err?.message || err);
    throw err; // allow caller to handle if needed
  }
}

async function queryMemory({queryVector, limit=5, metadata}) {
    // Use the query API instead of upsert. Pass the vector as `vector` and optional filter.
        // Call query with top-level params (vector/topK/filter) — matches the client API.
        // Only pass a filter if metadata has at least one key (Pinecone rejects empty filter objects)
        const filterObj = metadata && Object.keys(metadata).length ? metadata : undefined

        const data = await cohortChatGptIndex.query({
            vector: queryVector,
            topK: limit,
            filter: filterObj,
            includeMetadata: true
        })

        return data.matches || []
}

module.exports = {createMemory, queryMemory}