
// define configuration options
const tmi = require('tmi.js')

const cache = {}
const focus = process.argv.slice(2)

// create a client with our options
const client = new tmi.Client({
    identity: { username: "justinfan1986", password: "kappa" },
    channels: [ "twitchplayspokemon" ],
})

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onMessageHandler(channel, userdata, message, self) {
    const name = userdata.username

    if (name === "tpp" || name === "tppsimulator") return
    if (focus.length > 0 && !focus.includes(name)) return

    const currTime = new Date().getTime()
    let prevTime

    if (cache[name]) {
        prevTime = cache[name]

        let millis  = currTime - prevTime
        let minutes = Math.floor((millis / 60000))
        let seconds = ((millis % 60000) / 1000)

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
client.connect().catch(() => printMessage(`Unable to connect to chat. Please confirm your oauth token is correct.`))
