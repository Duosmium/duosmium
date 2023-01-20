import { jsPDF } from 'jspdf'
import Interpreter from 'sciolyff/interpreter'

import './fonts/Roboto-Bold-normal'
import './fonts/Roboto-Regular-normal'
import './fonts/Roboto-Light-normal'

import {
  formatSchool,
  generateFilename,
  ordinalize,
  tournamentTitle,
  tournamentTitleShort,
} from '../../../utils/sharedHelpers'

import logos from './logos'
import colors from '../../../cache/bg-colors.json'
import images from '../../../cache/tourn-images.json'

// https://stackoverflow.com/a/12646864/9129832
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

window.getColor = (sciolyff) => {
  if (!sciolyff) return

  const interpreter = new Interpreter(sciolyff)
  const filename = generateFilename(interpreter)
  return colors[filename] || '#1f1b35'
}

window.getImage = async (sciolyff) => {
  if (!sciolyff) return

  const interpreter = new Interpreter(sciolyff)
  const filename = generateFilename(interpreter)

  const imagePath = images[filename] || '/images/logos/default.png'

  const imgElement = new Image()
  imgElement.src = imagePath
  await imgElement.decode()

  const resp = await fetch(imagePath)
  const blob = await resp.blob()
  const dataUri = await new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })

  return [dataUri, [imgElement.naturalWidth, imgElement.naturalHeight]]
}

