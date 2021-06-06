const {register_account} = require('./modules/Utils');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const async = require('async');
const {SERVICE_JSON, SHEET_ID} = require('./configs')
//#region EXPRESS
    // const express = require('express')
    // bodyParser = require('body-parser')
    // const app = express()
    // const port = 3000
    // var queue = require('express-queue');

    // app.use(queue({ activeLimit: 1, queuedLimit: -1 }));

    // app.use(bodyParser.urlencoded({extended: true}))
    // app.use(bodyParser.json())

    // app.post('/register', async (req, res) => {
    //     const { first_name, lastName, middle_name, email, phone_number, improvementId } = req.body;
    //     console.log(req.body)
    //     if(!first_name || !lastName || !middle_name || !email || !phone_number || !improvementId) return res.send({success: false, error: "Provide credentials!"});

    //     await register_account(first_name, lastName, middle_name, email, phone_number, improvementId, (err, result) => {
    //         res.send(result)
    //     })
    // })

    // app.listen(port, () => {
    //   console.log(`Example app listening at http://localhost:${port}`)
    // })
//#endregion

const creds = require(`./configs/${SERVICE_JSON}`); // the file saved above
const {client_email, private_key} = creds;
(async function() {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(creds);

    await doc.useServiceAccountAuth({
        client_email: client_email,
        private_key: private_key,
    });
    
    await doc.loadInfo(); // loads document properties and worksheets
    
    const sheet = doc.sheetsByIndex[0];
    const logs = doc.sheetsByIndex[1];
    
    const rows = await sheet.getRows();
    const {improvementId} = rows[0];
    console.log(`[INFO] Improvement ID is: ${improvementId}`)

    const query = (el, callback) => {
        setTimeout(async () => {
            const {0: lastName, 1: first_name, 2: middle_name, 3: email, 4: number, 5: state} = el._rawData;
            if(lastName && first_name && middle_name && email && number && !state) {
                console.log(`[INFO] Registering - ${lastName} : ${first_name} : ${number}`)                
                await register_account(first_name, lastName, middle_name, email, number, improvementId, async (err, result) => {
                        // console.log(result)
                        var text;
                        if(result.success) text = "TRUE"
                        else text = result.error

                        el['Registered'] = text;  
                        await el.save()

                        .then(res => console.log(res))
                        .catch(err => {
                            console.log(err.response.data)
                        })
                        
                        if(result.success){
                            await logs.addRow({'Number': number, 'Code': result.response.code})
                        }
                        callback(null, `Number ${number} successfully.`);
                })
            }
        }, 1000)
    }

    const series = [];

    for (var index = 0; index < rows.length; index++) {
        const element = rows[index];
        const {0: lastName, 1: first_name, 2: middle_name, 3: email, 4: number, 5: state} = element._rawData;

        if(lastName && first_name && middle_name && email && number && !state) {
            series.push((callback) => { query(element, callback) });
        }
    }

    console.log(`[INFO] Accounts to register: ${series.length}`)

    async.series(series, (err, result) =>{
        console.log(result)
    })
}());