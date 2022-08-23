
// define configuration options
require('dotenv').config({ path: './.env' })

const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const imghash = require("imghash")
const tmi = require('tmi.js')
const fs = require('graceful-fs')

// create a client with our options
const client = new tmi.client({
    identity: { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels: [ "twitchplayspokemon" ],
})

// gather the goods
var previousName = ""
var isSavingData = false

if (args.includes("--save-data")) {
    if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")
    isSavingData = true
}

function getUserData(name) {
    if (name === "tpp" || name === "tppsimulator" || name === previousName) return

    fetch(`https://api.ivr.fi/v2/twitch/user/${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.error) return

        // download the user's data
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user, null, 4), (err) => { if (err) throw err })
        if (user.logo.includes("user-default-pictures")) return

        // download the user's profile pic
        fetch(user.logo, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s profile pic...`)})
        .then(response => response.buffer())
        .then(buffer => {
            if (!buffer) return

            imghash.hash(buffer, 16)
            .then(hash => fs.writeFile(`user_avatars/${name}-${hash}.png`, buffer, err => { if (err) throw err }))
            .catch(err => printMessage(`error saving avatar for "${name}" -- ${err}`))
        })
        .catch(err => printMessage(`error fetching avatar for "${name}" -- ${err}`))
    })
    .catch(err => printMessage(`error fetching data for "${name}" -- ${err}`))

    previousName = name
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
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
