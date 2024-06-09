
// define configuration options
require('dotenv').config()

const args = process.argv.slice(2)

const fetch = require('node-fetch')
const tmi = require('tmi.js')
const fs = require('fs')

// create a client with our options
const client = new tmi.Client({
    identity: { username: "justinfan1986", password: "kappa" },
    channels: [ "twitchplayspokemon" ],
})

function addToList(name) {
    if (/^\w+$/.test(name) && !name.startsWith("_") && !botList.includes(name)) botList.push(name)
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function checkPayload(data) {
    if (!data.ok) printMessage(`WARN  - ${data.url} returned Error ${data.status} ${data.statusText}`)
    return data.text()
}

// ensure our token is valid
function validateToken(print) {
    if (print) printMessage(`Validating OAuth token...`)

    // https://dev.twitch.tv/docs/authentication/validate-tokens/
    fetch(`https://id.twitch.tv/oauth2/validate`, { method: 'GET', headers: { 'Authorization': `OAuth ${process.env.TWITCH_OAUTH}` }})
    .then(data => data.json())
    .then(data => {
        if (data.login && print) printMessage(`OAuth token is valid and will expire on ${new Date(Date.now() + (data.expires_in * 1000))}`)
        else if (data.status == 401) {
            printMessage(`OAuth token is invalid or has expired. Please create a new one and update env file.`)
            setTimeout(process.exit, 1000)
        }
    })
    .catch(err => printMessage(`Error while checking token validity -- ${err}`))
}

// build our bot list
const safeList = []
const notified = []
const botList  = []

if (!args.includes("--ignore-safe")) {
    fs.readFile("botcheck-safe.txt", 'utf8', (err, data) => {
        if (err) throw err

        data.split(/\r?\n/i).forEach(row => { if (row != "") safeList.push(row.toLowerCase().trim()) })
    })
}

if (!args.includes("--ignore-marked")) {
    fs.readFile("botcheck-marked.txt", 'utf8', (err, data) => {
        if (err) throw err

        data.split(/\r?\n/i).forEach(row => { if (row != "") notified.push(row.toLowerCase().trim()) })
    })
}

function beginScan() {
    printMessage(`There are ${numberWithCommas(botList.length)} names in the master bot list.`)
    printMessage(`There are ${numberWithCommas(notified.length)} names in the marked list.`)
    printMessage(`There are ${numberWithCommas(safeList.length)} names in the safe list.`)

    queryTwitch()
    setInterval(queryTwitch, 30000)
}

function fetchFromTwitchInsights() {
    fetch(`https://api.twitchinsights.net/v1/bots/all`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(data => data.json())
    .then(data => {
        data["bots"].forEach(row => {
            const name = row[0].toLowerCase().trim()
            addToList(name)
        })

        printMessage("Finished downloading from TwitchInsights.")
        beginScan()
    })
    .catch(err => printMessage(`Error while downloading TwitchInsights list -- ${err}`))
}

function fetchFromGitHub() {
    Promise.all([
        fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/arrowgent/Twitchtv-Bots-List/main/goodbot.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/paret0x/Twitch-Bot-Finder/main/botlist.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/paret0x/Twitch-Bot-Finder/main/whitelist.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/fake_scam_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/follower_bot_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/greylisted_bots.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/hate_troll_list_0_g.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/hate_troll_list_h_m.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/hate_troll_list_n_z.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/mad_tos_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/porn_bot_acc_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/security_ban_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/seller_advertising_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/spam_bot_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/streamsniper_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/viewer_bot_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/isdsdataarchive/twitch_ban_lists/main/whitelisted_bots.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/Even%20more%20bots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/LATEST').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/SelfPromoBots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/asd').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/botraid_list.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/bots%20part%202').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/bots2.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/bruh').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/bruhmoment').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/caleb').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/common-bots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/couple_o_hosses').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/every_bot_ever').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/herewegoagain').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/idek').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/literally-every-lurkbot').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/more-bots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/new%20bots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/newbots').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/new-hate-raids').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/nuh-uh').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/papa').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/script-kiddies-2-ban-hammer-boogaloo').then(checkPayload),
        fetch('https://raw.githubusercontent.com/16-ATLAS-16/botlist/main/why_god').then(checkPayload),
        fetch('https://raw.githubusercontent.com/Maouniel/temp/main/TwitchChatFilter/.bots.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/nugrunonly/banBot-v2/main/binarybouncer-main/banlist.txt').then(checkPayload),
        fetch('https://raw.githubusercontent.com/Twitchmods/hateraid-master.txt/main/Hater%20Master.txt').then(checkPayload),
    ])
    .then(data => {
        // 'data' is an array and its .length is equivalent to the number number of queries in .all() above
        data.forEach(names => {
            names.split(/\r?\n/i).forEach(row => {
                const name = row.toLowerCase().trim()
                addToList(name)
            })
        })

        printMessage("Finished downloading from GitHub.")
        fetchFromTwitchInsights()
    })
    .catch(err => printMessage(`Error while downloading GitHub list -- ${err}`))
}

function fetchFromFrankerFaceZ() {
    fetch(`https://api.frankerfacez.com/v1/badge/bot`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(data => data.json())
    .then(data => {
        data["users"][2].forEach(row => {
            const name = row.toLowerCase().trim()
            addToList(name)
        })

        printMessage("Finished downloading from FrankerFaceZ.")
        fetchFromGitHub()
    })
    .catch(err => printMessage(`Error while downloading FrankerFaceZ's list -- ${err}`))
}

function fetchFromPaauulli() {
    fetch(`https://api.paauulli.me/bot/bots`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(data => data.json())
    .then(data => {
        data.forEach(row => {
            const name = row.Name.toLowerCase().trim()
            addToList(name)
        })

        printMessage("Finished downloading from Paauulli.")
        fetchFromFrankerFaceZ()
    })
    .catch(err => printMessage(`Error while downloading Paauulli's list -- ${err}`))
}

// gather the goods
function queryTwitch(cursor) {
    let pagination = ""
    if (cursor) pagination = `&after=${cursor}`

    fetch(`https://api.twitch.tv/helix/chat/chatters?moderator_id=44322184&broadcaster_id=56648155&first=1000${pagination}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID },
    })
    .then(data => { if (data.ok) return data.json(); else printMessage(`Helix endpoint returned Error ${data.status} ${data.statusText}`)})
    .then(data => {
        if (!data) return

        for (let i = 0; i < data.data.length; i++) {
            const id = data.data[i].user_id
            const name = data.data[i].user_login

            if (safeList.includes(name) || notified.includes(name)) continue

            else if (botList.includes(name)) {
                printMessage(`"${name}" is in the master bot list. Please verify before marking.`)
                notified.push(name)
            }
        }

        if (data.pagination.cursor) setTimeout(() => queryTwitch(data.pagination.cursor), 100)
    })
    .catch(err => printMessage(`Error while downloading chatter list -- ${err}`))
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// event handlers
function onMessageHandler(channel, userdata, message, self) {
    const name = userdata.username
    const id = userdata["user-id"]

    if (safeList.includes(name)) return
    else if (notified.includes(name)) printMessage(`"${name}" is marked as a bot but they just sent a message.`)
    else if (botList.includes(name))  printMessage(`"${name}" is in the master bot list but they just sent a message.`)
}

// engage
validateToken(true)
setInterval(validateToken, 3600000, false)

fetchFromPaauulli()

client.on('message', onMessageHandler)
client.connect().catch(err => printMessage(`Unable to connect to chat. ${err}`))
