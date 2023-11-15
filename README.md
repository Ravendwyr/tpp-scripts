# tpp-scripts
My collection of scripts to aid moderation at Twitch Plays Pokémon.

***

## Getting Started

1) Install [Node 16](https://nodejs.org/dist/latest-v16.x/) or newer.

2) Checkout the repository.

    $ git clone https://github.com/Ravendwyr/tpp-scripts.git

3) Install the necessary libraries.

    $ cd tpp-scripts
    $ npm install

4) Obtain an [oauth code](https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=r7apxa1iipuiya961yv7e8gqhb79j0&force_verify=true&redirect_uri=https://twitchapps.com/tokengen/&scope=moderator%3Aread%3Achatters+moderator%3Aread%3Afollowers) from Twitch.

Some of these scripts require your [Twitch App](https://dev.twitch.tv/console/apps)'s Client ID and a linked [oauth code](https://twitchtokengenerator.com) with `moderator:read:chatters` and `moderator:read:followers` permissions in order to access Twitch API endpoints, while others require your [first-party auth-key](chrome://settings/cookies/detail?site=twitch.tv) in order to access Twitch GraphQL.  These keys need to be stored in the provided `.env` file before use.

***

## tpp-botcheck.js

Originally designed as a moderation aid, this script uses Twitch's [Get Chatters endpoint](https://dev.twitch.tv/docs/api/reference/#get-chatters) to scan for and detect bot accounts in the chosen channel's chat room.  The userlist is compared with a list of bots on [TwitchInsights](https://twitchinsights.net/bots) and [CommanderRoot](https://twitch-tools.rootonline.de/blocklist_manager.php) and prints detected bot accounts into the terminal window.  Each account is only printed once to reduce spam.

This script can save user data to `user_data/<username>.json` however this is disabled by default.  It also reads the included `botcheck-safe.txt` and `botcheck-marked.txt` to filter out duplicates and false positives from the output.  Saving user data can be easily enabled by including the `--save-data` argument.

`botcheck-safe.txt` is intended to be a manually maintained list of false positives while `botcheck-marked.txt` is intended to be a manually maintained list of accounts marked as bots in the stream's database.  If the `--ignore-safe` flag is included in the command, the contents of `botcheck-safe.txt` will be ignored. If the `--ignore-marked` flag is included, the contents of `botcheck-marked.txt` will be ignored.  It is not recommended nor necessary to use these flags as they have been left in for debugging purposes.

The script queries the endpoint once every 3 minutes and doesn't stop until terminated.

    $ node tpp-botcheck
    $ node tpp-botcheck --ignore-safe --ignore-marked
    $ node tpp-botcheck --save-data

***

## tpp-pinballcheck.js

This was originaly part of `tpp-botcheck.js` and has been spun off into its own module.  This script is designed to scan for and detect potential bot accounts that are not included in the lists provided by [TwitchInsights](https://twitchinsights.net/bots) or [CommanderRoot](https://twitch-tools.rootonline.de/blocklist_manager.php).  If a prize winner does not follow the channel or has not spoken in chat, their name will be printed into the terminal window.

This script can use the `botcheck-safe.txt` to filter out and ignore false positives.  If the `--ignore-safe` flag is included in the command, the contents of `botcheck-safe.txt` will be ignored.  It is not recommended nor necessary to use this flag as it has been left in for debugging purposes.

Due to the high probability of false positives, usage of this script is **NOT RECOMMENDED**.

    $ node tpp-pinballcheck
    $ node tpp-pinballcheck --ignore-safe --debug
    $ node tpp-pinballcheck --save-data

***

## tpp-inputcheck.js

This quick and dirty script uses [tmi.js](https://www.npmjs.com/package/tmi.js) to connect to a channel and keeps track of how much time has passed between a user's messages.  By default the script monitors every user in chat but when names are included as arguments the script will only focus on the provided names.

The script checks every new message comes in and doesn't stop until terminated.

    $ node tpp-inputcheck
    $ node tpp-inputcheck name1 name2 name3 ...

***

## tpp-getusers.js

Originally designed as a moderation aid, this script uses [tmi.js](https://www.npmjs.com/package/tmi.js) to query the Twitch API to download and save the userdata and profile pictures of ~~almost~~ everyone in the chosen channel's chat room.

User data is saved to `user_data/<username>.json` while their profile pictures are saved to `user_avatars/<username>-<filehash>.png`.  Saving user data is disabled by default but can be easily enabled by including the `--save-data` argument.

The script checks users on inital boot, when a new message comes in, or when a user joins or leaves the chat and doesn't stop until terminated.

    $ node tpp-getusers
    $ node tpp-getusers --save-data

***

## tpp-namecheck.js

This small and simple script will look through any cached userdata files saved by `tpp-botcheck.js` or `tpp-getusers.js` to check to see if any of them contain matching user ID numbers.  If it detects a matching number, it will output all of the usernames that have this ID number to the console to inform of a potential account name change.  If it does not detect any matches, it will fail silently.

This script runs once and terminates itself after it has finished looking through the files.

    $ node tpp-namecheck

***

## tpp-chatarchive.js

Inspired by ~~and blatantly stolen from~~ [@tonywu7's chat archiver](https://github.com/tonywu7/doug-district-public-library/blob/master/util/chat-archiver-v0.1.js), this script will query Twitch's GraphQL for the provided user's entire chat history ~~since records began in late 2017~~ and will attempt to convert it into a human readable format for archival and moderation purposes, sorted chronologically with the most recent messages at the top.

Be warned that the more the user has spoken in chat, the longer it will take and the larger the output file will be.  For instance, a user with 400 messages will only take a few seconds to download a 23Kb file whereas a user with over 135,000 messages will take the best part of 15 minutes to download a 6,700Kb file.  Also note that historic name changes are not provided by Twitch and will not be reflected in the output.

This script runs once and will ~~eventually~~ save the user's chat history to `chat_data/<username>.txt` when it finishes.

    $ node tpp-chatarchive name

***

## tpp-runstatus.js

This queries the TwitchPlaysPokemon API for any active runs and saves the current run status to `run_status/<YYYYMMDD>-<HHMMSS>-<runname>.json`.  If no run is active or if the API returns an error, then no file will be saved and the console window will explain why.

The script checks the API once every 20 seconds and doesn't stop until terminated.

    $ node tpp-runstatus
