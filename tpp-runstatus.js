
// define configuration options
require('dotenv').config({ quiet: true })

const fetch = require('node-fetch')
const fs = require('fs')

// check the time
function getDateString() {
    const date   = new Date()

    const year   =    date.getFullYear()
    const month  = `${date.getMonth() + 1}`.padStart(2, '0')
    const day    = `${date.getDate()}`.padStart(2, '0')
    const hour   = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    const second = `${date.getSeconds()}`.padStart(2, '0')

    return `${year}${month}${day}-${hour}${minute}${second}`
}

// gather the goods
function downloadRunStatus() {
    fetch("https://twitchplayspokemon.tv/api/run_status", { method: "GET", headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts', 'Client-ID': process.env.TWITCH_CLIENTID, 'OAuth-Token': process.env.TWITCH_OAUTH } })
    .then(data => { if (data.ok) return data.json(); else printMessage(`no run status available (Error ${data.status} ${data.statusText})`)})
    .then(data => {
        if (!data) return
        if (!fs.existsSync("run_status")) fs.mkdirSync("run_status")

        const fileName = `run_status/${getDateString()}-${data["game"] ? data["game"].replace(/[^a-z0-9]/gi, "") : "undefined"}.json`

        fs.writeFile(fileName, JSON.stringify(data, null, 4), (err) => {
            if (err) throw err

            printMessage(`run status saved to '${fileName}'`)
        })
    })
    .catch(err => printMessage(err))
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// engage
downloadRunStatus()
setInterval(downloadRunStatus, 20000)
