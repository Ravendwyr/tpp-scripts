# tpp-scripts archive
A collection of scripts that have have outlived their usefulness but are kept for posperity and archival purposes.

***

## tpp-namecheck.js

This small and simple script will look through any cached userdata files saved by `tpp-botcheck.js` or `tpp-getusers.js` to check to see if any of them contain matching user ID numbers.  If it detects a matching number, it will output all of the usernames that have this ID number to the console to inform of a potential account name change.  If it does not detect any matches, it will fail silently.

Reason for archival: made redundant by `tpp-chatterdb` and changes to `tpp-botcheck`

***

## tpp-pinballcheck.js

This was originaly part of `tpp-botcheck.js` and has been spun off into its own module.  This script is designed to scan for and detect potential bot accounts that are not included in the lists provided by [TwitchInsights](https://twitchinsights.net/bots) or [CommanderRoot](https://twitch-tools.rootonline.de/blocklist_manager.php).  If a prize winner does not follow the channel or has not spoken in chat, their name will be printed into the terminal window.

This script can use the `botcheck-safe.txt` to filter out and ignore false positives.  If the `--ignore-safe` flag is included in the command, the contents of `botcheck-safe.txt` will be ignored.  It is not recommended nor necessary to use this flag as it has been left in for debugging purposes.

Reason for archival: made redundant by `tpp-chatterdb`
