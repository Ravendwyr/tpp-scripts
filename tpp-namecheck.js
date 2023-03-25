
// define configuration options
const directory = './user_data/'
const fs = require('graceful-fs')

// build our user list
const userIDs = []

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// gather the goods
fs.readdir(directory, (err, files) => {
    if (err) throw err
    else files.forEach(file => {
        fs.readFile(directory+file, 'utf8', (err, data) => {
            if (err) throw err

            var user = JSON.parse(data)
            var id = user.id

            if (userIDs[id]) printMessage(`User ID ${id} clash - ${userIDs[id]} vs ${user.login}`)
            else userIDs[id] = user.login
        })
    })
})
