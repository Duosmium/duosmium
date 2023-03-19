import Interpreter from "sciolyff/interpreter";

import { tournamentTitleShort } from "../../../utils/sharedHelpers";

window.printable = (sciolyff1, sciolyff2, options) => {
  const overallSchools = options.overallSchools;
  const reverse = options.reverse;
  const contentOnly = options.contentOnly;

  const [interpreter1, interpreter2] = [sciolyff1, sciolyff2]
    .map((sciolyff) => (sciolyff ? new Interpreter(sciolyff) : null))
    .sort((a, b) =>
      // put the interpreter with the first division first
      a != null
        ? a.tournament.division.localeCompare(
            b?.tournament?.division ?? "\uffff"
          )
        : b == null
        ? 0
        : 1
    );

  const tournamentName =
    interpreter1.tournament.year +
    " " +
    tournamentTitleShort(interpreter1.tournament);

  const events = [];
  let eventMarkup = "";
  if (interpreter1.tournament.hasTracks && !combineTracks) {
    interpreter1.tournament.tracks.forEach((track) => {
      events.push(...interpreter1.events.map((e) => [e, track]));
    });
  } else {
    events.push(...interpreter1.events.map((e) => [e]));
  }
  if (interpreter2) {
    if (interpreter2.tournament.has && !combineTracks) {
      interpreter2.tournament.tracks.forEach((track) => {
        events.push(...interpreter2.events.map((e) => [e, track]));
      });
    } else {
      events.push(...interpreter2.events.map((e) => [e]));
    }
  }
  // this nonsense sorts the events by name, grouping non-trials (including trialed events) and trials separately
  events.sort((a, b) =>
    a[0].trial === b[0].trial
      ? (a[0].name + " " + a[0].tournament.division).localeCompare(
          b[0].name + " " + b[0].tournament.division
        )
      : a[0].trial
      ? 1
      : -1
  );
  events.forEach(([event, track]) => {
    const eventPlaces = Math.min(
      // use event medal override if applicable, otherwise fall back on tournament medal count
      event.medals ?? (track ? track.medals : event.tournament.medals),
      // if less teams participated than medals, don't show empty places
      event.placings.filter(
        (p) =>
          (track ? p.team.track === track : true) && // filter by track if applicable
          p.participated &&
          (event.trial || !(p.team.exhibition || p.exempt))
      ).length
    );
    const eventName =
      event.name +
      " " +
      event.tournament.division +
      (event.trial ? " (Trial)" : event.trialed ? " (Trialed)" : "") +
      (track ? " - " + track.name : "");

    // i apologize for all these ternary operators
    const rankedTeams = event.placings
      .filter((p) => (track ? p.team.track === track : true)) // use teams from the correct track
      .sort(
        (a, b) =>
          (track
            ? a.isolatedTrackPoints - b.isolatedTrackPoints
            : a.isolatedPoints - b.isolatedPoints) *
          (event.tournament.reverseScoring ? -1 : 1)
      ) // sort by points
      .filter((p, i) =>
        event.tournament.reverseScoring
          ? i < eventPlaces
          : (track ? p.isolatedTrackPoints : p.isolatedPoints) <= eventPlaces
      ); // only select top placings

    if (rankedTeams.length === 0) {
      return;
    }

    if (reverse) {
      rankedTeams.reverse();
    }

    const rankedMarkup = rankedTeams
      .map(
        (p) =>
          `<li>${track ? p.isolatedTrackPoints : p.isolatedPoints}. ${
            p.team.school
          }${p.team.suffix ? " " + p.team.suffix : ""} <span class="supp">(${
            p.team.state
          }, Team ${p.team.number})</span></li>`
      )
      .join("");

    eventMarkup += `<h2>${eventName}</h2><ul>${rankedMarkup}</ul>`;
  });

  const genOverall = (interpreter) => {
    let overallData = [];
    if (interpreter.tournament.tracks.length === 0 || combineTracks) {
      overallData = [null];
    } else {
      overallData = interpreter.tournament.tracks;
    }
    let overallMarkup = "";
    overallData.forEach((track) => {
      const overallTitle =
        "Overall Rankings" +
        (interpreter2 ? `: Division ${interpreter.tournament.division}` : "") +
        (track ? " - " + track.name : "");

      const overallTeams = interpreter.teams
        // filter by track if necessary
        .filter((t) => (track ? t.track === track : true))
        // sort by rank
        .sort((a, b) => (track ? a.trackRank - b.trackRank : a.rank - b.rank))
        // filter by school if necessary
        .reduce(
          (acc, t) => {
            if (overallSchools) {
              if (!acc[0].includes(t.school)) {
                acc[1].push(t);
                acc[0].push(t.school);
              }
            } else {
              acc[1].push(t);
            }
            return acc;
          },
          [[], []]
        )[1]
        // slice to top placings
        .slice(0, track ? track.trophies : interpreter.tournament.trophies)
        // map to correct format
        .map(
          (team, i) =>
            `<li>${i + 1}. ${team.school}${
              team.suffix && !overallSchools ? " " + team.suffix : ""
            } <span class="supp">(${team.state}, Team ${
              team.number
            })</span></li>`
        );

      if (reverse) {
        overallTeams.reverse();
      }

      overallMarkup += `<h2>${overallTitle}</h2><ul>${overallTeams.join(
        ""
      )}</ul>`;
    });
    return overallMarkup;
  };
  let overallMarkup = genOverall(interpreter1);
  if (interpreter2) {
    overallMarkup += genOverall(interpreter2);
  }

  const content = `
  <div class="printable-wrapper">
    <style>
    .printable-wrapper h1 {
        margin: 0;
    }
    .printable-wrapper h2 {
        margin: 0.5em 0 0.25em;
    }
    .printable-wrapper ul {
        list-style: none;
        margin: 0;
    }
    .printable-wrapper .supp {
        font-size: 0.75em;
        color: #333;
    }

    .printable-wrapper footer {
        display: flex;
    }
    .printable-wrapper table {
        margin: 0;
    }
    .printable-wrapper #logo {
        width: 16px;
        color: black;
        margin-left: 16px;
    }
    @media print {
        html {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
            font-size: 12px;
            padding: 0;
            line-height: 1.5;
            height: 100%;
        }
        .printable-wrapper table.paging tfoot td {
            height: .5in;
        }
        .printable-wrapper footer {
            position: fixed;
            bottom: 0;
            right: 0;
        }
        .printable-wrapper h1, .printable-wrapper button {
            display: none;
        }
    }
    </style>
    <h1>${tournamentName}</h1>
    <button onclick="window.top.print();">Print</button>
    <table class="paging"><tbody><tr><td>
        ${eventMarkup}
        ${overallMarkup}
    </td></tr></tbody><tfoot><tr><td>&nbsp;</td></tr></tfoot></table>
    <footer><p>${tournamentName}</p><svg id="logo" viewBox="0 0 210 297">
      <title>D</title>
      <path d="m 30.136983,12.881072 0.234094,0.302824 c 0,0 38.973227,50.168126 9.865031,120.935764 -29.156781,70.88576 10.54716,120.9704 10.54716,120.9704 l 0.03721,0.047 c -0.01205,-0.0152 -0.185802,-0.24056 -0.414962,-0.5488 C 48.561473,248.35925 36.245835,201.63833 66.896496,156.5431 99.733935,108.23055 69.16044,55.763725 69.16044,55.763725 l -0.221175,-0.378789 0.392741,0.193271 c 0,0 21.085911,10.400339 42.455294,28.554846 21.36938,18.154517 43.03951,44.072327 44.17559,75.125127 0.56837,15.53557 -5.73341,29.31655 -15.49208,41.23986 -9.75865,11.92331 -22.97523,21.99588 -36.2598,30.12736 -24.571423,15.04016 -49.098359,23.3507 -52.69032,24.52977 3.255425,0.10047 31.893187,0.64804 62.26648,-10.19576 32.24125,-11.51075 66.07586,-35.88658 72.36303,-87.2541 3.14487,-25.69427 -5.0197,-47.59978 -19.02881,-65.986158 C 153.11224,73.332838 133.26128,58.45971 113.0234,46.79528 72.547636,23.466424 30.50802,12.975123 30.50802,12.975123 Z M 51.52069,255.15517 c -0.164467,-0.005 -0.495506,-0.0117 -0.525549,-0.0129 0.104367,0.003 0.222187,0.007 0.520898,0.0145 9.1e-4,-3e-4 0.0037,-0.001 0.0047,-0.002 z m -0.525549,-0.0129 c -0.035,-0.001 -0.1711,-0.005 -0.174666,-0.005 l 0.06046,0.002 c 0,0 0.107676,0.003 0.114205,0.003 z"/>
    </svg></footer>
  </div>
  `;
  if (contentOnly) {
    return content;
  }
  return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>${tournamentName}</title>
            <style>
              *,
              *:after,
              *:before {
                box-sizing: border-box;
              }
              html {
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                height: 100%;
                padding: 32px;
                margin: 0;
                line-height: 1.5
              }
            </style>
        </head>
        <body>${content}</body>
    </html>
  `;
};
