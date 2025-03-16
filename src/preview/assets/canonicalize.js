import { dump, load } from "js-yaml";
import { parse } from "@vanillaes/csv";
import { distance } from "fastest-levenshtein";

const normalize = (name) =>
  name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .split(" ")
    .flatMap((n) =>
      ["school", "academy", "of", "and", "for", "the", ""].includes(n)
        ? []
        : [
            [
              ["hs", "high"],
              ["ms", "middle"],
              ["es", "elementary"],
              ["ems", "elementary middle"],
              ["jhs", "junior high"],
              ["mhs", "middle high"],
              ["jr", "junior"],
              ["sr", "senior"],
              ["jrsr", "junior senior"],
            ].find(([from]) => n === from)?.[1] ?? n,
          ],
    )
    .join(" ");

let canonicalNames;
fetch("https://www.duosmium.org/results/schools.csv", { cache: "force-cache" })
  .then((resp) => resp.text())
  .then((text) => {
    canonicalNames = parse(text).map(([name, city, state]) => [
      normalize(name),
      name,
      city,
      state,
    ]);
    getSciolyFF();
  });

const getCanonical = (teams) =>
  new Map(
    teams.flatMap((t) => {
      const matched = canonicalNames.flatMap(([n, original, city, state]) =>
        state === t.state && original === t.school && city === (t.city ?? "")
          ? [true]
          : state === t.state && distance(n, normalize(t.school)) <= 2
            ? [[original, city, state]]
            : [],
      );
      return matched.length > 0 && matched.some((m) => m === true)
        ? []
        : [[t.number, matched]];
    }),
  );

// allow jquery-like element selection
const qs = (selector) => document.querySelector(selector);

let parsed;
let canonicalized;

window.addEventListener(
  "message",
  (event) => {
    if (event.data.source !== "sciolyff-canonicalize") return;

    parsed = load(event.data.data);
    const teams = parsed["Teams"];

    canonicalized = getCanonical(teams);
    qs("#teams").innerHTML = "";

    if (canonicalized.size === 0) {
      qs("#teams").innerText = "No non-canonical teams found.";
      return;
    }

    for (const team of teams) {
      if (!canonicalized.has(team.number)) continue;

      const template = qs("#team-template").content.cloneNode(true);
      template.querySelector(".team-number").innerText = team.number;
      template.querySelector(".team-input").innerText =
        `${team.school}, ${team.city ? team.city + ", " : ""}${team.state}`;

      if (canonicalized.get(team.number).length === 0) {
        const li = document.createElement("li");
        li.innerText = "No matches found";
        template.querySelector(".matches").appendChild(li);
      }
      canonicalized.get(team.number).forEach(([name, city, state], i) => {
        const option = document.createElement("input");
        option.type = "radio";
        option.name = team.number;
        option.value = i;
        const span = document.createElement("span");
        span.innerText = `${name}, ${city ? city + ", " : ""}${state}`;
        const label = document.createElement("label");
        label.appendChild(option);
        label.appendChild(span);
        const li = document.createElement("li");
        li.appendChild(label);
        template.querySelector(".matches").appendChild(li);
      });

      qs("#teams").appendChild(template);
    }

    window.sciolyff = event.data;
  },
  false,
);

qs("#canonicalize-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const data = new FormData(qs("#canonicalize-form"));

  parsed["Teams"].forEach((team) => {
    if (data.has(team.number.toString())) {
      const [name, city, state] = canonicalized.get(team.number)[
        parseInt(data.get(team.number.toString()))
      ];
      team.school = name;
      team.city = city;
      team.state = state;
    }
  });

  const newSciolyff = dump(parsed).replace(/T00:00:00\.000Z/g, "");

  window.parent.postMessage(
    {
      source: "sciolyff-canonicalize",
      converted: newSciolyff,
    },
    location.origin,
  );
});

const getSciolyFF = () => {
  window.parent.postMessage(
    {
      source: "sciolyff-canonicalize",
      getSciolyFF: true,
    },
    location.origin,
  );
};
