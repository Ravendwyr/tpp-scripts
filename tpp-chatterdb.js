
// define configuration options
require('dotenv').config()

const { JsonDB, Config } = require('node-json-db')
const userDB = new JsonDB(new Config('db-users', true, true, '/'))

const fetch = require('node-fetch-retry')
const fs = require('graceful-fs')

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// build our databases
async function addToDatabase(array, skip) {
    const user_id = array.user_id
    const user_login = array.user_login

    const result = await userDB.getObjectDefault(`/${user_id}`, "user doesn't exist")

    if (result == "user doesn't exist") {
        // new user to the database
        userDB.push(`/${user_id}`, { "user_login": user_login, "time_in_chat": 0, "spoken_in_chat": false })
    } else {
        // user exists in the database; update their time_in_chat and check if they've spoken_in_chat
        if (!skip) userDB.push(`/${user_id}/time_in_chat`, result.time_in_chat + 15)

        if (result.spoken_in_chat == false) {
            // no need to spam GQL with requests if we know they've spoken at least once.
            const body = [{
                operationName: 'ViewerCardModLogsMessagesBySender',
                variables: {
                    senderID: user_id,
                    channelID: '56648155',
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: 'df5469842de03018009ab81c5ae998a0007dee989a510a2b66720f672d3119af',
                    },
                },
            }]

            fetch(`https://gql.twitch.tv/gql`, {
                method: 'POST', retry: 3, pause: 1000, silent: true, body: JSON.stringify(body),
                headers: {
                    'Authorization': `OAuth ${process.env.GRAPHQL_OAUTH}`, 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                    'Client-Integrity': `${process.env.GRAPHQL_INTEGRITY}`, 'X-Device-Id': `${process.env.GRAPHQL_DEVICEID}`,
                }
            })
            .then(data => data.json())
            .then(data => {
                if (data[0].data.viewerCardModLogs.messages.code) {
                    // a server error occurred. do nothing.
                    //fs.writeFile(`chatcode-${user_login}.json`, JSON.stringify(data, null, 4), err => { if (err) throw err })
                } else if (data[0].data.viewerCardModLogs.messages.edges) {
                    // this is done on purpose to prevent the script from flooding the directory with unneeded files.
                    if (data[0].data.viewerCardModLogs.messages.edges.length > 0) {
                        // user has spoken, mark down as such.
                        userDB.push(`/${user_id}/spoken_in_chat`, true)
                    }
                } else {
                    // an unhandled exception occurred.
                    fs.writeFile(`chaterror-${user_login}.json`, JSON.stringify(data, null, 4), err => { if (err) throw err })
                }
            })
            .catch(err => printMessage(`ERROR fetching messages for ${user_login} -- ${err}`))
        }
    }
}

// gather the goods
function queryTwitch(cursor, skip) {
    let pagination = ""
    if (cursor) pagination = `&after=${cursor}`

    fetch(`https://api.twitch.tv/helix/chat/chatters?moderator_id=44322184&broadcaster_id=56648155&first=1000${pagination}`, {
        method: 'GET', retry: 3, pause: 1000, silent: true,
        headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID },
    })
    .then(data => { if (data.ok) return data.json(); else printMessage(`Chatters endpoint returned Error ${data.status} ${data.statusText}`)})
    .then(data => {
        if (!data) return

        for (let i = 0; i < data.data.length; i++) {
            if (data.data[i].user_login != "") addToDatabase(data.data[i], skip)
            //else console.log(data.data[i])
        }

        if (data.pagination.cursor) setTimeout(() => queryTwitch(data.pagination.cursor, skip), 100)
    })
    .catch(err => printMessage(`Error while downloading chatter list -- ${err}`))
}

// engage
queryTwitch(null, true)
setInterval(queryTwitch, 900000, null, false)
