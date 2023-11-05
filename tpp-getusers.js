
// define configuration options
const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const imghash = require("imghash")
const tmi = require('tmi.js')
const fs = require('fs')

// create a client with our options
const client = new tmi.Client({
    identity: { username: "justinfan1986", password: "kappa" },
    channels: [ "twitchplayspokemon" ],
})

// throttle queries. we don't want to thrash the servers too much.
const queue = []

let previousName = ""
let timer

function addToQueue(name) {
    if (queue.includes(name) || name == previousName || name == "tpp" || name == "tppsimulator") return
    else queue.push(name)

    if (!timer) timer = setInterval(() => { if (queue.length > 0) getUserData(queue.splice(0, 1)[0]) }, 500)
}

// gather the goods
let isSavingData = false

if (!fs.existsSync("user_avatars")) fs.mkdirSync("user_avatars")

if (args.includes("--save-data")) {
    if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")
    isSavingData = true
}

function getUserData(name) {
    previousName = name

    fetch(`https://api.ivr.fi/v2/twitch/user?login=${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.length != 1) return

        // download the user's data
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user[0], null, 4), (err) => { if (err) throw err })
        if (user[0].logo.includes("user-default-pictures")) return

        // download the user's profile pic
        fetch(user[0].logo, { method: 'GET', retry: 3, pause: 1000, silent: true })
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

    if (queue.length == 0) timer = clearInterval(timer)
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onMessageHandler(channel, userdata, message, self) {
    addToQueue(userdata.username)
}

function onJoinHandler(channel, name, self) {
    addToQueue(name)
}

function onPartHandler(channel, name, self) {
    addToQueue(name)
}

function onNamesHandler(channel, names) {
    names.forEach((name) => addToQueue(name))
}

// engage
client.on('join', onJoinHandler)
client.on('part', onPartHandler)
client.on('names', onNamesHandler)
client.on('message', onMessageHandler)
client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
