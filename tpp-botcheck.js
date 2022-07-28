
// define configuration options
require('dotenv').config({ path: './.env' })

const args = process.argv.slice(2)

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

// gather the goods
function queryIVR(name, reason) {
    fetch(`https://api.ivr.fi/v2/twitch/user/${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.error) return

        /*/ download the user's data
        if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")

        fs.writeFile(`user_data/${name}.json`, JSON.stringify(user, null, 4), (err) => { if (err) throw err })
        /*/

        if (safeList.includes(name) || notified.includes(name)) return

        if (user.verifiedBot) {
            notified.push(name)
            printMessage(`"${name}" detected ${reason} but has verifiedBot set to true. Please verify before marking.`)
        }
    })
    .catch(err => printMessage(`Error fetching data for "${name}" -- ${err}`))
}

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
    queryIVR(userdata.username, "sending a message")
    checkMessage(userdata.username)

    if (userdata.username === "tpp" && message.includes("badge from pinball")) {
        const name = message.substring(message.indexOf("@") +1, message.indexOf(" ")).toLowerCase()

        if (botList.includes(name)) printMessage(`"${name}" is in the bot list but they just won a badge from pinball.`)
        queryIVR(name)
    }
}

function onJoinHandler(channel, name, self) {
    queryIVR(name, "joining chat")
    checkUser(name, "joining chat")
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
fetchFromArrowgent()

client.on('join', onJoinHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
