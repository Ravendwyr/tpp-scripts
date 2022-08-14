
// define configuration options
require('dotenv').config({ path: './.env' })

const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const imghash = require("imghash")
const tmi = require('tmi.js')
const fs = require('fs')

// create a client with our options
const client = new tmi.client({
    identity: { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels: [ "twitchplayspokemon" ],
})

// gather the goods
var isSavingData = false

if (args.includes("--save-data")) {
    if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")
    isSavingData = true
}

function getUserData(name) {
    if (name === "tpp" || name === "tppsimulator") return

    fetch(`https://api.ivr.fi/v2/twitch/user/${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.statusCode == "404") return

        // download the user's data
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user, null, 4), (err) => { if (err) throw err })

        // download the user's profile pic
        fetch(user.logo, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s profile pic...`)})
        .then(response => response.buffer())
        .then(buffer => {
            if (!buffer) return

            imghash.hash(buffer, 16).then(hash => {
                if (hash != "00000000000000000000000000000000f81ff00fe007e1870000000000000000" && // turquoise
                    hash != "00000000000007e007e00e700e7007e007e00ff01ff81e781818000000000000" && // pink, purple, and dark purple
                    hash != "ffffffffffffffffffffffffffffffff07e00ff01ff81e78ffffffffffffffff" && // blue, and bright pink
                    hash != "fffffffffffff81ff81ff18ff18ff81ff81ff00fe007e187e7e7ffffffffffff")   // yellow, orange, grey, cyan, red, green, and seagreen
                    fs.writeFile(`user_avatars/${name}-${hash}.png`, buffer, err => { if (err) throw err })
                /*/
                else {
                    fs.writeFile(`dummy_avatars/${name}.png`, buffer, err => { if (err) throw err })
                    printMessage(`${name}'s avatar produced a dummy hash, please confirm.`)
                }
                /*/
            })
            .catch(err => printMessage(`error saving avatar for "${name}" -- ${err}`))
        })
        .catch(err => printMessage(`error fetching avatar for "${name}" -- ${err}`))
    })
    .catch(err => printMessage(`error fetching data for "${name}" -- ${err}`))
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
    //if (!fs.existsSync("dummy_avatars")) fs.mkdirSync("dummy_avatars")
    if (!fs.existsSync("user_avatars")) fs.mkdirSync("user_avatars")
    printMessage(`Connected to ${address}:${port}`)
}

function onMessageHandler(channel, userdata, message, self) {
    getUserData(userdata.username)
}

function onJoinHandler(channel, name, self) {
    getUserData(name)
}

function onPartHandler(channel, name, self) {
    getUserData(name)
}

function onNamesHandler(channel, names) {
    names.forEach((name, i) => {
        setTimeout(() => { getUserData(name) }, i * 500)
    })
}

// engage
client.on('join', onJoinHandler)
client.on('part', onPartHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
