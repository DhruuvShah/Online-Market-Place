const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

jest.mock("axios");

jest.mock("../../src/broker/broker", () => ({
  connect: jest.fn(async () => null),
  publishToQueue: jest.fn(async () => true),
  subscribeToQueue: jest.fn(async () => true),
}));

let mongo;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  // Override MONGO_URI for app/db code
  process.env.MONGO_URI = uri;

  // Connect mongoose directly for model tests if needed
  await mongoose.connect(uri, {
    dbName: "jest",
  });
});

beforeEach(async () => {
  // Clear all collections between tests
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close DB connections and stop server
  await mongoose.connection.close();
  if (mongo) {
    await mongo.stop();
  }
});
