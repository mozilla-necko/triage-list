const fs = require('fs');

const help_string =
  `Usage: npm run <command> -- [arguments]
commands
  * update: automatically extends the json calendar with triagers using the default list, adds only one cycle
  * exempt -- <date>: removes a triager on duty at the specified <date> from the calendar and shifts all triagers
  * prepush: updates the ICS generated file with data from the json calendar (called automatically as part of push)
  * push: pushes the changes to the repo and makes them public, refreshes the ics file as well`;

const TRIAGE_JSON_FILE = "triage.json";
const TRIAGE_ICAL_FILE = "necko-triage.ics";
const FALLBACK_DATE = "2035-01-01";
const FALLBACK_TRIAGER = "Fallback";
const CYCLE_LENGTH_DAYS = 7;
const DAY_TO_MS = 24 * 60 * 60 * 1000;
const CYCLE_LENGTH_MS = CYCLE_LENGTH_DAYS * DAY_TO_MS;

function readTriage() {
  let data = fs.readFileSync(TRIAGE_JSON_FILE);
  let triage = JSON.parse(data);
  return {
    triage,
    triagers: triage.triagers,
    duties: triage["duty-end-dates"]
  };
}

function writeTriage(json) {
  let data = JSON.stringify(json, undefined, "  ");
  fs.writeFileSync(TRIAGE_JSON_FILE, data);
}

function nextTriager(triagers, current_triager) {
  let names = Object.keys(triagers);
  let index = names.findIndex(t => t === current_triager);
  if (index < 0) {
    throw `\n**** FATAL: duty-end-dates refers an unexisting triager '${current_triager}'\n`;
  }
  
  // exclude the fallback entry
  let max = names.length - 1;
  ++index;
  if (index >= max) {
    index = 0;
  }

  return names[index];
}

function commandUpdate() {
  let { triage, triagers, duties } = readTriage();

  let last_date = Object.keys(duties)
    .sort()
    .filter(date => date !== FALLBACK_DATE)
    .slice(-1);
  if (!last_date) {
    throw "\n**** UNEXPECTED: The duty calendar is empty\n";
  }

  // remove...
  delete duties[FALLBACK_DATE];

  [last_date] = last_date;
  let last_triager = duties[last_date];
  let next_triager = last_triager;
  let next_date_ms = new Date(last_date).getTime();

  do {
    next_date_ms += CYCLE_LENGTH_MS;
    next_triager = nextTriager(triagers, next_triager);

    let date = new Date(next_date_ms).toISOString().replace(/T.*$/, "");
    duties[date] = next_triager;
    console.log(`Added: until ${date} duty ${next_triager}`);
  } while (next_triager !== last_triager);

  // ...and readd to keep the list kinda sorted.
  duties[FALLBACK_DATE] = FALLBACK_TRIAGER;

  writeTriage(triage);
  console.log("\nDon't forget to run 'npm run push' to publish the changes\n");
}

function commandPrepush() {
  const { triage, triagers, duties } = readTriage();
  
  const ical = require('ical-toolkit');
  let builder = ical.createIcsFileBuilder();

  builder.calname = "Necko Triage";
  builder.timezone = "UTC";
  builder.tzid = "UTC";
  builder.additionalTags = {
    'REFRESH-INTERVAL': 'VALUE=DURATION:P1H',
    'X-WR-CALDESC': 'Necko Triage'
  };

  for (let duty_date in duties) {
    if (duty_date === FALLBACK_DATE) {
      continue;
    }

    let duty_triager = duties[duty_date];
    // Make the last day inclusive
    duty_date = new Date(duty_date).getTime() + DAY_TO_MS;
    builder.events.push({
      start: new Date(duty_date - CYCLE_LENGTH_MS),
      end: new Date(duty_date),
      summary: `Necko triager: ${duty_triager}`,
      allDay: true,
    });
  }

  let data = builder.toString();
  fs.writeFileSync(TRIAGE_ICAL_FILE, data);
  console.log(`Updated ${TRIAGE_ICAL_FILE}`);
}

function commandExempt(exempt_date) {
  let { triage, triagers, duties } = readTriage();
  if (!(exempt_date in duties)) {
    throw `\n**** ERROR: The end date '${exempt_date}' not found in the duty list\n`;
  }

  console.log(`Removing '${duties[exempt_date]}' on duty till ${exempt_date} from the duty list`);
  
  exempt_date = new Date(exempt_date);
  let dates_to_shift = Object.keys(duties).filter(date => {
    return new Date(date).getTime() >= exempt_date;
  }).sort();

  for (
    let date = dates_to_shift.shift();
    date !== FALLBACK_DATE;
    date = dates_to_shift.shift()
  ) {
    let next_date = dates_to_shift[0];
    if (next_date === FALLBACK_DATE) {
      delete duties[date];
    } else {
      duties[date] = duties[next_date];
    }
  }

  writeTriage(triage);
}

let args = process.argv.slice(2);
let command = args.shift();

switch (command) {
  case "update":
    commandUpdate();
    break;
  case "exempt":
    commandExempt(args[0]);
    break;
  case "prepush":
    commandPrepush();
    break;
  default:
    console.log(help_string);
}
