
// define configuration options
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
    fetch("https://twitchplayspokemon.tv/api/run_status")
        .then(response => response.json())
        .then(json => {
                let data = JSON.stringify(json, null, 4)

                if (!fs.existsSync("run_status")) {
                    fs.mkdirSync("run_status")
                }

                // 'json["game"]' defaults to 'undefined' if the API returns an error or is unavailable
                let fileName = `run_status/${getDateString()}-${json["game"]}.json`

                fs.writeFile(fileName, data, (err) => {
                    if (err) { throw err }

                    printMessage(`run status saved to '${fileName}'`)
                })
        })
        .catch(err => {
            printMessage(err)
        })
}

// our pretty printer
function printMessage(message) {
    const ts = new Date().toLocaleTimeString()
    console.log(`[${ts}] ${message}`)
}

// engage
downloadRunStatus()
setInterval(downloadRunStatus, 20000)
