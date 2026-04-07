const axios = require('axios');

console.log("ENV URL : ", process.env.PYTHON_SERVICE_URL)
console.log("Use mock ai : ", process.env.USE_MOCK_AI)

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL;
const pythonClient = axios.create({
  baseURL: PYTHON_SERVICE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function processPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    console.warn('⚠️ Python service payload must be an object.');
    return null;
  }

  try {
    console.log('🐍 Calling Python service at:', PYTHON_SERVICE_URL, 'with payload keys:', Object.keys(payload));
    console.log("Full Payload : ", payload)
    const response = await pythonClient.post('/process', {message: payload.content});
    if(!response) return "AI Temporarily Unavailable";
    else console.log("🐍 Python Response Data:", response.data);
    console.log('✅ Python service returned successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Python service request failed');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else if (error.request) {
      console.error('   No response from Python service. URL:', PYTHON_SERVICE_URL);
      console.error('   Ensure Python app.py is running on port 5000');
      console.error('   Error:', error.message);
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

module.exports = { processPayload };