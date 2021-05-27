const {register_account, my_interval} = require('./modules/Utils');
const express = require('express')
bodyParser = require('body-parser')
const app = express()
const port = 3000
var queue = require('express-queue');

app.use(queue({ activeLimit: 1, queuedLimit: -1 }));

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.post('/register', async (req, res) => {
    const { first_name, lastName, middle_name, email, phone_number } = req.body;
    console.log(req.body)
    if(!first_name || !lastName || !middle_name || !email || !phone_number) return res.send({success: false, error: "Provide credentials!"});

    await register_account(first_name, lastName, middle_name, email, phone_number, (err, result) => {
        res.send(result)
    })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
