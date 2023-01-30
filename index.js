const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');


app.use(cors());
app.use(express.json());

// JWT Verify
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({
            message: 'unauthorized access '
        })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({
                message: 'forbidden access'
            })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.IDNAME}:${process.env.PASSWORD}@cluster0.gaubth5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


const dbConnect = async () => {
    try {
        await client.connect()
        console.log('db connected')

    } catch (error) {
        console.log(error)
    }
}
dbConnect();
const usersCollections = client.db('powerHack').collection('users');
const billingsCollections = client.db('powerHack').collection('billings');




app.get('/', async (req, res) => {
    res.send('Im running here')
})


// User registration 

app.post('/registration', async (req, res) => {
    try {
        const user = req.body;
        // console.log(user);
        const query = { email: user.email };
        const checkUser = await usersCollections.findOne(query);
        if (checkUser) {
            return res.send({
                success: false,
                message: 'Email Already in Use'
            })
        }
        const result = await usersCollections.insertOne(user);
        res.send(result);
    } catch (error) {
        console.log(error);
    }

});


//User Login 

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const query = { email, password };
        const checkUser = await usersCollections.findOne(query);
        if (checkUser) {
            return res.send({
                success: true,
                message: `Welcome back ${checkUser.name}`
            })
        }
        res.send({
            success: false,
            message: "Invalid Email or Password"
        });
    } catch (error) {
        console.log(error);
    }


});


// Add Billing 
app.post('/add-billing', async (req, res) => {
    try {
        const details = req.body;
        const result = await billingsCollections.insertOne(details);
        if (result.acknowledged) {
            return res.send({
                success: true
            });
        }
        res.send({
            success: false
        });
    } catch (error) {
        console.log(error);
    }
});


// Billing List

app.get('/billing-list', verifyJWT, async (req, res) => {
    try {
        const { email, page, search } = req.query;
        const query = { user: email }
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
            return res.status(401).send({
                message: 'unauthorized access '
            })
        }
        if (search) {
            console.log(search);
        }
        const billingData = await billingsCollections.find(query).sort({ addedTime: -1 }).skip(parseInt(page) * 10).limit(10).toArray();
        const totalBill = await billingsCollections.find(query).toArray();

        const totalPaid = totalBill.reduce((accumulator, object) => {
            return accumulator + parseInt(object.payableAmount);
        }, 0);
        res.send({ billingData, totalBills: totalBill.length, totalPaid });
    } catch (error) {
        console.log(error)
    }
})





//get jwt token
app.get('/jwt', async (req, res) => {
    try {
        const { email } = req.query;
        const user = await usersCollections.findOne({ email });
        if (user) {
            const token = jwt.sign({ email }, process.env.TOKEN, { expiresIn: '7d' })
            return res.send({
                accessToken: token
            })
        }
        res.status(401).send({ message: "unauthorized access" })
    } catch (error) {
        console.log(error)
    }
});


// Delete Billing Data
app.delete('/delete-billing/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: ObjectId(id) }
        const result = await billingsCollections.deleteOne(query);
        res.send(result)

    } catch (error) {
        console.log(error)
    }

})


app.put('/update-billing/:id', verifyJWT, async (req, res) => {
    try {
        const { email } = req.query;
        const decodedEmail = req.decoded.email;
        if (email !== decodedEmail) {
            return res.status(401).send({
                message: 'unauthorized access'
            })
        }
        const { id } = req.params;
        const filter = { _id: ObjectId(id) }
        const option = { upsert: true }
        const updated = {
            $set: {

            }
        }
        const result = await billingsCollections.updateOne(filter, updated, option)
        res.send(result);
    } catch (error) {
        console.log(error)

    }
})



app.listen(port, () => console.log(`server is running on ${port}`))