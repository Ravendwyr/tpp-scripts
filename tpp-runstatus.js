
// define configuration options
const https = require('https')
const fs = require('fs')

let url = "https://twitchplayspokemon.tv/api/run_status"

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
    https.get(url, (response) => {
        let body = ""

        response.on("data", (chunk) => {
            body += chunk
        })

        response.on("end", () => {
            try {
                let json = JSON.parse(body)
                let data = JSON.stringify(json, null, 4)

                if (!fs.existsSync("run_status")) {
                    fs.mkdirSync("run_status")
                }

                // 'json["game"]' defaults to 'undefined' if the API returns an error or is unavailable
                let fileName = `run_status/${getDateString()}-${json["game"]}.json`

                fs.writeFile(fileName, data, (err) => {
                    if (err) { throw err }

                    printMessage(`run status saved to '${fileName}'`)
//                  printMessage(`ratelimit remaining ${response.headers["x-ratelimit-remaining"]}, ratelimit resets at ${response.headers["x-ratelimit-reset"]}`)
                })
            } catch (error) {
                console.error(error.message)
            }
        })
    }).on("error", (error) => {
        console.error(error.message)
    })
}

// our pretty printer
function printMessage(message) {
    const ts = new Date().toLocaleTimeString()
    console.log(`[${ts}] ${message}`)
}

// engage
downloadRunStatus()
setInterval(downloadRunStatus, 15000)
