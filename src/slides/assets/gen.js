import { jsPDF } from "jspdf";
import "./fonts/Roboto-Bold-normal";
import "./fonts/Roboto-Regular-normal";
import "./fonts/Roboto-Light-normal";
import Interpreter from "sciolyff/interpreter";
import {
  formatSchool,
  ordinalize,
  tournamentTitle,
  tournamentTitleShort,
} from "../../../utils/sharedHelpers";

window.generatePdf = (sciolyff, options) => {
  const defaultOptions = {
    medals: 6,
    trophies: 6,
    sidebarLineHeight: 0.5,
    dividerOffset: 10,
    titleFontSize: 48,
    headerFontSize: 32,
    sidebarFontSize: 16,
    teamFontSize: 36,
    teamLineHeight: 1.25,
    bgColor: "#fafafa",
    textColor: "#212121",
    sidebarBgColor: "#1f1b35",
    sidebarTextColor: "#f5f5f5",
    headerTextColor: "#353535",
  };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  };

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [16, 9],
    putOnlyUsedFonts: true,
    compress: true,
  });

  const interpreter = new Interpreter(sciolyff);

  const medals = mergedOptions.medals;
  const trophies = mergedOptions.trophies;

  const sidebarLineHeight = mergedOptions.sidebarLineHeight;
  const dividerOffset = mergedOptions.dividerOffset;

  const titleFontSize = mergedOptions.titleFontSize;
  const headerFontSize = mergedOptions.headerFontSize;
  const sidebarFontSize = mergedOptions.sidebarFontSize;
  const teamFontSize = mergedOptions.teamFontSize;
  const teamLineHeight = mergedOptions.teamLineHeight;

  const bgColor = mergedOptions.bgColor;
  const textColor = mergedOptions.textColor;
  const sidebarBgColor = mergedOptions.sidebarBgColor;
  const sidebarTextColor = mergedOptions.sidebarTextColor;
  const headerTextColor = mergedOptions.headerTextColor;

  function addTextSlide(title, subtitle) {
    doc.setFillColor(sidebarBgColor);
    doc.rect(0, 0, 16, 9, "F");
    doc.setFontSize(titleFontSize);
    doc.setFont("Roboto-Bold");
    doc.setTextColor(sidebarTextColor);
    const titleText = doc.splitTextToSize(title, 12);
    const textHeight = (1.5 * titleFontSize * titleText.length) / 72;
    doc.text(titleText, 8, 4.5 - textHeight / 2, {
      align: "center",
      lineHeightFactor: 1.5,
    });
    if (subtitle) {
      doc.setFontSize(titleFontSize * 0.75);
      doc.setFont("Roboto-Light");
      doc.text(subtitle, 8, 4.75 + textHeight / 2, {
        align: "center",
        lineHeightFactor: 1.5,
        maxWidth: 12,
      });
    }
  }

  function addPlacingSlides(name, teams) {
    const eventPlaces = teams.length;
    const sidebarOffset = 4.5 - (sidebarLineHeight * eventPlaces) / 2;

    // this loops through placings backwards to generate slides for each placing in reverse order
    Array(eventPlaces)
      .fill(0)
      .forEach((_, i) => {
        doc.addPage();

        // add sidebar
        doc.setFillColor(bgColor);
        doc.rect(0, 0, 16, 9, "F");
        doc.setFillColor(sidebarBgColor);
        doc.rect(dividerOffset, 0, 16 - dividerOffset, 9, "F");

        // add event name
        doc.setFontSize(headerFontSize);
        doc.setFont("Roboto-Bold");
        doc.setTextColor(headerTextColor);
        doc.text(name, 0.5, 0.625, { baseline: "top" });
        doc.setDrawColor(sidebarBgColor);
        doc.setLineWidth(1 / 16);
        doc.line(
          0.5,
          0.875 + headerFontSize / 72,
          2,
          0.875 + headerFontSize / 72
        );

        // add main team name
        // compute height
        doc.setFontSize(teamFontSize);
        doc.setFont("Roboto-Bold");
        doc.setTextColor(textColor);
        const team = teams[eventPlaces - (i + 1)];
        const text = doc.splitTextToSize(
          `${team.school}${team.suffix ? " " + team.suffix : ""}`,
          dividerOffset - 1
        );
        const offset =
          5 - (teamLineHeight * teamFontSize * (text.length + 1)) / 72 / 2; // 72 points per inch
        // add rank and team number
        doc.setFontSize(teamFontSize * 0.875);
        doc.setFont("Roboto-Light");
        doc.text(
          `${ordinalize(eventPlaces - i)}: Team ${team.number}`,
          0.5,
          offset,
          {
            baseline: "middle",
            lineHeightFactor: teamLineHeight,
          }
        );
        // add team name
        doc.setFontSize(teamFontSize);
        doc.setFont("Roboto-Bold");
        doc.text(
          text,
          0.5,
          offset + (teamLineHeight * teamFontSize) / 72 + 0.1,
          {
            baseline: "middle",
            lineHeightFactor: teamLineHeight,
          }
        );

        // add sidebar teams
        doc.setFontSize(sidebarFontSize);
        doc.setFont("Roboto-Regular");
        doc.setTextColor(sidebarTextColor);
        teams
          .slice(eventPlaces - (i + 1), eventPlaces)
          .reverse()
          .forEach((team, rank) => {
            rank = eventPlaces - rank;
            // split text for truncating if too long
            const text = doc.splitTextToSize(
              `${rank}. ` +
                formatSchool(team) +
                (team.suffix ? " " + team.suffix : ""),
              16 - dividerOffset - 1
            );
            doc.text(
              text[0] + `${text.length > 1 ? "…" : ""} (${team.number})`,
              dividerOffset + 0.5,
              sidebarOffset + (rank - 1) * sidebarLineHeight,
              { baseline: "top", maxWidth: 15 }
            );
          });
      });
  }

  // generate title slide
  addTextSlide(
    interpreter.tournament.year + " " + tournamentTitle(interpreter.tournament),
    "Awards Ceremony"
  );

  // generate event placing slides
  interpreter.events.forEach((event) => {
    const eventPlaces = Math.min(
      medals,
      event.placings.filter(
        (p) =>
          p.participated && (event.trial || !(p.team.exhibition || p.exempt))
      ).length
    );

    addPlacingSlides(
      event.name +
        (event.trial ? " (Trial)" : event.trailed ? " (Trialed)" : ""),
      event.placings
        .sort((a, b) => a.place - b.place)
        .slice(0, eventPlaces)
        .map((p) => p.team)
    );
  });

  // generate overall placing slides
  addTextSlide(
    "Overall Rankings",
    interpreter.tournament.year +
      " " +
      tournamentTitleShort(interpreter.tournament)
  );
  addPlacingSlides("Overall", interpreter.teams.slice(0, trophies));

  // generate thank you slide
  addTextSlide(
    "Thank You!",
    interpreter.tournament.year +
      " " +
      tournamentTitleShort(interpreter.tournament)
  );

  return doc.output("bloburi");
};
