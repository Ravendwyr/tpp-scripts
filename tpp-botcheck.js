
// define configuration options
const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const tmi = require('tmi.js')
const fs = require('graceful-fs')

// create a client with our options
const client = new tmi.client({
    identity: { username: "justinfan1986", password: "kappa" },
    channels: [ "twitchplayspokemon" ],
})

// throttle queries. we don't want to thrash the servers too much.
const queue = []

var previousName = ""
var timer

function addToQueue(name) {
    if (queue.includes(name) || name == previousName || name == "tpp" || name == "tppsimulator") return
    else queue.push(name)

    if (!timer) timer = setInterval(() => { if (queue.length > 0) queryIVR(queue.splice(0, 1)[0]) }, 500)
}

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
    fetch(`https://api.twitchinsights.net/v1/bots/all`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying TwitchInsights list...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(data => data.json())
    .then(data => {
        data["bots"].forEach(row => {
            var name = row[0].toLowerCase().trim()
            if (name != "" && !botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from TwitchInsights.")
        client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
    })
    .catch(err => printMessage(`Error while downloading TwitchInsights list -- ${err}`))
}

function fetchFromArrowgent() {
    Promise.all([
        fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/list.txt', { method: 'GET', retry: 3, pause: 1000, silent: true }).then(data => data.text()),
        fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/goodbot.txt', { method: 'GET', retry: 3, pause: 1000, silent: true }).then(data => data.text()),
    ])
    .then(data => {
        // 'data' is an array and its .length is equivalent to the number number of queries in .all() above
        data.forEach(names => {
            names.split(/\n/).forEach(row => {
                var name = row.toLowerCase().trim()
                if (name != "" && !botList.includes(name)) botList.push(name)
            })
        })

        printMessage("Finished downloading from Arrowgent.")
        fetchFromTwitchInsights()
    })
    .catch(err => printMessage(`Error while downloading Arrowgent's list -- ${err}`))
}

function fetchFromFrankerFaceZ() {
    fetch(`https://api.frankerfacez.com/v1/badge/bot`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(data => data.json())
    .then(data => {
        data["users"][2].forEach(row => {
            var name = row.toLowerCase().trim()
            if (name != "" && !botList.includes(name)) botList.push(name)
        })

        printMessage("Finished downloading from FrankerFaceZ.")
        fetchFromArrowgent()
    })
    .catch(err => printMessage(`Error while downloading FrankerFaceZ's list -- ${err}`))
}

function fetchFromCommanderRoot() {
    fetch(`https://twitch-tools.rootonline.de/blocklist_manager.php?preset=known_bot_users`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
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

function queryIVR(name) {
    previousName = name

    fetch(`https://api.ivr.fi/v2/twitch/user?login=${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.length != 1) return

        // download the user's data
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user[0], null, 4), (err) => { if (err) throw err })

        if (safeList.includes(name) || notified.includes(name)) return

        if (idList.includes(user[0].id)) {
            printMessage(`"${name}" detected but is in CommanderRoot's bot list. Please verify before marking.`)
            notified.push(name)
        }

        if (user[0].verifiedBot) {
            printMessage(`"${name}" detected but has verifiedBot set to true. Please verify before marking.`)
            notified.push(name)
        }
    })
    .catch(err => printMessage(`Error fetching data for "${name}" -- ${err}`))

    if (queue.length == 0) timer = clearInterval(timer)
}

function checkUser(name, reason) {
    if (safeList.includes(name) || notified.includes(name)) return

    if (botList.includes(name)) {
        printMessage(`"${name}" detected ${reason}. Please verify before marking.`)
        notified.push(name)
    }
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
    printMessage(`There are ${idList.length} IDs in CommanderRoot's bot list.`)
    printMessage(`There are ${botList.length} names in the master bot list.`)
    printMessage(`There are ${notified.length} names in the marked list.`)
    printMessage(`There are ${safeList.length} names in the safe list.`)
}

function onMessageHandler(channel, userdata, message, self) {
    var name = userdata.username

    if (notified.includes(name)) {
        printMessage(`"${name}" is in the marked list but they just sent a message.`)
    }

    addToQueue(name)
    checkUser(name, "sending a message")
}

function onJoinHandler(channel, name) {
    addToQueue(name)
    checkUser(name, "joining chat")
}

function onPartHandler(channel, name) {
    addToQueue(name)
    checkUser(name, "leaving chat")
}

function onNamesHandler(channel, names) {
    names.forEach((name) => {
        addToQueue(name)
        checkUser(name, "during startup")
    })
}

// engage
fetchFromCommanderRoot()

client.on('join', onJoinHandler)
client.on('part', onPartHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.on('roomstate', onConnectedHandler)
