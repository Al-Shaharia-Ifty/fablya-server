const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.DB_URI;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// VERIFY JWT TOKEN
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productCollection = client.db("Fablya").collection("products");
    const userCollection = client.db("Fablya").collection("users");
    const cartCollection = client.db("Fablya").collection("cart");

    // verify Member check
    const verifyMember = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email: email });
      if (user.role === "member") {
        next();
      } else if (user.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    // verify Admin check
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email: email });
      if (user.role === "admin") {
        next();
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    };

    /*-------- get for all --------*/

    // get all products
    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    // get one product
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // login user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };

      // check email
      const checkEmail = await userCollection.findOne({ email: email });
      if (!checkEmail?.role) {
        const name = user.name;
        const email = user.email;
        const updateDoc = {
          $set: {
            name: name,
            email: email,
            role: "member",
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET
        );
        res.send({ result, token });
      } else {
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET
        );
        res.send({ result, token });
      }
    });

    // login with phone number
    app.put("/phone_user/:number", async (req, res) => {
      const number = req.params.number;
      const filter = { phoneNumber: number };
      const options = { upsert: true };
      // check Number
      const checkNumber = await userCollection.findOne({ phoneNumber: number });
      if (!checkNumber?.phoneNumber) {
        const updateDoc = {
          $set: {
            phoneNumber: number,
            role: "member",
          },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { phoneNumber: number },
          process.env.ACCESS_TOKEN_SECRET
        );
        res.send({ result, token });
      } else {
        const updateDoc = {
          $set: { phoneNumber: number },
        };
        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { phoneNumber: number },
          process.env.ACCESS_TOKEN_SECRET
        );
        res.send({ result, token });
      }
    });

    /*-------- private --------*/

    /*---- all get ----*/

    // get user information
    app.get("/userInfo", verifyJWT, verifyMember, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // get user cart
    app.get("/user_cart", verifyJWT, verifyMember, async (req, res) => {
      const email = req.decoded.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    /*---- all post ----*/

    /*---- all put ----*/

    // add to cart
    app.put("/addToCart/:id", verifyJWT, verifyMember, async (req, res) => {
      const productID = req.params.id;
      const cartInfo = req.body;
      const filter = { productID: productID };
      const options = { upsert: true };
      const updateDoc = {
        $set: cartInfo,
      };
      const result = await cartCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // update user info
    app.put("/updateUserInfo", verifyJWT, verifyMember, async (req, res) => {
      const email = req.decoded.email;
      const userInfo = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: userInfo,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    /*---- all delete ----*/

    /*---- end ----*/
  } finally {
  }
}

run().catch();

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
