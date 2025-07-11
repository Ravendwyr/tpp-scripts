
// define configuration options
require('dotenv').config({ quiet: true })

const { JsonDB, Config } = require('node-json-db')
const userDB = new JsonDB(new Config('db-users', false, true, '/'))

const fetch = require('node-fetch')
const fs = require('fs')

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// ensure our token is valid
function validateToken(print) {
    if (print) printMessage(`Validating OAuth token...`)

    // https://dev.twitch.tv/docs/authentication/validate-tokens/
    fetch(`https://id.twitch.tv/oauth2/validate`, { method: 'GET', headers: { 'Authorization': `OAuth ${process.env.TWITCH_OAUTH}` }})
    .then(data => data.json())
    .then(data => {
        if (data.login && print) {
            if (data.expires_in > 0) printMessage(`OAuth token is valid and will expire on ${new Date(Date.now() + (data.expires_in * 1000))}`)
            else printMessage(`OAuth token is valid and but Twitch did not provide an expiry date.`)
        } else if (data.status == 401) {
            printMessage(`OAuth token is invalid or has expired. Please create a new one and update env file.`)
            setTimeout(process.exit, 1000)
        }
    })
    .catch(err => printMessage(`Error while checking token validity -- ${err}`))
}

// build our databases
async function addToDatabase(array, skip) {
    const user_id = array.user_id
    const user_login = array.user_login

    const result = await userDB.getObjectDefault(`/${user_id}`, "user doesn't exist")

    if (result == "user doesn't exist") {
        // new user to the database
        userDB.push(`/${user_id}`, { "user_login": user_login, "time_in_chat": 0, "last_spoke": "", "last_seen": new Date().toISOString() })
    } else {
        // user exists in the database; update their time_in_chat, when they were last_seen, and check when they last_spoke
        if (!skip) userDB.push(`/${user_id}/time_in_chat`, result.time_in_chat + 5)

        userDB.push(`/${user_id}/last_seen`, new Date().toISOString())

        if (result.user_login != user_login) {
            printMessage(`${result.user_login} has changed their name to ${user_login}`)

            userDB.push(`/${user_id}/previous_login`, result.user_login)
            userDB.push(`/${user_id}/user_login`, user_login)
        }

        const body = [{
            operationName: 'ViewerCardModLogsMessagesBySender',
            variables: {
                senderID: user_id,
                channelID: '56648155',
            },
            extensions: {
                persistedQuery: {
                    version: 1,
                    sha256Hash: '53962d07438ec66900c0265d3e9ec99c4124067ac3a9c718bc29b0b047d1e89c',
                },
            },
        }]

        fetch(`https://gql.twitch.tv/gql`, {
            method: 'POST', body: JSON.stringify(body), headers: {
                'Authorization': `OAuth ${process.env.GRAPHQL_OAUTH}`, 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
                'Client-Integrity': `${process.env.GRAPHQL_INTEGRITY}`, 'X-Device-Id': `${process.env.GRAPHQL_DEVICEID}`,
            }
        })
        .then(async data => {
            if (data.ok) return await data.json()
            else printMessage(`GQL endpoint returned Error ${data.status} ${data.statusText} for ${user_login}`)
        })
        .then(data => {
            if (!data) return

            if (data[0]?.data?.viewerCardModLogs?.messages?.edges?.length > 0) {
                let sentAt = ""

                if (data[0].data.viewerCardModLogs.messages.edges[0].node.sentAt) sentAt = new Date(data[0].data.viewerCardModLogs.messages.edges[0].node.sentAt).toISOString()
                else if (data[0].data.viewerCardModLogs.messages.edges[0].node.timestamp) sentAt = new Date(data[0].data.viewerCardModLogs.messages.edges[0].node.timestamp).toISOString()
                else fs.writeFile(`dist/chatdebug-${user_login}.txt`, JSON.stringify(data, null, 4), err => { if (err) throw err })

                userDB.push(`/${user_id}/last_spoke`, sentAt)
            } //else fs.writeFile(`dist/rawchat-${user_login}.txt`, JSON.stringify(data, null, 4), err => { if (err) throw err })
        })
        .catch(err => printMessage(`ERROR fetching messages for ${user_login} -- ${err}`))
    }
}

// gather the goods
function queryTwitch(cursor, skip) {
    let pagination = ""
    if (cursor) pagination = `&after=${cursor}`

    fetch(`https://api.twitch.tv/helix/chat/chatters?moderator_id=44322184&broadcaster_id=56648155&first=1000${pagination}`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${process.env.TWITCH_OAUTH}`, 'Client-Id': process.env.TWITCH_CLIENTID },
    })
    .then(data => { if (data.ok) return data.json(); else printMessage(`Chatters endpoint returned Error ${data.status} ${data.statusText}`)})
    .then(data => {
        if (!data) return

        for (let i = 0; i < data.data.length; i++) {
            if (data.data[i].user_login != "") addToDatabase(data.data[i], skip)
            if (i+1 == data.data.length) setTimeout(() => userDB.save(), 5000)
        }

        if (data.pagination.cursor) setTimeout(() => queryTwitch(data.pagination.cursor, skip), 100)
    })
    .catch(err => printMessage(`Error while downloading chatter list -- ${err}`))
}

// engage
userDB.load()

validateToken(true)
setInterval(validateToken, 3600000, false)

queryTwitch(null, true)
setInterval(queryTwitch, 300000, null, false)
