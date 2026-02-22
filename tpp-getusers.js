
// define configuration options
import 'dotenv/config'
import imghash from 'imghash'
import fs from 'fs'

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// ensure our token is valid
function validateToken(first) {
    if (first) printMessage(`Validating OAuth token...`)

    // https://dev.twitch.tv/docs/authentication/validate-tokens/
    fetch(`https://id.twitch.tv/oauth2/validate`, { method: 'GET', headers: { 'Authorization': `OAuth ${process.env.TWITCH_OAUTH}` }})
    .then(async data => {
        if (data.ok) return await data.json()
        else printMessage(`WARN    during .validateToken() - ${data.status} ${data.statusText}`)
    })
    .then(data => {
        if (data.login && first) {
            if (data.expires_in > 0) printMessage(`OAuth token is valid and will expire on ${new Date(Date.now() + (data.expires_in * 1000))}`)
            else printMessage(`OAuth token is valid and but Twitch did not provide an expiry date.`)
        } else if (data.status == 401) {
            printMessage(`OAuth token is invalid or has expired. Please create a new one and update env file.`)
            setTimeout(process.exit, 1000)
        }
    })
    .catch(err => printMessage(`ERROR   during .validateToken() - ${err}`))
}

// throttle queries. we don't want to thrash the servers too much.
const queue = []
let timer

function addToQueue(name) {
    if (queue.includes(name) || name == "tpp" || name == "tppsimulator" || name == "tppvr") return
    else queue.push(name)

    if (!timer) timer = setInterval(() => { if (queue.length > 0) queryIVR(queue.splice(0, 1)[0]) }, 500)
}

// gather the goods
if (!fs.existsSync("user_avatars")) fs.mkdirSync("user_avatars")

function queryIVR(name) {
    fetch(`https://api.ivr.fi/v2/twitch/user?login=${name}`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
    .then(user => user.json())
    .then(user => {
        if (!user || user.length != 1) return

        // download the user's data
        if (user[0].logo.includes("user-default-pictures")) return

        // download the user's profile pic
        fetch(user[0].logo)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => Buffer.from(arrayBuffer))
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

function queryTwitch(cursor) {
    let pagination = ""

    if (cursor) pagination = `&after=${cursor}`

    fetch(`https://api.twitch.tv/helix/chat/chatters?moderator_id=44322184&broadcaster_id=56648155&first=1000${pagination}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID },
    })
    .then(data => { if (data.ok) return data.json(); else printMessage(`Chatters endpoint returned Error ${data.status} ${data.statusText}`)})
    .then(data => {
        if (!data) return

        for (let i = 0; i < data.data.length; i++) {
            if (data.data[i].user_login != "") addToQueue(data.data[i].user_login)
        }

        if (data.pagination.cursor) setTimeout(() => queryTwitch(data.pagination.cursor), 100)
    })
    .catch(err => printMessage(`Error while downloading chatter list -- ${err}`))
}

// engage
validateToken(true)
setInterval(validateToken, 3600000)

queryTwitch()
setInterval(queryTwitch, 60000)
