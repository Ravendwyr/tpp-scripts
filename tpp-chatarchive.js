
// define configuration options
require('dotenv').config()

const fetch = require('node-fetch-retry')
const fs = require('graceful-fs')

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
            },
            body: JSON.stringify(body),
        }
    }

    async function getUserId() {
        let res = await fetch('https://gql.twitch.tv/gql',
            requestTemplate([
                {
                    operationName: 'GetUserID',
                    variables: { login: username, lookupType: 'ACTIVE' },
                    extensions: {
                        persistedQuery: {
                            version: 1,
                            sha256Hash: 'bf6c594605caa0c63522f690156aa04bd434870bf963deb76668c381d16fcaa5',
                        },
                    },
                },
            ])
        )
        let data = (await res.json())[0]
        if (data.data.user) return data.data.user.id
    }

    function msgFetchTemplate(userId, cursor = null) {
        return requestTemplate([
            {
                operationName: 'ViewerCardModLogsMessagesBySender',
                variables: {
                    senderID: userId,
                    channelLogin: 'twitchplayspokemon',
                    cursor: cursor,
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: '4186e5c334c3cf17faf912a172aca6b445374b0321eb85a70fb06a81e3c7cf1a',
                    },
                },
            },
        ])
    }

    async function processPayload(response) {
        let payload = await response.json()
        let data = payload[0]
        return data.data.channel.modLogs.messagesBySender.edges
    }

    function getCursor(edges) {
        return edges[edges.length - 1].cursor
    }

    var __messages = []
    let cursor = null
    let userId = await getUserId()

    if (userId) {
        printMessage(`Found user ${username} with ID ${userId}. Continuing...`)
    } else {
        printMessage(`Could not locate user ${username} on Twitch. Stopping...`)
        return
    }

    while (true) {
        let req = msgFetchTemplate(userId, cursor)
        let msgs = await processPayload(await fetch('https://gql.twitch.tv/gql', req))
        __messages.push(...msgs)
        try {
            cursor = getCursor(msgs)
        } catch (e) {
            printMessage('End of data stream. Tidying up...')
            break
        }
        printMessage(`Found ${numberWithCommas(__messages.length)} messages so far...`)
    }

    if (__messages.length > 0) {
        if (!fs.existsSync("chat_data")) fs.mkdirSync("chat_data")

        //if (fs.existsSync(`chat_data/${username}-raw.json`)) fs.unlinkSync(`chat_data/${username}-raw.json`)
        //fs.writeFile(`chat_data/${username}-raw.json`, JSON.stringify(__messages, null, 4), err => { if (err) throw err })

        if (fs.existsSync(`chat_data/${username}.txt`)) fs.unlinkSync(`chat_data/${username}.txt`)
        const outputFile = fs.createWriteStream(`chat_data/${username}.txt`, { flags: 'a' })

        for (let line = 0; line < __messages.length; line++) {
            if (__messages[line].node.sentAt) outputFile.write(`${__messages[line].node.sentAt.padEnd(30, ' ')} [${__messages[line].node.sender.login}]: ${__messages[line].node.content.text}\n`)
            if (__messages[line].node.timestamp) outputFile.write(`${__messages[line].node.timestamp.padEnd(30, ' ')} #${__messages[line].node.action} ${__messages[line].node.details.durationSeconds || "infinite"} seconds - ${__messages[line].node.details.reason || "no reason provided"}\n`)
        }

        printMessage('Chat archive saved to file. Stopping...')
    }
}

// engage
run()
