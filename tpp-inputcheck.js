
// define configuration options
require('dotenv').config({ path: './.env' })

const tmi = require('tmi.js')

const cache = {}
const focus = process.argv.slice(2)

// create a client with our options
const client = new tmi.client({
    identity: { username: process.env.TWITCH_USERNAME, password: process.env.TWITCH_OAUTH },
    channels: [ "twitchplayspokemon" ],
})

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onConnectedHandler(address, port) {
    printMessage(`Connected to ${address}:${port}`)
}

function onMessageHandler(channel, userdata, message, self) {
    const name = userdata.username

    if (name === "tpp" || name === "tppsimulator") return
    if (focus.length > 0 && !focus.includes(name)) return

    var currTime = new Date().getTime()
    var prevTime

    if (cache[name]) {
        prevTime = cache[name]

        var millis  = currTime - prevTime
        var minutes = Math.floor((millis / 60000))
        var seconds = ((millis % 60000) / 1000)

        if (minutes > 0) {
            printMessage(`${name}'s last message was ${minutes} minutes and ${seconds} seconds ago.`)
        } else {
            printMessage(`${name}'s last message was ${seconds} seconds ago.`)
        }
    }

    cache[name] = currTime
}

// engage
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)
client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
