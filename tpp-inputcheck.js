
// define configuration options
import tmi from '@tmi.js/chat'

const cache = {}
const focus = process.argv.slice(2)

// create a client with our options
const client = new tmi.Client({ channels: [ "twitchplayspokemon" ] })

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onMessageHandler(payload) {
    const { channel, user, message } = payload
    const name = user.login

    if (name == "tpp" || name == "tppsimulator" || name == "tppvr") return
    if (focus.length > 0 && !focus.includes(name)) return

    const currTime = new Date().getTime()

    if (cache[name]) {
        const prevTime = cache[name]
        const millis  = currTime - prevTime
        const minutes = Math.floor((millis / 60000))
        const seconds = ((millis % 60000) / 1000)

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
client.connect()
