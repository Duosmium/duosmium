const Chartist = require("chartist");

let overallChart;
let currentTeam = { rank: null, track: null, closest: null };

$(document).ready(function () {
  // "Fix" 100vh problem on iOS and mobile Chrome
  var wrapper = $("div.results-classic-wrapper");
  window.onresize = function () {
    if ($(window).height() < wrapper.height()) {
      wrapper.height($(window).height());
    } else {
      wrapper.css("height", "");
    }
  };
  window.onresize();

  // Make link to /results/ work as a back button if appropriate
  $("a.js-back-button").on("click", function (e) {
    e.preventDefault();
    if (document.referrer === this.href && window.history.length > 1) {
      window.history.back();
    } else {
      window.location = this.href;
    }
  });

  // Share button functionality
  var timeout;
  $("button#share-button").on("click", function () {
    var share_url = window.location.href;
    if (navigator.share) {
      // use Web Share API if available
      navigator.share({
        url: share_url,
      });
    } else {
      // otherwise copy to clipboard
      let dummy = document.createElement("input");
      document.body.append(dummy);
      dummy.value = share_url;
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);

      // show snack
      window.clearTimeout(timeout);
      var display_snack = function () {
        $("div#share-snack div.snackbar-body").html(
          "Link copied! " + share_url
        );
        $("div#share-snack").addClass("show");
        timeout = window.setTimeout(function () {
          $("div#share-snack").removeClass("show");
        }, 2000);
      };
      if ($("div#share-snack").hasClass("show")) {
        $("div#share-snack").removeClass("show");
        window.setTimeout(display_snack, 200);
      } else {
        display_snack();
      }
    }
  });

  // First, make sure all default checkboxes are checked initially (browser
  // might tend to remember previous state and it's not apparent to the user
  // that the boxes would be unchecked without going into the menu)
  $("div#filters input:checkbox").prop("checked", true);

  // Correct minimum width of header and footnotes based on number of events
  var fix_width = function (extra) {
    let width = $("colgroup.event-columns col").length * 2 + 28 + extra;
    let min_width = width + 0.5;
    $("div.results-classic-thead-background").css(
      "min-width",
      min_width + "em"
    );
    $("div.results-classic-header").css("width", width + "em");
    $("div.results-classic-footnotes").css("width", width + "em");
  };
  // called later by sort_and_toggle_event_rank(), and intial values set by
  // inline CSS anyways (to prevent jump when JS loads)

  // Highlight table columns on hover
  // Adapted from https://css-tricks.com/row-and-column-highlighting/
  $("table.results-classic td, table.results-classic th").hover(
    function () {
      $("colgroup col").eq($(this).index()).addClass("hover");
    },
    function () {
      $("colgroup col").eq($(this).index()).removeClass("hover");
    }
  );

  // Sort teams (rows) by various things
  // Adapted from https://blog.niklasottosson.com/javascript/jquery-sort-table-rows-on-column-value/
  var sort_select = function () {
    let thing = $("#sort-select option:selected").val();

    var sort_by_number = function (a, b) {
      let number_a = parseInt($(a).find("td.number").text());
      let number_b = parseInt($(b).find("td.number").text());

      return number_a - number_b;
    };

    var sort_by_school = function (a, b) {
      let school_a = $(a).find("td.team").text();
      let school_b = $(b).find("td.team").text();

      if (school_a > school_b) {
        return 1;
      } else if (school_a < school_b) {
        return -1;
      } else {
        return sort_by_number(a, b);
      }
    };

    var sort_by_rank = function (a, b) {
      let rank_col = $("#event-select option:selected").val();

      if (rank_col === "all") {
        var rank_a = parseInt($(a).find("td.rank").text());
        var rank_b = parseInt($(b).find("td.rank").text());
      } else {
        var rank_a = parseInt(
          $(a).find("td.event-points").eq(rank_col).attr("data-sortable-place")
        );
        var rank_b = parseInt(
          $(b).find("td.event-points").eq(rank_col).attr("data-sortable-place")
        );
      }

      let diff = rank_a - rank_b;
      if (diff !== 0) {
        return diff;
      } else {
        return sort_by_number(a, b);
      }
    };

    var sort_by_state = function (a, b) {
      let state_a = $(a).find("td.team small").text();
      let state_b = $(b).find("td.team small").text();

      if (state_a > state_b) {
        return 1;
      } else if (state_a < state_b) {
        return -1;
      } else {
        return sort_by_number(a, b);
      }
    };

    switch (thing) {
      case "number":
        var sort_fun = sort_by_number;
        break;
      case "school":
        var sort_fun = sort_by_school;
        break;
      case "rank":
        var sort_fun = sort_by_rank;
        break;
      case "state":
        var sort_fun = sort_by_state;
        break;
      default:
        return;
    }

    let rows = $("table.results-classic tbody tr").get();
    rows.sort(sort_fun);

    $.each(rows, function (index, row) {
      $("table.results-classic tbody").append(row);
    });
  };
  sort_select(); // call sort immediately if selection is different from default
  $("#sort-select").change(sort_select); // call sort on selection change

  // Show the hidden column with event points directly next to team name for
  // small screens
  var sort_and_toggle_event_rank = function () {
    let rank_col = $("#event-select option:selected").val();

    // re-sort if by rank is selected (needed because rank would be by event)
    if ($("#sort-select option:selected").val() === "rank") {
      sort_select();
    }

    if (rank_col !== "all") {
      $("div.results-classic-wrapper").addClass("event-focused");
      $("th.event-points-focus div").text(
        $("#event-select option:selected").text()
      );

      // copy info from event-points to event-points-focus
      let rows = $("table.results-classic tbody tr").get();
      $.each(rows, function (index, row) {
        let source_elem = $(row).find("td.event-points").eq(rank_col);
        let source_html = source_elem.html();
        let points = source_elem.attr("data-points");
        let points_elem = $(row).find("td.event-points-focus");
        points_elem.children("div").html(source_html);
        points_elem.attr("data-points", points);
      });

      fix_width(4);
    } else {
      $("div.results-classic-wrapper").removeClass("event-focused");
      $("th.event-points-focus div").text("");
      $("td.event-points-focus div").text("");
      fix_width(0);
    }
  };
  sort_and_toggle_event_rank();
  $("#event-select").change(sort_and_toggle_event_rank);

  // Sort when clicking on table headers
  $("th.event-points").on("click", function (e) {
    if (e.target !== this) {
      return;
    }
    let index = Array.prototype.indexOf.call(this.parentNode.children, this);
    $("#event-select").val(index - 5);
    $("#event-select").change();
  });
  $("th.rank, th.total-points").on("click", function () {
    $("#event-select").val("all");
    $("#event-select").change();
    $("#sort-select").val("rank");
    $("#sort-select").change();
  });
  $("th.number").on("click", function () {
    $("#sort-select").val("number");
    $("#sort-select").change();
  });
  $("th.team").on("click", function () {
    $("#sort-select").val("school");
    $("#sort-select").change();
  });
  $("th.event-points-focus").on("click", function () {
    $("#sort-select").val("rank");
    $("#sort-select").change();
  });

  // Filter and toggle displayed data based on track radio buttons
  if (document.getElementById("track") !== null) {
    let filter_track = function () {
      let sub = $("input[type=radio][name=track]:checked")
        .attr("id")
        .substring(4);
      let rows = $("tr[data-track]");
      let filterRows = $("#filters #team-filter div[data-track]");
      if (sub === "combined") {
        rows.show();
        filterRows.show();

        $.each($("td.event-points"), function (index, cell) {
          $(cell).attr("data-points", $(cell).attr("data-o-points"));
          $(cell).attr("data-true-points", $(cell).attr("data-o-true-points"));
          $(cell).attr("data-notes", $(cell).attr("data-o-notes"));
          $(cell).attr("data-place", $(cell).attr("data-o-place"));
          let sup_tag = $(cell).attr("data-o-sup-tag") || "";
          let cell_html = $(cell).attr("data-points") + sup_tag;
          $(cell).children("div").html(cell_html);
        });
        $.each($("td.rank"), function (index, cell) {
          $(cell).attr("data-points", $(cell).attr("data-o-points"));
          let sup_tag = $(cell).attr("data-o-sup-tag") || "";
          $(cell)
            .children("div")
            .html($(cell).attr("data-points") + sup_tag);
        });
        $.each($("td.total-points"), function (index, cell) {
          $(cell).html($(cell).attr("data-o-points"));
        });
        $("#track").html("Combined");
        $(".set-modal-track").html("combined");
      } else {
        $.each(rows, function (index, row) {
          if ($(row).attr("data-track") === sub) {
            $(row).show();
          } else {
            $(row).hide();
          }
        });

        $.each(filterRows, function (index, row) {
          if ($(row).attr("data-track") === sub) {
            $(row).show();
          } else {
            $(row).hide();
          }
        });

        $.each($("td.event-points"), function (index, cell) {
          $(cell).attr("data-points", $(cell).attr("data-sub-points"));
          $(cell).attr(
            "data-true-points",
            $(cell).attr("data-sub-true-points")
          );
          $(cell).attr("data-notes", $(cell).attr("data-sub-notes"));
          $(cell).attr("data-place", $(cell).attr("data-sub-place"));
          let sup_tag = $(cell).attr("data-sub-sup-tag") || "";
          let cell_html = $(cell).attr("data-points") + sup_tag;
          $(cell).children("div").html(cell_html);
        });
        $.each($("td.rank"), function (index, cell) {
          $(cell).attr("data-points", $(cell).attr("data-sub-points"));
          $(cell).children("div").html($(cell).attr("data-sub-points"));
        });
        $.each($("td.total-points"), function (index, cell) {
          $(cell).html($(cell).attr("data-sub-points"));
        });
        $("#track").html(sub);
        $(".set-modal-track").html(sub);
      }

      let style = document.querySelector("#track-style");
      let source = document.querySelector(`#sub-${CSS.escape(sub)}-style`);
      style.innerHTML = source.innerHTML;

      sort_and_toggle_event_rank(); // sort again after filtering b/c bad coupling
    };
    $("input[type=radio][name=track]").change(filter_track);
    filter_track();
  }

  // Toggle rows based on checkboxes
  $("div#team-filter input").change(function () {
    let id = $(this).attr("id");
    let all_box = $("div#team-filter input#allTeams");
    let team_boxes = $("div#team-filter input").not("#allTeams");

    if (id === "allTeams") {
      if ($(this).prop("checked")) {
        team_boxes.not(":checked").trigger("click");
      } else {
        team_boxes.filter(":checked").trigger("click");
      }
      all_box.prop("indeterminate", false);
    } else {
      let team_number = id.slice("team".length);
      let r =
        "table.results-classic tr[data-team-number='" + team_number + "']";

      if ($(this).prop("checked")) {
        $(r).show();
      } else {
        $(r).hide();
      }
      if (team_boxes.not(":checked").length === 0) {
        all_box.prop("indeterminate", false);
        all_box.prop("checked", true);
      } else if (team_boxes.filter(":checked").length === 0) {
        all_box.prop("indeterminate", false);
        all_box.prop("checked", false);
      } else {
        all_box.prop("indeterminate", true);
      }
    }
  });
  $("div#state-filter input").change(function () {
    let id = $(this).attr("id");
    let all_box = $("div#state-filter input#allStates");
    let state_boxes = $("div#state-filter input").not("#allStates");

    if (id === "allStates") {
      if ($(this).prop("checked")) {
        state_boxes.not(":checked").trigger("click");
      } else {
        state_boxes.filter(":checked").trigger("click");
      }
      all_box.prop("indeterminate", false);
    } else {
      let state = id.slice("state".length);
      let r = "table.results-classic tr[data-state='" + state + "']";

      if ($(this).prop("checked")) {
        $(r).show();
      } else {
        $(r).hide();
      }
      if (state_boxes.not(":checked").length === 0) {
        all_box.prop("indeterminate", false);
        all_box.prop("checked", true);
      } else if (state_boxes.filter(":checked").length === 0) {
        all_box.prop("indeterminate", false);
        all_box.prop("checked", false);
      } else {
        all_box.prop("indeterminate", true);
      }
    }
  });

  // Cribbed from https://git.io/Je8kk
  function getOrdinal(n) {
    let s = ["th", "st", "nd", "rd"],
      v = parseInt(n.match(/\d+/)) % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // charting functions based off unosmium/sciolyff-rust
  function filterClosest(data, value, center) {
    data.sort((d1, d2) => {
      let diff1 = Math.abs(d1[value] - center);
      let diff2 = Math.abs(d2[value] - center);
      return diff1 - diff2;
    });
    return data.slice(0, 15);
  }

  function updateOverallChart() {
    let { rank, track, closest } = currentTeam;
    track = track === "combined" ? false : track;
    let allPoints = track ? teamPointsByTrack[track] : teamPoints;
    let points = allPoints.map((score, index) => {
      return { x: index + 1, y: score };
    });

    if (closest) {
      points = filterClosest(points, "x", rank);
    }

    let data = {
      series: [[{ x: rank, y: allPoints[rank - 1] }], points],
    };
    if (overallChart) {
      overallChart.update(data);
    } else {
      let options = {
        low: 0,
        showLine: false,
        axisX: {
          type: Chartist.AutoScaleAxis,
          onlyInteger: true,
        },
        axisY: {
          onlyInteger: true,
        },
      };
      overallChart = new Chartist.Line("#team-detail .ct-chart", data, options);
    }
  }

  // Populate Team Detail table and rest of modal
  $("td.number a").on("click", function () {
    let source_row = $(this).closest("tr");
    let points = source_row.children("td.total-points").text();
    let place = source_row.children("td.rank").attr("data-points");

    $("div#team-detail span#number").html($(this).text());
    $("div#team-detail span#points").html(points);
    $("div#team-detail span#place").html(getOrdinal(place));
    $("div#team-detail span#team").html(source_row.attr("data-team-name"));
    $("div#team-detail span#school").html(source_row.attr("data-school"));
    let h =
      "/results/schools/#" + source_row.attr("data-school").replace(/ /g, "_");
    $("a#other-results").attr("href", h);

    let table_rows = $("div#team-detail table tbody").children();
    $.each(source_row.children("td.event-points"), function (index, td) {
      let dest_row = table_rows.eq(index);
      dest_row.attr("data-points", $(td).attr("data-points"));
      dest_row.children().eq(1).html($(td).attr("data-true-points"));
      let data_place = $(td).attr("data-place");
      let place = data_place === "" ? "n/a" : getOrdinal(data_place);
      dest_row.children().eq(2).html(place);
      dest_row.children().eq(3).html($(td).attr("data-notes"));
    });

    // show graphs (inspired from unosmium/sciolyff-rust)
    let track = $(".set-modal-track")
      ? $(".set-modal-track").first().text()
      : false;
    currentTeam.rank = Number(place);
    currentTeam.track = track;
  });

  $("#team-detail .modal-body details#graphs").on("toggle", function () {
    updateOverallChart();
  });

  $("#team-detail").on("shown.bs.modal", function () {
    updateOverallChart();
  });

  // button toggle for graph switching
  $("#team-detail .chart-toggle button").on("click", function (e) {
    if (this.classList.contains("selected")) {
      e.preventDefault();
      return;
    }
    let closest = this.id === "show-closest";
    this.classList.add("selected");
    $(closest ? "#show-all" : "#show-closest").removeClass("selected");
    currentTeam.closest = closest;
    updateOverallChart();
  });

  // Click team team detail link when clicking team name or number table cells
  $("td.number, td.team, td.team > small").on("click", function (e) {
    if (e.target === this) {
      // if clicked on directly
      $(this).closest("tr").find("td.number a").click();
    }
  });

  // Enable popovers for further explanation of badge abbrevs
  $(function () {
    $('[data-toggle="popover"]').popover();
  });
});
