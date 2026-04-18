const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

// FIX: make port consistent with Docker + env
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// ----------------------
// MongoDB setup
// ----------------------
let db;
let sensorDataCollection;

const connectToMongoDB = async () => {
  try {
    // FIX: validate env early (prevents confusing "Invalid scheme" error)
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    console.log("Connecting to MongoDB...");

    const client = new MongoClient(process.env.MONGODB_URI);

    await client.connect();

    db = client.db(process.env.DB_NAME || 'guad_pod');
    sensorDataCollection = db.collection('sensor_data');

    console.log('Connected to MongoDB successfully');

    // indexes
    await sensorDataCollection.createIndex({ timestamp: -1 });
    await sensorDataCollection.createIndex({ packetType: 1 });

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// ----------------------
// Routes
// ----------------------
app.post('/api/sensor-data', async (req, res) => {
  try {
    const { packetType, podState, podHealth, sensorData, rawData } = req.body;

    const document = {
      timestamp: new Date(),
      packetType,
      podState,
      podHealth,
      sensorData,
      rawData
    };

    const result = await sensorDataCollection.insertOne(document);

    res.status(201).json({
      success: true,
      id: result.insertedId
    });

  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET recent data
app.get('/api/sensor-data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const packetType = req.query.packetType;

    let query = {};
    if (packetType) {
      query.packetType = parseInt(packetType);
    }

    const data = await sensorDataCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET range
app.get('/api/sensor-data/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: "startDate and endDate are required"
      });
    }

    const data = await sensorDataCollection
      .find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
      .sort({ timestamp: -1 })
      .toArray();

    res.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching data by range:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: db ? 'connected' : 'disconnected'
  });
});

// ----------------------
// Start server (IMPORTANT FIX)
// ----------------------
const startServer = async () => {
  try {
    await connectToMongoDB();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
