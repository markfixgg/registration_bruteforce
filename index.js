const async = require('async');
const { register_account } = require('./modules/Utils');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { SERVICE_JSON, SHEET_ID } = require('./configs')

const serviceJson = require(`./configs/${SERVICE_JSON}`);

(async function() {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth(serviceJson);
    
    await doc.loadInfo();

    // Get sheets by index
    const sheet = doc.sheetsByIndex[0];
    const logs = doc.sheetsByIndex[1];

    // Get required rows
    const rows = await sheet.getRows();
    const { improvementId } = rows[0];

    console.log(`[INFO] Improvement ID is: ${improvementId}`)

    const query = async (element, callback) => {
        const { 0: lastName, 1: first_name, 2: middle_name, 3: email, 4: number, 5: state } = element._rawData;
        if(!lastName || !first_name || !middle_name || !email || !number || state) return;

        console.log(`[INFO] Registering - ${lastName} : ${first_name} : ${number}`);

        await register_account(first_name, lastName, middle_name, email, number, improvementId, async (err, result) => {
                element['Registered'] = result?.success ? "TRUE" : result?.error;
                await element.save();

                if(result.success){
                    await logs.addRow({'Number': number, 'Code': result?.response?.code})
                }

                callback(null, `Number ${number} successfully registered.`);
        })
    }

    const series = [];

    for(const row of rows) {
        const {0: lastName, 1: first_name, 2: middle_name, 3: email, 4: number, 5: state} = row._rawData;

        if(lastName && first_name && middle_name && email && number && !state) {
            series.push((callback) => { query(row, callback) });
        }
    }

    console.log(`[INFO] Accounts to register: ${series.length}.`)

    await async.series(series, (err, result) => {
        console.log(result)
    })
}());