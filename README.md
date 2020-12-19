# tpp-scripts
A collection of scripts that do stuff with Twitch Plays Pokémon API.

***

## tpp-runstatus.js

This queries the TwitchPlaysPokemon API for any active runs and saves the current run status to `run_status/<run>-<timestamp>.json`.  If no run is active or if the API returns an error, the results are saved as `run_status/unspecified-<timestamp>.json` instead.  The script checks the API every 15 seconds and doesn't stop until terminated.

To start, type `node tpp-runstatus.js` in your Terminal of choice.

Tested with Node 12.20, however other versions should still work.