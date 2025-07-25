const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
    const paymentCollection = database.collection("payment");


 

        // parcels api
        // GET: All parcels OR parcels by user (created_by), sorted by latest
       // ✅ Keep only this one:
app.get('/parcels', async (req, res) => {
    try {
        const userEmail = req.query.email;
        const query = userEmail ? { email: userEmail } : {};

        const options = {
            sort: { createdAt: -1 },
        };
        const parcels = await parcelCollection.find(query, options).toArray();
        res.send(parcels);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).send({ message: 'Failed to get parcels' });
    }
});
//  get percel by id 
// ✅ GET - Parcel by ID (for payment page)
app.get('/parcels/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) });
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    res.send(parcel);
  } catch (err) {
    console.error('Error getting parcel by ID:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
        parcel.cost = Number(parcel.cost);


        const result = await parcelCollection.insertOne(parcel);
        res.status(201).json({ message: 'Parcel created successfully', id: result.insertedId });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create parcel' });
      }
    });

   
  

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

    // payment related api 
    // 🔑 Create Stripe Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  const { parcelId } = req.body;

  try {
    console.log('Creating payment intent for parcelId:', parcelId);

    if (!ObjectId.isValid(parcelId)) {
      console.error('Invalid parcelId format');
      return res.status(400).send({ error: 'Invalid parcel ID format' });
    }

    const parcel = await parcelCollection.findOne({ _id: new ObjectId(parcelId) });

    if (!parcel) {
      console.error('Parcel not found for ID:', parcelId);
      return res.status(400).send({ error: 'Parcel not found' });
    }

    if (!parcel.cost || typeof parcel.cost !== 'number') {
      console.error('Parcel found but cost missing or invalid:', parcel);
      return res.status(400).send({ error: 'Parcel cost missing or invalid' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parcel.cost * 100, 
      currency: 'bdt',
      metadata: { integration_check: 'accept_a_payment', parcelId },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Payment intent error:', err);
    res.status(500).send({ error: 'Failed to build payment intent' });
  }
});

//  get payment history
app.get('/payments', async (req, res) => {
  try {
    const payments = await paymentCollection.find().sort({ paidAt: -1 }).toArray();
    res.send(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).send({ error: 'Failed to fetch payment history' });
  }
});

// update parcels
// ✅ Update parcel payment status after successful payment
app.patch('/parcels/payment/:id', async (req, res) => {
  const parcelId = req.params.id;
  const { transactionId, email, method } = req.body;

  try {
    // Save into payments collection
    const paymentData = {
      parcelId,
      transactionId,
      email,
      payment_method: method,
      payment_status: 'paid',
      paidAt: new Date()
    };

    await paymentCollection.insertOne(paymentData); 

    // Also update parcel status
    const result = await parcelCollection.updateOne(
      { _id: new ObjectId(parcelId) },
      {
        $set: {
          payment_status: 'paid',
          transactionId,
        },
      }
    );

    if (result.modifiedCount > 0) {
      res.send({ message: 'Payment saved and status updated' });
    } else {
      res.status(404).send({ error: 'Parcel not found or already updated' });
    }
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).send({ error: 'Failed to update payment status' });
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
