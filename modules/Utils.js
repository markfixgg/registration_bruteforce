const axios = require('axios');
const { Worker } = require('worker_threads');
const { PROXIES } = require('../configs');

const instance = axios.create({
    baseURL: 'https://api.za.gorodsreda.ru/v1',
    timeout: 5000,
    headers: {
        "accept": "application/json, text/plain, *\/*",
        "accept-language": "ru-UA,ru;q=0.9,uk-UA;q=0.8,uk;q=0.7,ru-RU;q=0.6,en-US;q=0.5,en;q=0.4",
        "authorization": "Bearer NJ4cWN7hLGujEjfbtkoKNjipjORTsrFE_1619614767",
        "content-type": "application/json;charset=UTF-8",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"90\", \"Google Chrome\";v=\"90\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site"
    }
});

if(PROXIES.length >= 1) {
    instance.defaults.proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
}

const startWorker = async (workerData, callback) => {
    const worker = new Worker('./modules/bruter.js', {workerData})

    worker.on('message', async (value) => {
        await worker.terminate()
        callback(null, value)
    })

    worker.on('exit', (exitCode) => {
        console.log('Exited');
    })
    worker.on('error', (error) => {
        console.log(error);
    })
}


const brute_code = async (personUid, callback) => {
    await startWorker({ personUid }, (err, result) => {
        callback(null, result)
    })
}

const register_account = async (first_name, lastName, middle_name, email, phone_number, improvementId, callback) => {
    if(!first_name || !lastName || !middle_name || !email || !phone_number || !improvementId) return;
    const response = await instance.post('/person', {
        agreements: {
            agreementEmail: false,
            agreementFullName: false,
            agreementIdentityFiles: false,
            agreementPhone: false
        },
        firstName: first_name,
        lastName: lastName,
        improvementId,
        patronymic: middle_name,
        email,
        phone: phone_number
    })  
    .catch(err => { })
    if(!response?.data?.success) return callback(null, { success:false, error: "Number already taken." })


    if(response.data.success) {
        const data = response.data.data;
        const { personUid } = data;

        if(!personUid) return callback(null, { success:false, error: "No personUid." })
        
        const request_code = await instance.post('/phone-auth/call-to', { personUid });
        if(!request_code?.data) return callback(null, { success:false, error: "Message already sent." })

        if(request_code.data) {
            await brute_code(personUid, (err, result) => {
                console.log({ ...result, first_name, lastName, email, phone_number });
                return callback(null, { ...result, first_name, lastName, email, phone_number });
            })
        }
    }
}


module.exports = {
    register_account
}