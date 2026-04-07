const axios = require('axios');

async function testPythonIntegration() {
  console.log('🧪 Testing Python service integration...\n');

  const testPayload = {
    user: { id: 'test-user', email: 'test@example.com' },
    chat: 'test-chat-id',
    content: 'Hello from Node to Python',
    history: [
      { role: 'user', content: 'Hi' },
      { role: 'model', content: 'Hello!' }
    ]
  };

  try {
    console.log('📤 Sending payload to Python service...');
    console.log('   Payload:', JSON.stringify(testPayload, null, 2));

    const response = await axios.post('http://localhost:5000/process', testPayload, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('\n✅ Python service responded successfully!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Integration test PASSED');
  } catch (error) {
    console.error('\n❌ Python service test FAILED');
    if (error.code === 'ECONNREFUSED') {
      console.error('   ⚠️  Cannot connect to Python service on http://localhost:5000');
      console.error('   Make sure to run: python app.py (in python-service directory)');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testPythonIntegration();
