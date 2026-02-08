const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongo;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = "test_jwt_secret";

  await mongoose.connect(uri);
}, 30000); // Increase timeout to 30 seconds

afterEach(async () => {
  // Cleanup all collections between tests
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongo) {
    await mongo.stop();
  }
});
