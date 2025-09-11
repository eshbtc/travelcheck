// Simple test to verify mock data service works
const { MockDataService } = require('./src/services/mockDataService.ts');

async function testMockData() {
  try {
    console.log('Testing mock data service...');
    const data = await MockDataService.getPresenceDays();
    console.log('Mock data loaded successfully!');
    console.log('Number of presence days:', data.length);
    console.log('First few items:', data.slice(0, 3));
  } catch (error) {
    console.error('Error testing mock data:', error);
  }
}

testMockData();


