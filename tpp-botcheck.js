
// define configuration options
require('dotenv').config({ path: './.env' })

const fetch = require('node-fetch')
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
    fetch(`https://api.twitchinsights.net/v1/bots/all`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(page => page.json())
    .then(data => {
        data["bots"].forEach(row => {
            var name = row[0].trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from TwitchInsights.")
        client.connect()
    })
    .catch(err => printMessage(`Error while downloading from TwitchInsights -- ${err}`))
}

function fetchFromTwitchBotsInfo(url) {
    fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(page => page.json())
    .then(data => {
        data["bots"].forEach(row => {
            var name = row.username.trim()
            if (!botList.includes(name)) botList.push(name)
        })

        if (data["_links"].next != null) {
            fetchFromTwitchBotsInfo(data["_links"].next)
        } else {
            printMessage("Finished downloading from TwitchBotsInfo.")
            fetchFromTwitchInsights()
        }
    })
    .catch(err => printMessage(`Error while downloading from TwitchBotsInfo -- ${err}`))
}

// gather the goods
async function checkUser(name, reason) {
    if (safeList.includes(name) || notified.includes(name)) return

    if (botList.includes(name)) {
        notified.push(name)
        printMessage(`"${name}" detected ${reason}. Please verify before marking.`)
        return
    }
}

async function checkMessage(username) {
    if (safeList.includes(username)) return

    if (botList.includes(username)) {
        printMessage(`"${username}" is in the bot list but they just sent a message in chat. This is likely a false positive.`)
        return
    }
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
    printMessage(`Connected to ${address}:${port}`)
    printMessage(`There are ${botList.length} bot accounts in the list.`)
}

function onMessageHandler(channel, userdata, message, self) {
    checkMessage(userdata.username)
}

function onJoinHandler(channel, name, self) {
    checkUser(name, "joining chat")
}

function onPartHandler(channel, name, self) {
    checkUser(name, "leaving chat")
}

function onNamesHandler(channel, names) {
    names.forEach((name, i) => {
        setTimeout(() => checkUser(name, "during startup"), i * 250)
    })
}

// engage
printMessage("Downloading bot lists. This usually takes around 30 seconds to 3 minutes. Please wait...")
fetchFromTwitchBotsInfo("https://api.twitchbots.info/v2/bot")

client.on('join', onJoinHandler)
client.on('part', onPartHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
