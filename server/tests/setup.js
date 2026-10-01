// Set a stable JWT secret for all tests.
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.NODE_ENV = 'test';
