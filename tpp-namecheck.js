
// define configuration options
const directory = './user_data/'
const path = require('path')
const fs = require('graceful-fs')

// build our user list
const userIDs = []

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// gather the goods
fs.readdirSync(directory).forEach(file => {
    if (!fs.lstatSync(path.resolve(directory, file)).isDirectory()) {
        fs.readFile(directory+file, 'utf8', (err, data) => {
            if (err) throw err

            var user = JSON.parse(data)
            var id = user.id

            if (userIDs[id]) printMessage(`User ID ${id} clash - ${userIDs[id]} vs ${user.login}`)
            else userIDs[id] = user.login
        })
    }
})
