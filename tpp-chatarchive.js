
// define configuration options
require('dotenv').config({ quiet: true })

const fetch = require('node-fetch')
const fs = require('fs')

const username = process.argv.slice(2)[0]

if (!username) {
    printMessage("No username provided. Stopping...")
    return
}

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// gather the goods
async function run() {
    function requestTemplate(body) {
        return {
            method: 'POST',
            credentials: 'same-origin',
            mode: 'cors',
            headers: {
                'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                'Authorization': `OAuth ${process.env.GRAPHQL_OAUTH}`,
                'Content-Type': 'text/plain;charset=UTF-8',
                'Client-Integrity': `${process.env.GRAPHQL_INTEGRITY}`,
                'X-Device-Id': `${process.env.GRAPHQL_DEVICEID}`,
            },
            body: JSON.stringify(body),
        }
    }

    async function getUserId() {
        const res = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${username}`, { method: 'GET', headers: { 'Content-Type': 'application/json', 'User-Agent': 'github.com/ravendwyr/tpp-scripts' } })
        const data = (await res.json())[0]
        if (data) return data.id
    }

    function msgFetchTemplate(userId, cursor = null) {
        return requestTemplate([
            {
                operationName: 'ViewerCardModLogsMessagesBySender',
                variables: {
                    senderID: userId,
                    channelID: '56648155',
                    cursor: cursor,
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: '53962d07438ec66900c0265d3e9ec99c4124067ac3a9c718bc29b0b047d1e89c',
                    },
                },
            },
        ])
    }

    async function processPayload(response) {
        const payload = await response.json()
        const data = payload[0]
        return data.data.viewerCardModLogs.messages
    }

    function getCursor(edges) {
        return edges[edges.length - 1].cursor
    }

    const __messages = []
    let cursor = null
    const userId = await getUserId()

    if (userId) {
        printMessage(`Found user ${username} with ID ${userId}. Continuing...`)
    } else {
        printMessage(`Could not locate user ${username} on Twitch. Stopping...`)
        return
    }

    while (true) {
        const req = msgFetchTemplate(userId, cursor)
        const msgs = await processPayload(await fetch('https://gql.twitch.tv/gql', req))
        if (msgs && msgs.edges) {
            __messages.push(...msgs.edges)
            printMessage(`Found ${numberWithCommas(__messages.length)} messages so far...`)
            if (msgs.pageInfo.hasNextPage) cursor = getCursor(msgs.edges)
            else {
                printMessage('End of data stream. Tidying up...')
                break
            }
        } else {
            printMessage('Data stream ended abruptly. Breaking loop...')
            break
        }
    }

    if (__messages.length > 0) {
        if (!fs.existsSync("chat_data")) fs.mkdirSync("chat_data")

        //if (fs.existsSync(`chat_data/${username}-raw.json`)) fs.unlinkSync(`chat_data/${username}-raw.json`)
        //fs.writeFile(`chat_data/${username}-raw.json`, JSON.stringify(__messages, null, 4), err => { if (err) throw err })

        if (fs.existsSync(`chat_data/${username}.txt`)) fs.unlinkSync(`chat_data/${username}.txt`)
        const outputFile = fs.createWriteStream(`chat_data/${username}.txt`)

        for (let line = 0; line < __messages.length; line++) {
            if (__messages[line].node.sentAt) outputFile.write(`${__messages[line].node.sentAt.padEnd(30, ' ')} [${__messages[line].node.sender ? __messages[line].node.sender.login : username}]: ${__messages[line].node.content.text}\n`)
            //if (__messages[line].node.timestamp) outputFile.write(`${__messages[line].node.timestamp.padEnd(30, ' ')} #${__messages[line].node.action} ${__messages[line].node.details.durationSeconds || "infinite"} seconds - ${__messages[line].node.details.reason || "no reason provided"}\n`)
        }

        printMessage('Chat archive saved to file. Stopping...')
    }
}

// engage
run()
