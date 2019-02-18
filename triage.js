async function fetchTriage() {
  let request = await fetch("triage.json");
  let json = await request.json();
  return json;
}

function currentTriager(json) {
  let duties = json["duty-end-dates"];
  let now = new Date();

  let date = Object.keys(duties).filter(date => new Date(date) >= now).sort()[0];
  if (!date) {
    return { error: "No one on duty!" };
  }

  const name = duties[date];
  return Object.assign({
    name, till: date, toString: function () {
      return `${this.name}, on duty until ${this.till}`
    }
   }, json.triagers[name]);
}
