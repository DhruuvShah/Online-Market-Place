const amqplib = require("amqplib");

const RECONNECT_DELAY = 5000;

let connection = null;
let channel = null;
let reconnectTimer = null;
const subscriptions = new Map();

async function connect() {
  if (channel) return channel;

  try {
    connection = await amqplib.connect(process.env.RABBIT_URL);
    channel = await connection.createChannel();

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });

    connection.on("close", () => {
      connection = null;
      channel = null;
      if (subscriptions.size) scheduleResubscribe();
    });

    console.log("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    connection = null;
    channel = null;
    console.error("Failed to connect to RabbitMQ:", error.message);
    return null;
  }
}

function scheduleResubscribe() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    for (const [queueName, callback] of subscriptions) {
      await attachConsumer(queueName, callback);
    }
  }, RECONNECT_DELAY);

  reconnectTimer.unref();
}

async function attachConsumer(queueName, callback) {
  const activeChannel = await connect();

  if (!activeChannel) {
    scheduleResubscribe();
    return false;
  }

  try {
    await activeChannel.assertQueue(queueName, { durable: true });

    await activeChannel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        await callback(JSON.parse(msg.content.toString()));
        activeChannel.ack(msg);
      } catch (error) {
        console.error(
          `Failed to handle message from ${queueName}:`,
          error.message,
        );
        activeChannel.nack(msg, false, false);
      }
    });

    console.log(`Subscribed to ${queueName}`);
    return true;
  } catch (error) {
    console.error(`Failed to subscribe to ${queueName}:`, error.message);
    scheduleResubscribe();
    return false;
  }
}

async function subscribeToQueue(queueName, callback) {
  subscriptions.set(queueName, callback);
  return attachConsumer(queueName, callback);
}

async function publishToQueue(queueName, data = {}) {
  const activeChannel = await connect();

  if (!activeChannel) {
    console.warn(`Broker unavailable, could not publish to ${queueName}`);
    return false;
  }

  try {
    await activeChannel.assertQueue(queueName, { durable: true });
    activeChannel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
    return true;
  } catch (error) {
    console.error(`Failed to publish to ${queueName}:`, error.message);
    return false;
  }
}

module.exports = {
  connect,
  publishToQueue,
  subscribeToQueue,
};