window.generatePdf = (sciolyff1, sciolyff2, options) => {
  if (!sciolyff1 && !sciolyff2) {
    return 'about:blank'
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [16, 9],
    putOnlyUsedFonts: true,
    compress: true,
  })
  doc.deletePage(1)

  const [interpreter1, interpreter2] = [sciolyff1, sciolyff2]
    .map((sciolyff) => (sciolyff ? new Interpreter(sciolyff) : null))
    .sort((a, b) =>
      // put the interpreter with the first division first
      a != null
        ? a.tournament.division.localeCompare(
            b?.tournament?.division ?? '\uffff'
          )
        : b == null
        ? 0
        : 1
    )

  const tournamentName =
    interpreter1.tournament.year +
    ' ' +
    tournamentTitleShort(interpreter1.tournament)

  doc.setDocumentProperties({
    title: tournamentName + ' Awards',
    author: 'Duosmium Results',
    creator: 'Duosmium Results',
  })

  const tournamentLogo = options.tournamentLogo
  const tournamentLogoDimensions = options.tournamentLogoDimensions
  const tournamentLogoRatio =
    tournamentLogo && tournamentLogoDimensions
      ? tournamentLogoDimensions[0] / tournamentLogoDimensions[1]
      : 1

  const logoTextHeight = tournamentLogo ? options.logoTextHeight : -1
  const logoAwardsHeight = options.logoAwardsHeight

  const sidebarLineHeight = options.sidebarLineHeight
  const dividerOffset = options.dividerOffset

  const titleFontSize = options.titleFontSize
  const headerFontSize = options.headerFontSize
  const sidebarFontSize = options.sidebarFontSize
  const teamFontSize = options.teamFontSize
  const teamLineHeight = options.teamLineHeight

  const themeBgColor = options.themeBgColor
  const themeTextColor = options.themeTextColor
  const bgColor = options.bgColor
  const textColor = options.textColor
  const headerTextColor = options.headerTextColor

  const randomOrder = options.randomOrder
  const combineTracks = options.combineTracks
  const overallSchools = options.overallSchools

  function addTextSlide(title, subtitle) {
    doc.addPage()

    // bg color
    doc.setFillColor(bgColor)
    doc.rect(0, 0, 16, 9, 'F')
    doc.setFillColor(themeBgColor)
    doc.rect(0, 0, 16, 9 - (logoTextHeight + 1), 'F')

    // add duos logo
    doc.addImage(
      logos[logoTextHeight > -1 ? 'dark' : 'light'], // use correct logo version
      'JPEG',
      15.25,
      8.25,
      0.375,
      0.375
    )

    // add tournament logo
    if (tournamentLogo) {
      doc.addImage(
        tournamentLogo,
        0.5,
        8.5 - logoTextHeight,
        logoTextHeight * tournamentLogoRatio,
        logoTextHeight
      )
    }

    // add text
    doc.setFontSize(titleFontSize)
    doc.setFont('Roboto-Bold')
    doc.setTextColor(themeTextColor)
    const titleText = doc.splitTextToSize(title, 12)
    const textHeight = (1.5 * titleFontSize * titleText.length) / 72
    const offset = (9 - (logoTextHeight + 1)) / 2
    doc.text(titleText, 8, offset - textHeight / 2, {
      align: 'center',
      lineHeightFactor: 1.5,
    })
    if (subtitle) {
      doc.setFontSize(titleFontSize * 0.75)
      doc.setFont('Roboto-Light')
      doc.text(subtitle, 8, offset + 0.25 + textHeight / 2, {
        align: 'center',
        lineHeightFactor: 1.5,
        maxWidth: 12,
      })
    }
  }

  function addPlacingSlides(name, data, scores = false) {
    const eventPlaces = data.length
    const sidebarOffset = 4.5 - (sidebarLineHeight * eventPlaces) / 2

    // this loops through placings backwards to generate slides for each placing in reverse order
    Array(eventPlaces)
      .fill(0)
      .forEach((_, i) => {
        doc.addPage()

        // add sidebar
        doc.setFillColor(bgColor)
        doc.rect(0, 0, 16, 9, 'F')
        doc.setFillColor(themeBgColor)
        doc.rect(dividerOffset, 0, 16 - dividerOffset, 9, 'F')

        // duos logo
        doc.addImage(logos['light'], 'JPEG', 15.25, 8.25, 0.375, 0.375)

        // add tournament logo
        if (tournamentLogo) {
          doc.addImage(
            tournamentLogo,
            dividerOffset - logoAwardsHeight * tournamentLogoRatio - 0.5,
            8.5 - logoAwardsHeight,
            logoAwardsHeight * tournamentLogoRatio,
            logoAwardsHeight
          )
        }

        // add event name
        doc.setFontSize(headerFontSize)
        doc.setFont('Roboto-Bold')
        doc.setTextColor(headerTextColor)
        const title = doc.splitTextToSize(name, dividerOffset - 1)
        const titleOffset = (1.25 * title.length * headerFontSize) / 72
        doc.text(title, 0.5, 0.625, {
          baseline: 'top',
          lineHeightFactor: 1.25,
        })
        doc.setDrawColor(themeBgColor)
        doc.setLineWidth(1 / 16)
        doc.line(0.5, 0.75 + titleOffset, 2, 0.75 + titleOffset)

        // add main team name
        // compute height
        doc.setFontSize(teamFontSize)
        doc.setFont('Roboto-Bold')
        doc.setTextColor(textColor)
        const [team, place] = data[eventPlaces - (i + 1)]
        const teamNameText = doc.splitTextToSize(
          `${team.school}${team.suffix ? ' ' + team.suffix : ''}`,
          dividerOffset - 1
        )
        const teamNameOffset =
          5 -
          (teamLineHeight *
            teamFontSize *
            (teamNameText.length + (scores ? 2 : 1))) /
            72 /
            2 // 72 points per inch
        // add rank and team number
        doc.setFontSize(teamFontSize * 0.875)
        doc.setFont('Roboto-Light')
        doc.text(
          `${ordinalize(place)}: Team ${team.number}${
            scores && team.earnedBid ? ' (Qualified)' : ''
          }`,
          0.5,
          teamNameOffset,
          {
            baseline: 'middle',
            lineHeightFactor: teamLineHeight,
          }
        )
        // add team name
        doc.setFontSize(teamFontSize)
        doc.setFont('Roboto-Bold')
        doc.text(
          teamNameText,
          0.5,
          teamNameOffset + (teamLineHeight * teamFontSize) / 72 + 0.1,
          {
            baseline: 'middle',
            lineHeightFactor: teamLineHeight,
          }
        )
        if (scores) {
          doc.setFontSize(teamFontSize * 0.75)
          doc.setFont('Roboto-Light')
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
              baseline: 'middle',
              lineHeightFactor: teamLineHeight,
            }
          )
        }

        // add sidebar teams
        doc.setFontSize(sidebarFontSize)
        doc.setFont('Roboto-Regular')
        doc.setTextColor(themeTextColor)
        data
          .slice(eventPlaces - (i + 1), eventPlaces)
          .reverse()
          .forEach(([team, rank], i) => {
            // split text for truncating if too long
            const text = doc.splitTextToSize(
              `${rank}. ` +
                formatSchool(team) +
                (team.suffix ? ' ' + team.suffix : ''),
              16 - dividerOffset - 1.25
            )
            doc.text(
              `${text[0]}${text.length > 1 ? '…' : ''}${
                scores
                  ? ' (' +
                    (team.tournament.hasTracks && !combineTracks
                      ? team.trackPoints
                      : team.points) +
                    ')'
                  : ' [' + team.number + ']'
              }${scores && team.earnedBid ? '*' : ''}`,
              dividerOffset + 0.5,
              sidebarOffset + (eventPlaces - (i + 1)) * sidebarLineHeight,
              { baseline: 'top', maxWidth: 15 }
            )
          })
      })
  }

  // generate title slide
  doc.outline.add(null, 'Welcome', { pageNumber: 1 })
  addTextSlide(
    interpreter1.tournament.year +
      ' ' +
      tournamentTitle(interpreter1.tournament),
    'Awards Ceremony'
  )

  // create a list of events, with an event entry for each track
  const events = []
  if (interpreter1.tournament.hasTracks && !combineTracks) {
    interpreter1.tournament.tracks.forEach((track) => {
      events.push(...interpreter1.events.map((e) => [e, track]))
    })
  } else {
    events.push(...interpreter1.events.map((e) => [e]))
  }
  if (interpreter2) {
    if (interpreter2.tournament.has && !combineTracks) {
      interpreter2.tournament.tracks.forEach((track) => {
        events.push(...interpreter2.events.map((e) => [e, track]))
      })
    } else {
      events.push(...interpreter2.events.map((e) => [e]))
    }
  }
  // sort (or shuffle) events
  if (randomOrder) {
    shuffleArray(events)
  } else {
    // this nonsense sorts the events by name, grouping non-trials (including trialed events) and trials separately
    events.sort((a, b) =>
      a[0].trial === b[0].trial
        ? (a[0].name + ' ' + a[0].tournament.division).localeCompare(
            b[0].name + ' ' + b[0].tournament.division
          )
        : a[0].trial
        ? 1
        : -1
    )
  }
  // generate event placing slides
  const placementOutline = doc.outline.add(null, 'Placements')
  events.forEach(([event, track]) => {
    const eventPlaces = Math.min(
      track ? track.medals : event.tournament.medals,
      // if less teams participated than medals, don't show empty places
      event.placings.filter(
        (p) =>
          (track ? p.team.track === track : true) && // filter by track if applicable
          p.participated &&
          (event.trial || !(p.team.exhibition || p.exempt))
      ).length
    )
    const eventName =
      event.name +
      ' ' +
      event.tournament.division +
      (event.trial ? ' (Trial)' : event.trialed ? ' (Trialed)' : '') +
      (track ? ' - ' + track.name : '')

    addTextSlide(eventName, tournamentName)
    doc.outline.add(placementOutline, eventName, {
      pageNumber: doc.getNumberOfPages(),
    })

    // i apologize for all these ternary operators
    addPlacingSlides(
      eventName,
      event.placings
        .filter((p) => (track ? p.team.track === track : true))
        .sort(
          (a, b) =>
            (track
              ? a.isolatedTrackPoints - b.isolatedTrackPoints
              : a.isolatedPoints - b.isolatedPoints) *
            (event.tournament.reverseScoring ? -1 : 1)
        )
        .filter((p, i) =>
          event.tournament.reverseScoring
            ? i < eventPlaces
            : (track ? p.isolatedTrackPoints : p.isolatedPoints) <= eventPlaces
        )
        .map((p) => [p.team, track ? p.isolatedTrackPoints : p.isolatedPoints])
    )
  })

  // generate overall placing slides
  const genOverall = (interpreter) => {
    let overallData = []
    if (interpreter.tournament.tracks.length === 0 || combineTracks) {
      overallData = [null]
    } else {
      overallData = interpreter.tournament.tracks
    }
    overallData.forEach((track) => {
      const overallTitle =
        'Overall Rankings' +
        (interpreter2 ? `: Division ${interpreter.tournament.division}` : '') +
        (track ? ' - ' + track.name : '')
      addTextSlide(overallTitle, tournamentName)
      doc.outline.add(null, overallTitle, {
        pageNumber: doc.getNumberOfPages(),
      })
      addPlacingSlides(
        overallTitle,
        interpreter.teams
          // filter by track if necessary
          .filter((t) => (track ? t.track === track : true))
          // sort by rank
          .sort((a, b) => (track ? a.trackRank - b.trackRank : a.rank - b.rank))
          // filter by school if necessary
          .reduce(
            (acc, t) => {
              if (overallSchools) {
                if (!acc[0].includes(t.school)) {
                  acc[1].push(t)
                  acc[0].push(t.school)
                }
              } else {
                acc[1].push(t)
              }
              return acc
            },
            [[], []]
          )[1]
          // slice to top placings
          .slice(0, track ? track.trophies : interpreter.tournament.trophies)
          // map to correct format
          .map((t) => [t, track ? t.trackRank : t.rank]),
        true
      )
    })
  }
  genOverall(interpreter1)
  if (interpreter2) {
    genOverall(interpreter2)
  }

  // generate thank you slide
  addTextSlide('Thank You!', tournamentName)
  doc.outline.add(null, 'Thank You!', { pageNumber: doc.getNumberOfPages() })

  return doc.output('bloburi')
}
