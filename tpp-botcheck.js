
// define configuration options
require('dotenv').config({ path: './.env' })

const fetch = require('node-fetch-retry')
const tmi = require('tmi.js')
const fs = require('fs')

// create a client with our options
const client = new tmi.client({
    identity: { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels: [ "twitchplayspokemon" ],
})

// build our bot list
var safeList = []
var notified = []
var botList  = []

fs.readFile("botcheck-safe.txt", 'utf8', (err, data) => {
    if (err) throw err

    data.split(/\r\n/g).forEach(row => safeList.push(row))
})

fs.readFile("botcheck-marked.txt", 'utf8', (err, data) => {
    if (err) throw err

    data.split(/\r\n/g).forEach(row => notified.push(row))
})

function fetchFromTwitchInsights() {
    fetch(`https://api.twitchinsights.net/v1/bots/all`, { method: 'GET', retry: 3, pause: 1000, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(data => data.json())
    .then(data => {
        data["bots"].forEach(row => {
            var name = row[0].toLowerCase().trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from TwitchInsights.")
        client.connect()
    })
    .catch(err => printMessage(`Error while downloading from TwitchInsights -- ${err}`))
}

function fetchFromCommunity() {
    fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/list.txt', { method: 'GET', retry: 3, pause: 1000 })
    .then(data => data.text())
    .then(data => {
        data.split(/\n/).forEach(row => {
            var name = row.toLowerCase().trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading community bot lists.")
        fetchFromTwitchInsights()
    })
    .catch(err => printMessage(`Error while downloading community bot lists -- ${err}`))
}

// gather the goods
async function checkUser(name, reason) {
    if (safeList.includes(name) || notified.includes(name)) return

    if (botList.includes(name)) {
        notified.push(name)
        printMessage(`"${name}" detected ${reason}. Please verify before marking.`)
    }
}

async function checkMessage(username) {
    if (safeList.includes(username)) return

    if (botList.includes(username)) {
        printMessage(`"${username}" is in the bot list but they just sent a message in chat. This is likely a false positive.`)
    }
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
    printMessage(`Connected to ${address}:${port}`)
    printMessage(`There are ${botList.length} names in the list.`)
}

function onMessageHandler(channel, userdata, message, self) {
    checkMessage(userdata.username)

    if (userdata.username === "tpp" && message.includes("badge from pinball")) {
        const name = message.substring(message.indexOf("@") +1, message.indexOf(" ")).toLowerCase()

        if (botList.includes(name)) printMessage(`"${name}" is in the bot list but they just won a badge from pinball.`)
    }
}

function onJoinHandler(channel, name, self) {
    checkUser(name, "joining chat")
}

function onNamesHandler(channel, names) {
    names.forEach((name, i) => {
        setTimeout(() => checkUser(name, "during startup"), i * 250)
    })
}

// engage
fetchFromCommunity()

client.on('join', onJoinHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
