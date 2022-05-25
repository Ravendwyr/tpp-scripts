# tpp-scripts
A collection of scripts that do stuff with Twitch Plays Pokémon API.

***

## Getting Started

To use these scripts, you must first checkout the repository.

    $ git clone https://github.com/Ravendwyr/tpp-scripts.git

Then make sure the necessary libraries are installed.

    $ cd tpp-scripts
    $ npm install

These scripts require a Client ID and Client Secret from a [Twitch App](https://dev.twitch.tv/console) in order to work, as well as an [OAuth Key](https://twitchtokengenerator.com/) with `chat:read` scopes linked to the Twitch App.  These keys need to be stored in the provided `.env` file prior to launching the scripts.

These scripts have been built and tested with [Node 12](https://nodejs.org/dist/latest-v12.x/), however other versions may still work.

***

## tpp-botcheck.js

Originally designed as a moderation aid, this script uses [tmi.js](https://www.npmjs.com/package/tmi.js) to scan for and detect bot accounts in the chosen channel's chat room.  The userlist is compared with a list of bots on [TwitchInsights](https://twitchinsights.net/bots) and [TwitchBotsInfo](https://twitchbots.info/bots) and prints detected bot accounts into the terminal window.  Each account is only printed once to reduce spam.

This script does not save data to the hard-drive, however it does read the included `botcheck-safe.txt` and `botcheck-marked.txt` to filter out false positives from the output.

`botcheck-safe.txt` is intended to be a manually maintained list of false positives while `botcheck-marked.txt` is intended to be a manually maintained list of accounts marked as bots in the stream's database.  If the `--ignore-safe` flag is included in the command, the contents of `botcheck-safe.txt` will be ignored. If the `--ignore-marked` flag is included, the contents of `botcheck-marked.txt` will be ignored. It is not recommended or necessary to use these flags as they are provided mostly for debugging purposes.

The script checks the names on inital boot, when a new message comes in, or when a user joins or leaves the chat and doesn't stop until terminated.

    $ node tpp-botcheck
    $ node tpp-botcheck --ignore-safe --ignore-marked

***

## tpp-inputcheck.js

This quick and dirty script uses [tmi.js](https://www.npmjs.com/package/tmi.js) to connect to a channel and keeps track of how much time has passed between a user's messages.  By default the script monitors every user in chat but when names are included as arguments the script will only focus on the provided names.

The script checks every new message comes in and doesn't stop until terminated.

    $ node tpp-inputcheck
    $ node tpp-inputcheck name1 name2 name3 ...

***

## tpp-getusers.js

Originally designed as a moderation aid, this script uses [tmi.js](https://www.npmjs.com/package/tmi.js) and [node-twitch](https://www.npmjs.com/package/node-twitch) to query the Twitch API to download and save the userdata and profile pictures of ~~almost~~ everyone in the chosen channel's chat room.

User data is saved to `user_data/<username>.json` while their profile pictures are saved to `user_avatars/<username>-<filehash>.png`.  Saving user data is disabled by default but can be easily enabled by removing the comment blocks surrounding the code.

The script checks users on inital boot, when a new message comes in, or when a user joins or leaves the chat and doesn't stop until terminated.

    $ node tpp-getusers

***

## tpp-runstatus.js

This queries the TwitchPlaysPokemon API for any active runs and saves the current run status to `run_status/<run>-<timestamp>.json`.  If no run is active or if the API returns an error, the results are saved as `run_status/unspecified-<timestamp>.json` instead.  If the server itself returns an error (e.g. 404 Page Not Found) then no file will be saved.

The script checks the API once every 20 seconds and doesn't stop until terminated.

    $ node tpp-runstatus
