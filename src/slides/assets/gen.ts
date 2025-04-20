import { jsPDF, type OutlineItem } from "jspdf";
import QRCode from "qrcode";
import Interpreter from "sciolyff/interpreter";
import type { SciOlyFF, Team, Event, Track } from "sciolyff/interpreter/types";

import "./fonts/Roboto-Bold-normal";
import "./fonts/Roboto-Regular-normal";
import "./fonts/Roboto-Light-normal";

let colors: { [key: string]: string };
let images: string[];

async function getData() {
  if (!images || images.length === 0) {
    images = await (
      await fetch("https://www.duosmium.org/cache/images-list.json")
    ).json();
  }

  if (!colors || Object.keys(colors).length === 0) {
    colors = await (
      await fetch("https://www.duosmium.org/cache/bg-colors.json")
    ).json();
  }
}
getData();

import {
  generateFilename,
  findTournamentImage,
  formatSchool,
  ordinalize,
  tournamentTitle,
  tournamentTitleShort,
} from "../../../utils/sharedHelpers";

import logos from "./logos";

// https://stackoverflow.com/a/12646864/9129832
export function shuffleArray(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export async function getColor(sciolyff: string) {
  if (!sciolyff) return;

  await getData();

  const filename = generateFilename(new Interpreter(sciolyff));

  const imagePath =
    findTournamentImage(filename, images) || "/images/logos/default.png";

  return colors[imagePath] || "#1f1b35";
}

export async function getImage(sciolyff: string) {
  if (!sciolyff) return;

  await getData();

  const filename = generateFilename(new Interpreter(sciolyff));

  const imagePath =
    "https://www.duosmium.org" +
    (findTournamentImage(filename, images) || "/images/logos/default.png");

  const imgElement = new Image();
  imgElement.src = imagePath;
  await imgElement.decode();

  const resp = await fetch(imagePath);
  const blob = await resp.blob();
  const dataUri = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  return [
    dataUri as string,
    [imgElement.naturalWidth, imgElement.naturalHeight],
  ] as [string, [number, number]];
}

export async function generatePdf(
  sciolyff1: string | SciOlyFF,
  sciolyff2: string | SciOlyFF | undefined,
  options: {
    tournamentLogo: string;
    tournamentLogoDimensions: [number, number];
    logoTextHeight: number;
    logoAwardsHeight: number;
    sidebarLineHeight: number;
    dividerOffset: number;
    titleFontSize: number;
    headerFontSize: number;
    sidebarFontSize: number;
    teamFontSize: number;
    teamLineHeight: number;
    themeBgColor: string;
    themeTextColor: string;
    bgColor: string;
    textColor: string;
    headerTextColor: string;
    randomOrder: boolean;
    preserveOrder: boolean;
    combineTracks: boolean;
    separateTracks: boolean;
    overallSchools: boolean;
    overallPoints: boolean;
    exhibitionMedals: boolean;
    eventsOnly: boolean;
    tournamentUrl: string;
    qrCode: boolean;
  },
  sections?: ("intro" | "events" | "overall" | "closing")[],
) {
  if (!sciolyff1 && !sciolyff2) {
    return "about:blank";
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [16, 9],
    putOnlyUsedFonts: true,
    compress: true,
  });
  doc.deletePage(1);

  const [interpreter1, interpreter2] = [sciolyff1, sciolyff2]
    .map((sciolyff) => (sciolyff ? new Interpreter(sciolyff) : null))
    .sort((a, b) =>
      // put the interpreter with the first division first
      a != null
        ? a.tournament.division.localeCompare(
            b?.tournament?.division ?? "\uffff",
          )
        : b == null
          ? 0
          : 1,
    );
  if (interpreter1 === null) {
    return "about:blank";
  }

  const tournamentName =
    interpreter1.tournament.year +
    " " +
    tournamentTitleShort(interpreter1.tournament);

  doc.setDocumentProperties({
    title: tournamentName + " Awards",
    author: "Duosmium Results",
    creator: "Duosmium Results",
  });

  const tournamentLogo = options.tournamentLogo;
  const tournamentLogoDimensions = options.tournamentLogoDimensions;
  const tournamentLogoRatio =
    tournamentLogo && tournamentLogoDimensions
      ? tournamentLogoDimensions[0] / tournamentLogoDimensions[1]
      : 1;

  const logoTextHeight = tournamentLogo ? options.logoTextHeight : -1;
  const logoAwardsHeight = options.logoAwardsHeight;

  const sidebarLineHeight = options.sidebarLineHeight;
  const dividerOffset = options.dividerOffset;

  const titleFontSize = options.titleFontSize;
  const headerFontSize = options.headerFontSize;
  const sidebarFontSize = options.sidebarFontSize;
  const teamFontSize = options.teamFontSize;
  const teamLineHeight = options.teamLineHeight;

  const themeBgColor = options.themeBgColor;
  const themeTextColor = options.themeTextColor;
  const bgColor = options.bgColor;
  const textColor = options.textColor;
  const headerTextColor = options.headerTextColor;

  const randomOrder = options.randomOrder;
  const preserveOrder = options.preserveOrder;

  const combineTracks = options.combineTracks;
  const separateTracks = options.separateTracks;

  const overallSchools = options.overallSchools;
  const overallPoints = options.overallPoints;

  const exhibitionMedals = options.exhibitionMedals;

  const eventsOnly = options.eventsOnly;

  const tournamentUrl = options.tournamentUrl;
  const qrCode = options.qrCode ?? true;

  function addTextSlide(title: string, subtitle: string) {
    doc.addPage();

    // bg color
    doc.setFillColor(bgColor);
    doc.rect(0, 0, 16, 9, "F");
    doc.setFillColor(themeBgColor);
    doc.rect(0, 0, 16, 9 - (logoTextHeight + 1), "F");

    // add duos logo
    doc.addImage(
      logos[logoTextHeight > -1 ? "dark" : "light"], // use correct logo version
      "JPEG",
      15.25,
      8.25,
      0.375,
      0.375,
    );

    // add tournament logo
    if (tournamentLogo) {
      doc.addImage(
        tournamentLogo,
        0.5,
        8.5 - logoTextHeight,
        logoTextHeight * tournamentLogoRatio,
        logoTextHeight,
      );
    }

    // add text
    doc.setFontSize(titleFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(themeTextColor);
    const titleText = doc.splitTextToSize(title, 12);
    const textHeight = (1.5 * titleFontSize * titleText.length) / 72;
    const offset = (9 - (logoTextHeight + 1)) / 2;
    doc.text(titleText, 8, offset - textHeight / 2, {
      align: "center",
      lineHeightFactor: 1.5,
    });
    if (subtitle) {
      doc.setFontSize(titleFontSize * 0.75);
      doc.setFont("Roboto-Light");
      doc.text(subtitle, 8, offset + 0.25 + textHeight / 2, {
        align: "center",
        lineHeightFactor: 1.5,
        maxWidth: 12,
      });
    }
  }

  async function addClosingSlide(tournamentName: string, url: string) {
    if (!url || !qrCode) {
      addTextSlide(
        "Thank you for attending the " + tournamentName + "!",
        "Results will be available shortly.",
      );
      return;
    }
    doc.addPage();

    // add sidebar
    doc.setFillColor(bgColor);
    doc.rect(0, 0, 16, 9, "F");
    doc.setFillColor(themeBgColor);
    doc.rect(dividerOffset, 0, 16 - dividerOffset, 9, "F");

    // duos logo
    doc.addImage(logos["light"], "JPEG", 15.25, 8.25, 0.375, 0.375);

    // add tournament logo
    if (tournamentLogo) {
      doc.addImage(
        tournamentLogo,
        dividerOffset - logoAwardsHeight * tournamentLogoRatio - 0.5,
        8.5 - logoAwardsHeight,
        logoAwardsHeight * tournamentLogoRatio,
        logoAwardsHeight,
      );
    }

    // add thank you message
    doc.setFontSize(titleFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(textColor);
    const titleText = doc.splitTextToSize(
      "Thank you for attending the " + tournamentName + "!",
      dividerOffset - 1,
    );
    const textHeight = (1.5 * titleFontSize * titleText.length) / 72;
    const offset = (9 - textHeight) / 2;
    doc.text(titleText, 0.5, offset, {
      lineHeightFactor: 1.5,
    });

    // add  instruction note
    doc.setFontSize(titleFontSize * 0.75);
    doc.setFont("Roboto-Light");
    const subtitleText = doc.splitTextToSize(
      "Results will be published shortly.",
      dividerOffset - 1,
    );
    doc.text(subtitleText, 0.5, offset + textHeight + 0.25, {
      lineHeightFactor: 1.5,
    });

    // add QR code
    const qr = await QRCode.toDataURL(url, {
      errorCorrectionLevel: "L",
      scale: 10,
    });
    const sideLength = 16 - dividerOffset - 1;
    doc.addImage(
      qr,
      "PNG",
      dividerOffset + 0.5,
      (9 - sideLength) / 2,
      sideLength,
      sideLength,
    );
  }

  function addPlacingSlide(
    name: string,
    data: [Team, number][],
    i: number,
    overall = false,
    schoolOnly = false,
  ) {
    const eventPlaces = data.length;
    const sidebarOffset = 4.5 - (sidebarLineHeight * eventPlaces) / 2;

    doc.addPage();

    // add sidebar
    doc.setFillColor(bgColor);
    doc.rect(0, 0, 16, 9, "F");
    doc.setFillColor(themeBgColor);
    doc.rect(dividerOffset, 0, 16 - dividerOffset, 9, "F");

    // duos logo
    doc.addImage(logos["light"], "JPEG", 15.25, 8.25, 0.375, 0.375);

    // add tournament logo
    if (tournamentLogo) {
      doc.addImage(
        tournamentLogo,
        dividerOffset - logoAwardsHeight * tournamentLogoRatio - 0.5,
        8.5 - logoAwardsHeight,
        logoAwardsHeight * tournamentLogoRatio,
        logoAwardsHeight,
      );
    }

    // add event name
    doc.setFontSize(headerFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(headerTextColor);
    const title = doc.splitTextToSize(name, dividerOffset - 1);
    const titleOffset = (1.25 * title.length * headerFontSize) / 72;
    doc.text(title, 0.5, 0.625, {
      baseline: "top",
      lineHeightFactor: 1.25,
    });
    doc.setDrawColor(themeBgColor);
    doc.setLineWidth(1 / 16);
    doc.line(0.5, 0.75 + titleOffset, 2, 0.75 + titleOffset);

    // add main team name
    // compute height
    doc.setFontSize(teamFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(textColor);
    const [team, place] = data[eventPlaces - (i + 1)];
    const teamNameText = doc.splitTextToSize(
      `${team.school}${team.suffix && !schoolOnly ? " " + team.suffix : ""}`,
      dividerOffset - 1,
    );
    const teamNameOffset =
      5 -
      (teamLineHeight *
        teamFontSize *
        (teamNameText.length + (overall ? 2 : 1))) /
        72 /
        2; // 72 points per inch
    // add rank and team number
    doc.setFontSize(teamFontSize * 0.875);
    doc.setFont("Roboto-Light");
    doc.text(
      `${ordinalize(place)}:${schoolOnly ? "" : " Team " + team.number + (team.exhibition ? " (Exhibition)" : "")}`,
      0.5,
      teamNameOffset,
      {
        baseline: "middle",
        lineHeightFactor: teamLineHeight,
      },
    );
    // add team name
    doc.setFontSize(teamFontSize);
    doc.setFont("Roboto-Bold");
    doc.text(
      teamNameText,
      0.5,
      teamNameOffset + (teamLineHeight * teamFontSize) / 72 + 0.1,
      {
        baseline: "middle",
        lineHeightFactor: teamLineHeight,
      },
    );
    if (overall && overallPoints) {
      doc.setFontSize(teamFontSize * 0.75);
      doc.setFont("Roboto-Light");
      doc.text(
        `${
          team.tournament.hasTracks && !combineTracks
            ? team.trackPoints
            : team.points
        } points`,
        0.5,
        teamNameOffset +
          (teamLineHeight * teamFontSize * (teamNameText.length + 1)) / 72 +
          0.2,
        {
          baseline: "middle",
          lineHeightFactor: teamLineHeight,
        },
      );
    }

    // add sidebar teams
    doc.setFontSize(sidebarFontSize);
    doc.setFont("Roboto-Regular");
    doc.setTextColor(themeTextColor);
    data
      .slice(eventPlaces - (i + 1), eventPlaces)
      .reverse()
      .forEach(([team, rank], i) => {
        // split text for truncating if too long
        const text = doc.splitTextToSize(
          `${rank}. ` +
            formatSchool(team) +
            (team.suffix && !schoolOnly ? " " + team.suffix : ""),
          16 - dividerOffset - 1.25,
        );
        doc.text(
          `${text[0]}${text.length > 1 ? "…" : ""}${
            schoolOnly
              ? ""
              : overall
                ? " (" +
                  (team.tournament.hasTracks && !combineTracks
                    ? team.trackPoints
                    : team.points) +
                  ")"
                : " [" + team.number + (team.exhibition ? ", EX" : "") + "]"
          }`,
          dividerOffset + 0.5,
          sidebarOffset + (eventPlaces - (i + 1)) * sidebarLineHeight,
          { baseline: "top", maxWidth: 15 },
        );
      });
  }

  function addEventSlides(
    events: [Event, Track | null][],
    outline: OutlineItem,
  ) {
    events.forEach(([event, track]) => {
      const maxMedals =
        event.medals ?? (track ? track.medals : event.tournament.medals);
      const eventName =
        event.name +
        " " +
        event.tournament.division +
        (event.trial ? " (Trial)" : event.trialed ? " (Trialed)" : "") +
        (track ? " - " + track.name : "");

      // i apologize for all these ternary operators
      const rankedTeams = event.placings
        .filter(
          (p) =>
            (track ? p.team.track === track : true) && // filter by track if applicable
            p.participated &&
            (event.trial ||
              !((p.team.exhibition && !exhibitionMedals) || p.exempt)),
        ) // use non-exhibition teams from the correct track
        .sort(
          (a, b) =>
            (track
              ? a.isolatedTrackPoints - b.isolatedTrackPoints
              : a.isolatedPoints - b.isolatedPoints) *
              (event.tournament.reverseScoring ? -1 : 1) ||
            (a.team.exhibition ? 1 : 0) - (b.team.exhibition ? 1 : 0),
        ) // sort by points
        .filter((p, i) =>
          event.tournament.reverseScoring
            ? i < maxMedals
            : (track ? p.isolatedTrackPoints : p.isolatedPoints) <= maxMedals,
        ) // only select top placings
        .map(
          (p) =>
            [p.team, track ? p.isolatedTrackPoints : p.isolatedPoints] as [
              Team,
              number,
            ],
        );

      if (rankedTeams.length > 0) {
        addTextSlide(eventName, tournamentName);
        doc.outline.add(outline, eventName, {
          pageNumber: doc.getNumberOfPages(),
        });

        Array(rankedTeams.length)
          .fill(0)
          .forEach((_, i) => {
            addPlacingSlide(eventName, rankedTeams, i);
          });
      }
    });
  }

  function computeTeamRankings(interpreter: Interpreter, track: Track | null) {
    return (
      interpreter.teams
        // filter by track and exhibition if necessary
        .filter((t) => (track ? t.track === track : true) && !t.exhibition)
        // sort by rank
        .sort((a, b) =>
          track ? a.trackRank! - b.trackRank! : a.rank! - b.rank!,
        )
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
          [[], []] as [string[], Team[]],
        )[1]
        // slice to top placings
        .slice(0, track ? track.trophies : interpreter.tournament.trophies)
        // map to correct format
        .map((t, i) => [t, i + 1] as [Team, number])
    );
  }

  function addOverallSlide(
    interpreter: Interpreter,
    track: Track | null,
    teamRankings: [Team, number][],
    i: number,
    includeTitleSlide: boolean = false,
  ) {
    const overallTitle =
      "Overall Rankings" +
      (interpreter ? `: Division ${interpreter.tournament.division}` : "") +
      (track ? " - " + track.name : "");

    if (includeTitleSlide && i === 0) {
      addTextSlide(overallTitle, tournamentName);
      doc.outline.add(null, overallTitle, {
        pageNumber: doc.getNumberOfPages(),
      });
    }

    addPlacingSlide(overallTitle, teamRankings, i, true, overallSchools);
  }

  if (sections ? sections.includes("intro") : !eventsOnly) {
    // generate title slide
    doc.outline.add(null, "Welcome", { pageNumber: 1 });
    addTextSlide(
      interpreter1.tournament.year +
        " " +
        tournamentTitle(interpreter1.tournament),
      "Awards Ceremony",
    );
  }

  // create a list of events, with an event entry for each track
  const events1: [Event, Track | null][] = [];
  const events2: [Event, Track | null][] = [];
  (
    [
      [interpreter1, events1],
      [interpreter2, events2],
    ] as const
  ).forEach(([interpreter, events]) => {
    if (!interpreter) return;
    if (interpreter.tournament.hasTracks && !combineTracks) {
      interpreter.tournament.tracks?.forEach((track) => {
        events.push(
          ...interpreter.events.map((e) => [e, track] as [Event, Track]),
        );
      });
    } else {
      events.push(...interpreter.events.map((e) => [e, null] as [Event, null]));
    }
  });

  const sortEvents = (
    eventsList: [Event, Track | null][],
    interpreter: Interpreter | null,
  ) => {
    if (preserveOrder) {
      return interpreter
        ? eventsList.sort(
            (a, b) =>
              interpreter.rep.Events.findIndex((e) => e.name === a[0].name) -
              interpreter.rep.Events.findIndex((e) => e.name === b[0].name),
          )
        : eventsList;
    }

    // this nonsense sorts the events by name, grouping non-trials (including trialed events) and trials separately
    return eventsList.sort((a, b) =>
      a[0].trial === b[0].trial
        ? (a[0].name + " " + a[0].tournament.division).localeCompare(
            b[0].name + " " + b[0].tournament.division,
          )
        : a[0].trial
          ? 1
          : -1,
    );
  };

  const genOverall = (
    interpreter1: Interpreter,
    interpreter2: Interpreter | null,
  ) => {
    addTextSlide("Overall Rankings", tournamentName);
    doc.outline.add(null, "Overall Rankings", {
      pageNumber: doc.getNumberOfPages(),
    });

    // generate rankings for each group of overall awards (division, track combo)
    let overallData: [Interpreter, Track | null, [Team, number][], number][] =
      [];
    [interpreter1, interpreter2].forEach((i) => {
      if (!i) return;
      if (
        !i.tournament.tracks ||
        i.tournament.tracks.length === 0 ||
        combineTracks
      ) {
        const rankings = computeTeamRankings(i, null);
        overallData.push([i, null, rankings, rankings.length - 1]);
      } else {
        overallData = overallData.concat(
          i.tournament.tracks.map((track) => {
            const rankings = computeTeamRankings(i, track);
            return [i, track, rankings, rankings.length - 1];
          }),
        );
      }
    });

    // zip up groups from the back to interlace placements
    // aligned with 1st place at the end
    overallData.reverse();
    const slides: typeof overallData = [];
    while (overallData.some(([, , , l]) => l >= 0)) {
      overallData.forEach((group) => {
        if (group[3] >= 0) {
          slides.push([...group]);
          group[3] -= 1; // decrement the last index
        }
      });
    }
    slides.reverse().forEach(([interpreter, track, rankings, i]) => {
      addOverallSlide(interpreter, track, rankings, i);
    });
  };

  // sort (or shuffle) events, then generate event and overall slides
  if (
    separateTracks &&
    !combineTracks &&
    (interpreter1.tournament.hasTracks || interpreter2?.tournament.hasTracks)
  ) {
    (
      [
        [interpreter1, events1],
        [interpreter2, events2],
      ] as const
    ).forEach(([interpreter, events]) => {
      interpreter?.tournament.tracks
        ?.sort((a, b) => a.name.localeCompare(b.name))
        .forEach((t) => {
          const outline = doc.outline.add(null, "Placements - " + t.name, {
            pageNumber: doc.getNumberOfPages(),
          });
          if (sections ? sections.includes("events") : true) {
            addEventSlides(
              sortEvents(
                events.filter(([_, track]) => track === t),
                interpreter,
              ),
              outline,
            );
          }
          if (sections ? sections.includes("overall") : !eventsOnly) {
            const teamRankings = computeTeamRankings(interpreter, t);
            Array(teamRankings.length)
              .fill(0)
              .forEach((_, i) => {
                addOverallSlide(interpreter, t, teamRankings, i, true);
              });
          }
        });
    });
  } else if (randomOrder && !preserveOrder) {
    const outline = doc.outline.add(null, "Placements", {
      pageNumber: doc.getNumberOfPages(),
    });
    const events = events1.concat(events2);
    shuffleArray(events);
    if (sections ? sections.includes("events") : true) {
      addEventSlides(events, outline);
    }
    if (sections ? sections.includes("overall") : !eventsOnly) {
      genOverall(interpreter1, interpreter2);
    }
  } else {
    const outline = doc.outline.add(null, "Placements", {
      pageNumber: doc.getNumberOfPages(),
    });
    sortEvents(events1, interpreter1);
    sortEvents(events2, interpreter2);
    // alternate B/C event slides
    const events = Array(Math.max(events1.length, events2.length))
      .fill(0)
      .reduce(
        (a, _, i) => {
          if (events1[i]) a.push(events1[i]);
          if (events2[i]) a.push(events2[i]);
          return a;
        },
        [] as [Event, Track][],
      );
    if (sections ? sections.includes("events") : true) {
      addEventSlides(events, outline);
    }
    if (sections ? sections.includes("overall") : !eventsOnly) {
      genOverall(interpreter1, interpreter2);
    }
  }

  if (sections ? sections.includes("closing") : !eventsOnly) {
    // generate thank you slide
    await addClosingSlide(tournamentName, tournamentUrl);
    // addTextSlide("Thank You!", tournamentName);
    doc.outline.add(null, "Thank You!", { pageNumber: doc.getNumberOfPages() });
  }

  return doc.output("bloburi").toString();
}
