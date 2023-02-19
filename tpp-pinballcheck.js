
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

        data.split(/\n/g).forEach(row => { if (row != "") safeList.push(row.toLowerCase().replace("\r", "").trim()) })
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

    await fetch(`https://api.ivr.fi/v2/twitch/user?login=${name}`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s data...`), headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(resp => resp.json())
    .then(user => {
        if (!user || user.length != 1) return
        if (isSavingData) fs.writeFile(`user_data/${name}.json`, JSON.stringify(user[0], null, 4), (err) => { if (err) throw err })

        winnerID = user[0].id
    })
    .catch(err => printMessage(`Error fetching data for "${name}" -- ${err}`))

    if (safeList.includes(name) || notified.includes(name)) return

    await fetch(`https://api.twitch.tv/helix/users/follows?from_id=${winnerID}&to_id=56648155`, { method: 'GET', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s follows...`), headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID } })
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
            'channelLogin': 'twitchplayspokemon',
            'includeAutoModCaughtMessages': true,
        },
        'extensions': {
            'persistedQuery': {
                'version': 1,
                'sha256Hash': '437f209626e6536555a08930f910274528a8dea7e6ccfbef0ce76d6721c5d0e7'
            },
        },
    }]

    await fetch(`https://gql.twitch.tv/gql`, {
        method: 'POST', retry: 3, pause: 1000, silent: true, callback: retry => printMessage(`Retrying ${name}'s message history...`),
        body: JSON.stringify(body), headers: { 'Authorization': `OAuth ${process.env.GRAPHQL_OAUTH}`, 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko' }
    })
    .then(resp => resp.json())
    .then(data => {
        if (data && data[0]["data"]["channel"]["modLogs"]["messagesBySender"]["edges"].length == 0) {
            var message

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
