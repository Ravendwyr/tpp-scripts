
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
    const users = await twitch.getUsers(userName).catch(err => {})

    /*/ download the user's data
    if (!fs.existsSync("user_data")) {
        fs.mkdirSync("user_data")
    }

    fs.writeFile(`user_data/${userName}.json`, JSON.stringify(users, null, 4), (err) => { if (err) { throw err } })
    /*/

    if (!users || !users.data) {
        printMessage(`Error 400 returned for "${userName}". Skipping...`)
        return
    }

    const user = users.data[0]

    if (!user || !user.profile_image_url) {
        printMessage(`Undefined JSON detected for "${userName}". Skipping...`)
        return
    }

    // download the user's profile pic
    if (!fs.existsSync("user_avatars")) {
        fs.mkdirSync("user_avatars")
    }

    const response = await fetch(user.profile_image_url).catch(err => {})

    if (!response || !response.buffer) {
        printMessage(`Socket hang-up while fetching "${userName}". Skipping...`)
        return
    }

    const buffer = await response.buffer()

    imghash.hash(buffer, 16)
        .then(hash => {
            if (hash != "00000000000000000000000000000000f81ff00fe007e1870000000000000000" && // turquoise
                hash != "00000000000007e007e00e700e7007e007e00ff01ff81e781818000000000000" && // pink, purple, and dark purple
                hash != "ffffffffffffffffffffffffffffffff07e00ff01ff81e78ffffffffffffffff" && // blue, and bright pink
                hash != "fffffffffffff81ff81ff18ff18ff81ff81ff00fe007e187e7e7ffffffffffff")   // yellow, orange, grey, cyan, red, green, and seagreen
                {
                    fs.writeFile(`user_avatars/${userName}-${hash}.png`, buffer, err => { if (err) { throw err } })
                }
                /*/
            else
                {
                    if (!fs.existsSync("dummy_avatars")) {
                        fs.mkdirSync("dummy_avatars")
                    }

                    fs.writeFile(`dummy_avatars/${userName}.png`, buffer, err => { if (err) { throw err } })
                    printMessage(`${userName}'s avatar produced a dummy hash, please confirm.`)
                }
                /*/
        })
        .catch(err => { printMessage(`Error 403 returned for "${userName}". Skipping...`) })
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

// called every time TMI detects a user leaving chat
function onPartHandler(target, username, isSelf) {
    if (username === "tpp" || username === "tppsimulator") { return }

    printMessage("PART " + username)
    getUserData(username)
}

// called shortly after connecting
function onNamesHandler(target, names) {
    printMessage("NAMES " + names)

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
client.connect()
