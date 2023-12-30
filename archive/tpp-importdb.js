
// define configuration options
require('dotenv').config()

const { JsonDB, Config } = require('node-json-db')
const userDB = new JsonDB(new Config('db-users', false, true, '/'))
const fs = require('fs')

// our pretty printer
function printMessage(message) {
    console.log(new Date().toLocaleTimeString(), message)
}

// do the thing
const directory = './user_data/'

fs.readdir(directory, (err, files) => {
    if (err) throw err

    printMessage(`Beginning scan...`)
    files.forEach((file, index, array) => {
        setTimeout(() => {
            fs.readFile(directory+file, 'utf8', async (err, data) => {
                if (err) throw err

                let user

                try {
                    user = await JSON.parse(data)
                } catch (err) {
                    printMessage(`${file} could not be parsed -- ${err}`)
                    return
                }

                const login = user.login
                const id = user.id

                const result = await userDB.getObjectDefault(`/${id}`, "user doesn't exist")

                if (result == "user doesn't exist") {
                    // user is new to the database, add their details.
                    userDB.push(`/${id}`, { "user_login": login, "time_in_chat": 0, "last_spoke": "" })
                } else {
                    // user already exists in the database, await further instructions.
                }

                if (index + 1 === array.length) {
                    printMessage(`End of loop. Saving...`)
                    userDB.save()
                }
            })

        // need a small delay to prevent "too many open files" and "maximum call stack size exceeded" errors
        }, index*2)
    })
})
