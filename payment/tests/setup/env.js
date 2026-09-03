process.env.NODE_ENV = "test";
process.env.MONGO_URI = "mongodb://localhost:27017/test-db-skip-real";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
process.env.ORDER_SERVICE_URL = "http://order.test";
