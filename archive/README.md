# tpp-scripts archive
A collection of scripts that have have outlived their usefulness but are kept for posperity and archival purposes.

***

## tpp-namecheck.js

This small and simple script will look through any cached userdata files saved by `tpp-botcheck.js` or `tpp-getusers.js` to check to see if any of them contain matching user ID numbers.  If it detects a matching number, it will output all of the usernames that have this ID number to the console to inform of a potential account name change.  If it does not detect any matches, it will fail silently.

Reason for archival: made redundant by `tpp-chatterdb` and changes to `tpp-botcheck`

