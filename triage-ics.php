<?php
require_once('ical/zapcallib.php');

const SOURCEDOMAIN = "mozilla-necko.github.io";
const JSONURL = "https://" . SOURCEDOMAIN . "/triage-list/triage.json";

$triageJSON = file_get_contents(JSONURL);

if ($triageJSON === FALSE) {
  header('503 Unavailable');
  exit('Request for ' . JSONURL . ' failed');
}

$triageData = json_decode($triageJSON);

if ($triageData === NULL) {
  header('500 JSON Error');
  exit('JSON can\'t be parsed');
}

$dates = $triageData->{"duty-end-dates"};

$icalobj = new ZCiCal();
$icalobj->curnode->addNode(new ZCiCalDataNode("X-WR-CALNAME:Necko Triage"));
$icalobj->curnode->addNode(new ZCiCalDataNode("X-WR-CALDESC:Necko Triage"));
$icalobj->curnode->addNode(new ZCiCalDataNode("X-WR-TIMEZONE:UTC"));
$icalobj->curnode->addNode(new ZCiCalDataNode("REFRESH-INTERVAL;VALUE=DURATION:P1H"));

$beginDate = FALSE;

foreach ($dates as $endDate => $triager) {
  if (preg_match("/^Fallback/", $triager)) {
    // Ignore the fallback ending entry.
    break;
  }

  if ($beginDate === FALSE) {
    // The first entry is assumed to go 7 days back; this can be removed
    // if we change the system to provide start dates.
    $beginDate = date("Y-m-d", strtotime($endDate) - (7 * 24 * 60 * 60));
  }

  // From some reason this has to be shifted by one day or the calendar is whole
  // delayed by a day.
  $endDate = date("Y-m-d", strtotime($endDate) + (1 * 24 * 60 * 60));

  $eventobj = new ZCiCalNode("VEVENT", $icalobj->curnode);
  $eventobj->addNode(new ZCiCalDataNode("SUMMARY:" . "Necko triager: $triager"));
  $eventobj->addNode(new ZCiCalDataNode("DTSTART:" . ZCiCal::fromSqlDateTime($beginDate)));
  $eventobj->addNode(new ZCiCalDataNode("DTEND:" . ZCiCal::fromSqlDateTime($endDate)));
  $eventobj->addNode(new ZCiCalDataNode("UID:" . $beginDate . "-" . SOURCEDOMAIN));
  $eventobj->addNode(new ZCiCalDataNode("DTSTAMP:" . ZCiCal::fromSqlDateTime()));

  $beginDate = $endDate;
}

header("Content-Type: text/calendar");
header("Content-Disposition:inline;filename=necko-ical.ics");
echo $icalobj->export();

?>
