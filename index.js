const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Authorization required 1" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SIGNATURE, (error, decode) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "Authorization required 2" });
    }
    req.decoded = decode;
    next();
  });
};

app.get("/", (req, res) => {
  res.send(`Bristo is cooking`);
});

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster0.beeiwwt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // create database
    const bristoBossDB = client.db("bristoBossDB");
    // users collection
    const userCollection = bristoBossDB.collection("users");
    //menu document collection
    const menuCollection = bristoBossDB.collection("menu");
    //review document collection
    const reviewCollection = bristoBossDB.collection("review");
    // carts collection
    const cartCollection = bristoBossDB.collection("carts");

    // JWT OPERATION
    app.post("/jwt", (req, res) => {
      const uid = req.body;
      const token = jwt.sign(uid, process.env.JWT_SIGNATURE, {
        expiresIn: "1hr",
      });
      res.send(token);
    });

    //Warning : use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const uid = req.decoded.uid;
      const query = { userUid: uid };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access 3" });
      }
      next();
    };
    // user api operation
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const allUser = await userCollection.find().toArray();
      res.send(allUser);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const isExistingUser = await userCollection.findOne({
        email: user.email,
      });
      if (isExistingUser) {
        return res.send({ message: "User already exists" });
      }
      const addUserInfo = await userCollection.insertOne(user);
      res.send(addUserInfo);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const updateUser = await userCollection.updateOne(filter, updateDoc);
      res.send(updateUser);
    });
    app.get("/users/admin/:uid", verifyJWT, async (req, res) => {
      const uid = req.params.uid;
      if (req.decoded?.uid !== uid) {
        return res.send({ admin: false });
      }
      const query = { userUid: uid };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // delete user
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const deleteUser = await userCollection.deleteOne(query);
      res.send(deleteUser);
    });

    // menu items operations
    app.get("/menu", async (req, res) => {
      const allMenuItems = await menuCollection.find().toArray();
      res.send(allMenuItems);
    });

    app.post("/menu", verifyJWT, verifyAdmin, async (req, res) => {
      const newMenu = req.body;
      const addNewMenuItem = await menuCollection.insertOne(newMenu);
      res.send(addNewMenuItem);
    });
    app.delete("/menu/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const deleteMenuItem = await menuCollection.deleteOne(query);
      res.send(deleteMenuItem);
    });
    // review operation
    app.get("/review", async (req, res) => {
      const allReview = await reviewCollection.find().toArray();
      res.send(allReview);
    });

    // cart operation
    app.post("/carts", async (req, res) => {
      const cartItems = req.body;
      const result = await cartCollection.insertOne(cartItems);
      res.send(result);
    });
    app.get("/carts", verifyJWT, async (req, res) => {
      const uid = req.query.uid;
      console.log(uid);
      console.log(req.decoded);
      if (!uid) {
        return res.send([]);
      }
      const query = { userUid: uid };
      if (uid !== req.decoded?.uid) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden Access by cart 5" });
      }
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: new ObjectId(itemId) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Bristo is listening on ${port}`);
});
// DB_NAME = bristoBossOwner
// DB_PASSWORD = GXik0E51xBmueVVS
