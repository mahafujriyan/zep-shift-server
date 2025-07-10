const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.s9ehi3n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database = client.db("parcel_delivary");
    const parcelCollection = database.collection("parcels");


 app.get('/parcels', async (req, res) => {
            const parcels = await parcelCollection.find().toArray();
            res.send(parcels);
        });

        // parcels api
        // GET: All parcels OR parcels by user (created_by), sorted by latest
        app.get('/parcels', async (req, res) => {
            try {
                const userEmail = req.query.email;

                const query = userEmail ? { created_by: userEmail } : {};
                const options = {
                    sort: { createdAt: -1 }, // Newest first
                };

                const parcels = await parcelCollection.find(query, options).toArray();
                res.send(parcels);
            } catch (error) {
                console.error('Error fetching parcels:', error);
                res.status(500).send({ message: 'Failed to get parcels' });
            }
        });


    // 📨 POST - Create a new parcel with email and timestamp
    app.post('/parcels', async (req, res) => {
      try {
        const parcel = req.body;

        if (!parcel.email || typeof parcel.email !== 'string') {
          return res.status(400).json({ error: 'Email is required and must be a string' });
        }

        parcel.createdAt = new Date();
        parcel.weight = Number(parcel.weight);

        const result = await parcelCollection.insertOne(parcel);
        res.status(201).json({ message: 'Parcel created successfully', id: result.insertedId });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create parcel' });
      }
    });

    // // 📦 GET - All parcels, sorted by latest createdAt
    // app.get('/parcels', async (req, res) => {
    //   try {
    //     const parcels = await parcelCollection.find().sort({ createdAt: -1 }).toArray();
    //     res.json(parcels);
    //   } catch (error) {
    //     res.status(500).json({ error: 'Failed to fetch parcels' });
    //   }
    // });

    // // 📧 GET - Parcels by user email, sorted by latest
    // app.get('/parcels/user/:email', async (req, res) => {
    //   const email = req.params.email;
    //   try {
    //     const userParcels = await parcelCollection.find({ email }).sort({ createdAt: -1 }).toArray();
    //     res.json(userParcels);
    //   } catch (error) {
    //     res.status(500).json({ error: 'Failed to fetch user parcels' });
    //   }
    // });

    // 🗑️ DELETE - Delete by ID
    app.delete('/parcels/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.json({ message: 'Parcel deleted' });
        } else {
          res.status(404).json({ error: 'Parcel not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete parcel' });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Optional: you can close the client here if desired
  }
}
run().catch(console.dir);

// Root
app.get('/', (req, res) => {
  res.send('The parcel is coming .....');
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
