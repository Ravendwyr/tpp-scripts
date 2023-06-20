
// define configuration options
require('dotenv').config()

const args = process.argv.slice(2)

const fetch = require('node-fetch-retry')
const tmi = require('tmi.js')
const fs = require('graceful-fs')

// create a client with our options
const client = new tmi.Client({
    identity: { username: "justinfan1986", password: "kappa" },
    channels: [ "twitchplayspokemon" ],
})

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// build our bot list
var safeList = []
var notified = []

if (!args.includes("--ignore-safe")) {
    fs.readFile("botcheck-safe.txt", 'utf8', (err, data) => {
        if (err) throw err

        data.split(/\r?\n/i).forEach(row => { if (row != "") safeList.push(row.toLowerCase().trim()) })
    })
}

// gather the goods
var isSavingData = false
var inDebugMode = false

if (args.includes("--save-data")) {
    if (!fs.existsSync("user_data")) fs.mkdirSync("user_data")
    isSavingData = true
}

if (args.includes("--debug")) {
    if (!fs.existsSync("chat_data")) fs.mkdirSync("chat_data")
    inDebugMode = true
}

async function queryAPI(name) {
    var winnerID, followsChannel

    await fetch(`https://api.ivr.fi/v2/twitch/user?login=${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(resp => resp.json())
    .then(user => {
        if (!user || user.length != 1) return
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user[0], null, 4), (err) => { if (err) throw err })

        winnerID = user[0].id
    })
    .catch(err => printMessage(`Error fetching data for "${name}" -- ${err}`))

    if (safeList.includes(name) || notified.includes(name)) return

    await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${winnerID}&to_id=56648155`, { method: 'GET', retry: 3, pause: 1000, silent: true, headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID } })
    .then(resp => resp.json())
    .then(data => {
        if (data && data.total == 0) {
            followsChannel = false
        } else if (data.total == 1) {
            followsChannel = true
        } else {
            printMessage(`Invalid data received for ${name}. Please check your oauth.`)
            fs.writeFile(`error-${name}.json`, JSON.stringify(data, null, 4), (err) => { if (err) throw err })
        }
    })
    .catch(err => printMessage(`Error fetching follows for "${name}" -- ${err}`))

    var body = [{
        'operationName': 'ViewerCardModLogsMessagesBySender',
        'variables': {
            'senderID': winnerID,
            'channelID': '56648155',
        },
        'extensions': {
            'persistedQuery': {
                'version': 1,
                'sha256Hash': 'c634d7fadf4453103f4047a102ca2c4b0da4ada0330741bd80ae527c2c958513'
            },
        },
    }]

    await fetch(`https://gql.twitch.tv/gql`, {
        method: 'POST', retry: 3, pause: 1000, silent: true, body: JSON.stringify(body),
        headers: {
            'Authorization': `OAuth ${process.env.GRAPHQL_OAUTH}`, 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
            'Client-Integrity': `${process.env.GRAPHQL_INTEGRITY}`, 'X-Device-Id': `${process.env.GRAPHQL_DEVICEID}`,
        }
    })
    .then(resp => resp.json())
    .then(data => {
        if (data && data[0].data.viewerCardModLogs.messages.length == 0) {
            let message

            if (followsChannel) message = `${name} won a pinball badge but they have no chat history.`
            else message = `${name} won a pinball badge but they don't follow and haven't spoken in chat.`

            printMessage(message)
            notified.push(name)
        }

        if (inDebugMode) fs.writeFile(`chat_data/${name}.json`, JSON.stringify(data, null, 4), (err) => { if (err) throw err })
    })
    .catch(err => printMessage(`Error fetching messages for "${name}" -- ${err}`))
}

// event handlers
function onMessageHandler(channel, userdata, message, self) {
    var name = userdata.username

    if (notified.includes(name)) printMessage(`"${name}" is in the marked list but they just sent a message.`)

    if (name === "tpp" && message.includes("badge from pinball")) {
        var winner = message.substring(message.indexOf("@") +1, message.indexOf(" ")).toLowerCase()
        queryAPI(winner)
    } //else if (inDebugMode) queryAPI(userdata.username)
}

// engage
client.on('message', onMessageHandler)
client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
