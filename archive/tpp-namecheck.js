
// define configuration options
const directory = './user_data/'
const fs = require('fs')

// build our user list
const userIDs = []

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// gather the goods
fs.readdir(directory, (err, files) => {
    if (err) throw err

    files.forEach((file, i) => {
        setTimeout(() => {
        fs.readFile(directory+file, 'utf8', (err, data) => {
            if (err) throw err

            let user

            try {
                user = JSON.parse(data)
            } catch (err) {
                printMessage(`${file} could not be parsed -- ${err}`)
                return
            }

            const login = user.login
            const id = user.id

            if (userIDs[id]) printMessage(`User ID ${id} clash - ${userIDs[id]} vs ${login}`)
            else userIDs[id] = login
        })
        // need a small delay to prevent "too many open files" and "maximum call stack size exceeded" errors
        }, i*2)
    })
})
