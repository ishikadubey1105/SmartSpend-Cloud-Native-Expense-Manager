// Load test environment variables before any module
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/smartspend_test';
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/smartspend_test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.GEMINI_API_KEY = '';
