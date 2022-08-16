
// define configuration options
require('dotenv').config({ path: './.env' })

const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const tmi = require('tmi.js')
const fs = require('graceful-fs')

// create a client with our options
const client = new tmi.client({
    identity: { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels: [ "twitchplayspokemon" ],
})

// build our bot list
var safeList = []
var notified = []
var botList  = []
var idList   = []

if (!args.includes("--ignore-safe")) {
fs.readFile("botcheck-safe.txt", 'utf8', (err, data) => {
    if (err) throw err

    data.split(/\r\n/g).forEach(row => { if (row != "") safeList.push(row) })
})
}

if (!args.includes("--ignore-marked")) {
fs.readFile("botcheck-marked.txt", 'utf8', (err, data) => {
    if (err) throw err

    data.split(/\r\n/g).forEach(row => { if (row != "") notified.push(row) })
})
}

function fetchFromTwitchInsights() {
    fetch(`https://api.twitchinsights.net/v1/bots/all`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying TwitchInsights list...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(data => data.json())
    .then(data => {
        data["bots"].forEach(row => {
            var name = row[0].toLowerCase().trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from TwitchInsights.")
        client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
    })
    .catch(err => printMessage(`Error while downloading TwitchInsights list -- ${err}`))
}

function fetchFromArrowgent() {
    fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/list.txt', { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying Arrowgent's list...`) })
    .then(data => data.text())
    .then(data => {
        data.split(/\n/).forEach(row => {
            var name = row.toLowerCase().trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from Arrowgent.")
        fetchFromTwitchInsights()
    })
    .catch(err => printMessage(`Error while downloading Arrowgent's list -- ${err}`))
}

function fetchFromFrankerFaceZ() {
    fetch(`https://api.frankerfacez.com/v1/badge/bot`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(data => data.json())
    .then(data => {
        data["users"][2].forEach(row => {
            var name = row.toLowerCase().trim()
            if (!botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from FrankerFaceZ.")
        fetchFromArrowgent()
    })
    .catch(err => printMessage(`Error while downloading FrankerFaceZ's list -- ${err}`))
}

function fetchFromCommanderRoot() {
    fetch(`https://twitch-tools.rootonline.de/blocklist_manager.php?preset=known_bot_users`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(data => data.json())
    .then(data => {
        data.forEach(id => idList.push(id.toString()))

        printMessage("Finished downloading from CommanderRoot.")
        fetchFromFrankerFaceZ()
    })
    .catch(err => printMessage(`Error while downloading CommanderRoot's list -- ${err}`))
}

// gather the goods
var isSavingData = false

if (args.includes("--save-data")) {
    if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")
    isSavingData = true
}

function queryIVR(name, reason) {
    fetch(`https://api.ivr.fi/v2/twitch/user/${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.error) return

        // download the user's data
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user, null, 4), (err) => { if (err) throw err })

        if (safeList.includes(name) || notified.includes(name)) return

        if (idList.includes(user.id)) {
            printMessage(`"${name}" detected ${reason} but is in CommanderRoot's bot list. Please verify before marking.`)
        }

        if (user.verifiedBot) {
            printMessage(`"${name}" detected ${reason} but has verifiedBot set to true. Please verify before marking.`)
        }
    })
    .catch(err => printMessage(`Error fetching data for "${name}" -- ${err}`))
}

function checkUser(name, reason) {
    if (safeList.includes(name) || notified.includes(name)) return

    if (botList.includes(name)) {
        printMessage(`"${name}" detected ${reason}. Please verify before marking.`)
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
    printMessage(`There are ${idList.length} IDs in CommanderRoot's list.`)
}

function onMessageHandler(channel, userdata, message, self) {
    if (userdata.username === "tpp") return

    queryIVR(userdata.username, "sending a message")
    checkUser(userdata.username, "sending a message")
}

function onJoinHandler(channel, name) {
    queryIVR(name, "joining chat")
    checkUser(name, "joining chat")
}

function onPartHandler(channel, name) {
    queryIVR(name, "leaving chat")
    checkUser(name, "leaving chat")
}

function onNamesHandler(channel, names) {
    names.forEach((name, i) => {
        setTimeout(() => {
            queryIVR(name, "during startup")
            checkUser(name, "during startup")
        }, i * 250)
    })
}

// engage
fetchFromCommanderRoot()

client.on('join', onJoinHandler)
client.on('part', onPartHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
