# This is the human/machine readable list of Mozilla Necko team triagers and dates each one is on duty.

The core is a hand-maintained JSON file [triage.json](triage.json) with list of names and bugzilla emails, and a calendar.

- `"triagers"` root object node holds a map of `"Full Name" -> { data }`.  Right now the `data` object keeps only the bugzilla email in `bzmail` field.
- `"duty-end-dates"` root holds a map of `date -> "Full Name"`, where the `date` is the last day the triager is on duty, inclusive.

If the consumer can use JavaScript, there is [triage.js](triage.js) script file with few helper functions to async-fetch the JSON (`fetchTriage()`) and to get the current triager (`currentTriager(json)`).  Result of `currentTriager` is an object with properties `name`, `till` being a date string YYYY-MM-DD with the ending date, and `bzmail` with the bugzilla email to nag.

And to quickly view the current triage duty, go to [triager.html](https://mozilla-necko.github.io/triage-list/triager.html)
