process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost:27017/test-db-skip-real";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
