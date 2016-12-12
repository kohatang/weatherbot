'use strict';

const Botkit = require('botkit');
const rp = require('request-promise');
const CronJob = require('cron').CronJob;

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

const controller = Botkit.slackbot({
    debug: false
});

const bot =controller.spawn({
    token: process.env.token
}).startRTM((err) => {
    if (err) {
        throw new Error(err);
    }
});

const channelId = process.env.CHANNEL_ID;

global.rain = false;

let options = {
    uri: 'http://weather.olp.yahooapis.jp/v1/place',
    qs: {
        coordinates: '139.7472681,35.7299334',
        appid: process.env.YAHOO_APP_ID,
        output: 'json'
    },
    json: true
};
new CronJob('* */1 9-22 * * 1-5', () => {
    // get weather
    rp(options)
        .then((res) => {
            if ((res.Feature[0].Property.WeatherList.Weather[0].Rainfall > 0|| res.Feature[0].Property.WeatherList.Weather[1].Rainfall > 0) && !global.rain) {
                global.rain = true;
                createRainShoterUrl()
                    .then((res) => {
                        bot.say({
                            text: 'It is raining' + '\n' + res[0] + '\n' + 'check: ' + res[1],
                            channel: channelId
                        })
                    .catch((err) => {
                        throw new Error(err);
                    });

                });
            } else if (res.Feature[0].Property.WeatherList.Weather[0].Rainfall === 0 && global.rain) {
                global.rain = false;
                bot.say({
                    text: 'The rain has stopped',
                    channel: channelId
                });
            }
        })
        .catch((err) => {
            console.error(err);
        });
}, null, true, 'Asia/Tokyo');

function createRainShoterUrl() {
    let imgUrl = new Promise(function(resolve, reject) {
        let shoterOptions = {
            url: 'http://is.gd/create.php',
            qs: {
                format: 'json',
                url: 'http://map.olp.yahooapis.jp/OpenLocalPlatform/V1/static?lat=35.7299334&lon=139.7472681&z=13&width=500&height=500&overlay=type:rainfall&appid=' + process.env.YAHOO_APP_ID
            },
            json: true
        };
        // get rain img
        rp(shoterOptions)
            .then((res) => {
                resolve(res.shorturl);
            })
            .catch((err) => {
                reject(err);
            });
    });

    let weatherUrl = new Promise(function(resolve, reject) {
        let shoterOptions = {
            url: 'http://is.gd/create.php',
            qs: {
                format: 'json',
                url: 'http://weather.yahoo.co.jp/weather/zoomradar/?lat=35.7299334&lon=139.7472681&z=12'
            },
            json: true
        };
        rp(shoterOptions)
            .then((res) => {
                resolve(res.shorturl);
            })
            .catch((err) => {
                reject(err);
            });
    });

    return Promise.all([imgUrl, weatherUrl]);
}
