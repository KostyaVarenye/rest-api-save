const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = 3000;

app.use(express.json());

// MongoDB connection URI
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

// Connect to MongoDB
client.connect(err => {
  if (err) {
    console.error('Failed to connect to MongoDB:', err);
    return;
  }

  console.log('Connected to MongoDB');

  const db = client.db('myapp');
  const requestsCollection = db.collection('requests');
  const accessCountsCollection = db.collection('accessCounts');

  // Endpoint to store a request
  app.post('/storeReq', (req, res) => {
    const request = req.body;

    // Insert the request into the 'requests' collection
    requestsCollection.insertOne(request, err => {
      if (err) {
        console.error('Failed to store the request:', err);
        res.status(500).json({ error: 'Failed to store the request' });
        return;
      }

      // Increment the access count for the request in the 'accessCounts' collection
      accessCountsCollection.updateOne(
        { _id: request._id },
        { $inc: { count: 1 } },
        { upsert: true }
      );

      res.sendStatus(200);
    });
  });

  // Endpoint to get a request by ID
  app.get('/getReq/:reqID', (req, res) => {
    const reqID = parseInt(req.params.reqID);

    // Find the request by ID in the 'requests' collection
    requestsCollection.findOne({ _id: reqID }, (err, request) => {
      if (err) {
        console.error('Failed to get the request:', err);
        res.status(500).json({ error: 'Failed to get the request' });
        return;
      }

      if (request) {
        // Increment the access count for the request in the 'accessCounts' collection
        accessCountsCollection.updateOne(
          { _id: reqID },
          { $inc: { count: 1 } },
          { upsert: true }
        );

        res.json(request);
      } else {
        res.status(404).json({ error: 'Request not found' });
      }
    });
  });

  // Endpoint to get the top requests
  app.get('/getTopReqs/:limit', (req, res) => {
    const limit = parseInt(req.params.limit);

    // Find the top requests based on access count in the 'accessCounts' collection
    accessCountsCollection
      .find()
      .sort({ count: -1 })
      .limit(limit)
      .toArray((err, topRequests) => {
        if (err) {
          console.error('Failed to get the top requests:', err);
          res.status(500).json({ error: 'Failed to get the top requests' });
          return;
        }

        const requestIDs = topRequests.map(request => request._id);

        // Find the requests with the top IDs in the 'requests' collection
        requestsCollection
          .find({ _id: { $in: requestIDs } })
          .toArray((err, requests) => {
            if (err) {
              console.error('Failed to get the top requests:', err);
              res.status(500).json({ error: 'Failed to get the top requests' });
              return;
            }

            res.json(requests);
          });
      });
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
