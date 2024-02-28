import { jsPDF, OutlineItem } from "jspdf";
import { getPNG } from "@shortcm/qr-image/lib/png";
import Interpreter from "sciolyff/interpreter";
import type { SciOlyFF, Team, Event, Track } from "sciolyff/interpreter/types";

import "./fonts/Roboto-Bold-normal";
import "./fonts/Roboto-Regular-normal";
import "./fonts/Roboto-Light-normal";

let colors: { [key: string]: string };
let images: string[];
let imageCache: { [key: string]: string };

fetch("https://www.duosmium.org/cache/bg-colors.json")
  .then((resp) => resp.json())
  .then((data) => (colors = data));
fetch("https://www.duosmium.org/cache/images-list.json")
  .then((resp) => resp.json())
  .then((data) => (images = data));
fetch("https://www.duosmium.org/cache/tourn-images.json")
  .then((resp) => resp.json())
  .then((data) => (imageCache = data));

import {
  findTournamentImage,
  formatSchool,
  ordinalize,
  tournamentTitle,
  tournamentTitleShort,
} from "../../../utils/sharedHelpers";

import logos from "./logos";

// https://stackoverflow.com/a/12646864/9129832
function shuffleArray(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

window.getColor = (filename: string) => {
  if (!filename) return;

  const imagePath =
    imageCache[filename] ||
    findTournamentImage(filename, images) ||
    "/images/logos/default.png";

  return colors[imagePath] || "#1f1b35";
};

window.getImage = async (filename: string) => {
  if (!filename) return;

  const imagePath =
    "https://www.duosmium.org" +
    (imageCache[filename] ||
      findTournamentImage(filename, images) ||
      "/images/logos/default.png");

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
};

window.generatePdf = async (
  sciolyff1: string | SciOlyFF,
  sciolyff2: string | SciOlyFF,
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
    combineTracks: boolean;
    separateTracks: boolean;
    overallSchools: boolean;
    tournamentUrl: string;
  },
) => {
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
  const combineTracks = options.combineTracks;
  const separateTracks = options.separateTracks;
  const overallSchools = options.overallSchools;

  const tournamentUrl = options.tournamentUrl;

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
    if (!url) {
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
    const qr = await getPNG(url, {
      logo: await (await fetch(logos["bg"])).blob(),
      ec_level: "L",
      size: 10,
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

  function addPlacingSlides(
    name: string,
    data: [Team, number][],
    overall = false,
    schoolOnly = false,
  ) {
    const eventPlaces = data.length;
    const sidebarOffset = 4.5 - (sidebarLineHeight * eventPlaces) / 2;

    // this loops through placings backwards to generate slides for each placing in reverse order
    Array(eventPlaces)
      .fill(0)
      .forEach((_, i) => {
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
          `${ordinalize(place)}:${schoolOnly ? "" : " Team " + team.number}${
            overall && team.earnedBid ? " (Qualified)" : ""
          }`,
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
        if (overall && !schoolOnly) {
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
                    : " [" + team.number + "]"
              }${overall && team.earnedBid ? "*" : ""}`,
              dividerOffset + 0.5,
              sidebarOffset + (eventPlaces - (i + 1)) * sidebarLineHeight,
              { baseline: "top", maxWidth: 15 },
            );
          });
      });
  }

  function addEventSlides(events: [Event, Track][], outline: OutlineItem) {
    events.forEach(([event, track]) => {
      const eventPlaces = Math.min(
        // use event medal override if applicable, otherwise fall back on tournament medal count
        event.medals ?? (track ? track.medals : event.tournament.medals),
        // if less teams participated than medals, don't show empty places
        event.placings.filter(
          (p) =>
            (track ? p.team.track === track : true) && // filter by track if applicable
            p.participated &&
            (event.trial || !(p.team.exhibition || p.exempt)),
        ).length,
      );
      const eventName =
        event.name +
        " " +
        event.tournament.division +
        (event.trial ? " (Trial)" : event.trialed ? " (Trialed)" : "") +
        (track ? " - " + track.name : "");

      // i apologize for all these ternary operators
      const rankedTeams = event.placings
        .filter(
          (p) => (track ? p.team.track === track : true) && !p.team.exhibition,
        ) // use non-exhibition teams from the correct track
        .sort(
          (a, b) =>
            (track
              ? a.isolatedTrackPoints - b.isolatedTrackPoints
              : a.isolatedPoints - b.isolatedPoints) *
            (event.tournament.reverseScoring ? -1 : 1),
        ) // sort by points
        .filter((p, i) =>
          event.tournament.reverseScoring
            ? i < eventPlaces
            : (track ? p.isolatedTrackPoints : p.isolatedPoints) <= eventPlaces,
        ) // only select top placings
        .map((p) => [p.team, track ? p.isolatedTrackPoints : p.isolatedPoints]);

      if (rankedTeams.length > 0) {
        addTextSlide(eventName, tournamentName);
        doc.outline.add(outline, eventName, {
          pageNumber: doc.getNumberOfPages(),
        });

        addPlacingSlides(eventName, rankedTeams);
      }
    });
  }

  function addOverallSlides(interpreter: Interpreter, track: Track | null) {
    const overallTitle =
      "Overall Rankings" +
      (interpreter2 ? `: Division ${interpreter.tournament.division}` : "") +
      (track ? " - " + track.name : "");
    addTextSlide(overallTitle, tournamentName);
    doc.outline.add(null, overallTitle, {
      pageNumber: doc.getNumberOfPages(),
    });
    addPlacingSlides(
      overallTitle,
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
        .map((t, i) => [t, i + 1]),
      true,
      overallSchools,
    );
  }

  // generate title slide
  doc.outline.add(null, "Welcome", { pageNumber: 1 });
  addTextSlide(
    interpreter1.tournament.year +
      " " +
      tournamentTitle(interpreter1.tournament),
    "Awards Ceremony",
  );

  // create a list of events, with an event entry for each track
  const events: [Event, Track | null][] = [];
  if (interpreter1.tournament.hasTracks && !combineTracks) {
    interpreter1.tournament.tracks?.forEach((track) => {
      events.push(
        ...interpreter1.events.map((e) => [e, track] as [Event, Track]),
      );
    });
  } else {
    events.push(...interpreter1!.events.map((e) => [e, null] as [Event, null]));
  }
  if (interpreter2) {
    if (interpreter2.tournament.hasTracks && !combineTracks) {
      interpreter2.tournament.tracks?.forEach((track) => {
        events.push(
          ...interpreter2.events.map((e) => [e, track] as [Event, Track]),
        );
      });
    } else {
      events.push(
        ...interpreter2.events.map((e) => [e, null] as [Event, null]),
      );
    }
  }

  const sortEvents = (eventsList: [Event, Track | null][]) => {
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

  const genOverall = (interpreter: Interpreter) => {
    let overallData: (Track | null)[] = [];
    if (
      !interpreter.tournament.tracks ||
      interpreter.tournament.tracks.length === 0 ||
      combineTracks
    ) {
      overallData = [null];
    } else {
      overallData = interpreter.tournament.tracks;
    }
    overallData.forEach((track) => addOverallSlides(interpreter, track));
  };

  // sort (or shuffle) events, then generate event and overall slides
  if (
    separateTracks &&
    !combineTracks &&
    (interpreter1.tournament.hasTracks || interpreter2?.tournament.hasTracks)
  ) {
    interpreter1.tournament.tracks
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .forEach((t) => {
        const outline = doc.outline.add(null, "Placements - " + t.name, {
          pageNumber: doc.getNumberOfPages(),
        });
        addEventSlides(
          sortEvents(events.filter(([_, track]) => track === t)),
          outline,
        );
        addOverallSlides(interpreter1, t);
      });
    interpreter2?.tournament.tracks
      ?.sort((a, b) => a.name.localeCompare(b.name))
      .forEach((t) => {
        const outline = doc.outline.add(null, "Placements - " + t.name, {
          pageNumber: doc.getNumberOfPages(),
        });
        addEventSlides(
          sortEvents(events.filter(([_, track]) => track === t)),
          outline,
        );
        addOverallSlides(interpreter2, t);
      });
  } else if (randomOrder) {
    const outline = doc.outline.add(null, "Placements", {
      pageNumber: doc.getNumberOfPages(),
    });
    shuffleArray(events);
    addEventSlides(events, outline);
    genOverall(interpreter1);
    if (interpreter2) genOverall(interpreter2);
  } else {
    const outline = doc.outline.add(null, "Placements", {
      pageNumber: doc.getNumberOfPages(),
    });
    addEventSlides(sortEvents(events), outline);
    genOverall(interpreter1);
    if (interpreter2) genOverall(interpreter2);
  }

  // generate thank you slide
  await addClosingSlide(tournamentName, tournamentUrl);
  // addTextSlide("Thank You!", tournamentName);
  doc.outline.add(null, "Thank You!", { pageNumber: doc.getNumberOfPages() });

  return doc.output("bloburi").toString();
};
