
// define configuration options
require('dotenv').config({ path: './.env' })

const TwitchApi = require("node-twitch").default
const fetch = require('node-fetch')
const imghash = require("imghash")
const tmi = require('tmi.js')
const fs = require('fs')

// create a client with our options
const client = new tmi.client({
    options:    { debug: false },
    connection: { reconnect: true, secure: true },
    identity:   { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels:   [ "twitchplayspokemon" ],
})

const twitch = new TwitchApi({
    client_id:     process.env.TWITCH_CLIENTID,
    client_secret: process.env.TWITCH_CLIENTSECRET,
})

// gather the goods
async function getUserData(userName) {
    const users = await twitch.getUsers(userName)
    const user = users.data[0]

    /*/ download the user's data
    if (!fs.existsSync("user_data")) {
        fs.mkdirSync("user_data")
    }

    let userFileName = `user_data/${userName}.json`
    let data = JSON.stringify(user, null, 4)

    fs.writeFile(userFileName, data, (err) => { if (err) { throw err } })
    /*/

    // download the user's profile pic
    if (!fs.existsSync("user_avatars")) {
        fs.mkdirSync("user_avatars")
    }

    const response = await fetch(user.profile_image_url)
    const buffer = await response.buffer()

    imghash.hash(buffer, 16).then((hash) => {
        let pfpFileName = `user_avatars/${userName}-${hash}.png`
        fs.writeFile(pfpFileName, buffer, (err) => { if (err) { throw err } })
    })
    //
}

// our pretty printer
function printMessage(message) {
    const ts = new Date().toLocaleTimeString()
    console.log(`[${ts}] ${message}`)
}

// called every time the script connects to Twitch chat
function onConnectedHandler(address, port) {
    printMessage(`Connected to ${address}:${port}`)
}

// called every time a message comes in
function onMessageHandler(target, context, message, isSelf) {
    if (context.username === "tpp" || context.username === "tppsimulator") { return }

    printMessage("MESSAGE " + context.username)
    getUserData(context.username)
}

// called every time TMI detects a new user in chat
function onJoinHandler(target, username, isSelf) {
    if (username === "tpp" || username === "tppsimulator") { return }

    printMessage("JOIN " + username)
    getUserData(username)
}

// called shortly after connecting
function onNamesHandler(target, names) {
    printMessage("NAMES " + names)

    names.forEach((name, i) => {
        setTimeout(() => { getUserData(name) }, i * 100)
    })
}

// engage
client.on('join', onJoinHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
client.connect()
