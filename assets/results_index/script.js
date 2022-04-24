$(document).ready(function () {
  let doc = [];
  fetch("/results/tournaments.json")
    .then((resp) => resp.json())
    .then((data) => {
      doc = data;
      if ($("#searchTournaments").val()) {
        search();
      }
    });

  // announcement bar close button
  $(".announcement .close-announcement").on("click", (e) => {
    $(e.target.parentElement).remove();
  });

  // load tournament logos lazily
  // https://developers.google.com/web/fundamentals/performance/lazy-loading-guidance/images-and-video/
  var lazy_images = $("img.lazy");
  let lazyImageObserver;
  if ("IntersectionObserver" in window) {
    lazyImageObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          let lazy_image = entry.target;
          lazy_image.src = lazy_image.dataset.src;
          lazy_image.classList.remove("lazy");
          observer.unobserve(lazy_image);
        }
      });
    });
    lazy_images.each(function () {
      lazyImageObserver.observe(this);
    });
  } else {
    // fallback for browsers that don't support IntersectionObserver
    lazy_images.each(function () {
      this.src = this.dataset.src;
      this.classList.remove("lazy");
    });
  }

  // helper for generating tournament card
  function appendTournament(t, index = Infinity) {
    const clone = document
      .querySelector("#card-template")
      .content.firstElementChild.cloneNode(true);
    const qs = (q) => clone.querySelector(q);
    qs("div.card-header").style.backgroundColor = t.bgColor;
    qs("h2.card-title span[data-slot='content']").innerText =
      t.year + " " + t.title;
    qs("h2.card-title span[data-slot='division']").classList.add(
      "division-" + t.division.toLowerCase()
    );
    qs("h2.card-title small[data-slot='division']").innerText =
      "Division " + t.division;
    if (!t.official) {
      qs("h2.card-title span.official").remove();
    }
    if (!t.preliminary) {
      qs("h2.card-title span.preliminary").remove();
    }
    qs("h3.card-subtitle span[data-slot='date']").innerText = t.date;
    qs("h3.card-subtitle span[data-slot='location']").innerText = t.location;
    qs("div.card-body").setAttribute("data-target", "#summary-" + t.filename);
    qs("div.card-body").setAttribute("aria-controls", "summary-" + t.filename);
    if (index < 8 || lazyImageObserver === undefined) {
      qs("div.card-body img").src = t.logo;
      qs("div.card-body img").classList.remove("lazy");
    } else {
      qs("div.card-body img").setAttribute("data-src", t.logo);
      // add observer
      lazyImageObserver.observe(qs("div.card-body img"));
    }
    qs("div.card-body div.summary").setAttribute("id", "summary-" + t.filename);

    const teamTempate = document.querySelector("#summary-team");
    Object.entries(t.teams).forEach(([title, team]) => {
      const teamEntry = teamTempate.content.cloneNode(true);
      teamEntry.querySelector("dt").innerText = title;
      teamEntry.querySelector("dd span[data-slot='content']").innerText = (
        team.school +
        " " +
        team.suffix
      ).trim();
      teamEntry.querySelector("dd small[data-slot='state']").innerText =
        team.state;
      teamEntry.querySelector("dd span[data-slot='points']").innerText =
        team.points;
      qs("div.card-body div.summary dl").appendChild(teamEntry);
    });

    qs("div.card-footer a").href = "/results/" + t.filename + "/";
    qs("div.card-footer span.teams-count").innerText = t.teamCount + " Teams";

    // register event handlers
    // Blur logo when showing tournament summary
    $(qs("div.card-body div.summary")).on("show.bs.collapse", function () {
      qs("div.card-body img").classList.add("blur");
    });
    $(qs("div.card-body div.summary")).on("hide.bs.collapse", function () {
      qs("div.card-body img").classList.remove("blur");
      // Unfocus tournament summary button when summary is hidden
      qs("div.card-actions button").blur(); // remove focus (not visual blur)
    });

    // Make tournament summary toggle when clicking summary button
    qs("div.card-actions button").addEventListener("click", function () {
      qs("div.card-body").click();
    });

    // Make team badge and card header function as second link to full results
    // (doing this in JS to prevent duplication of link element for accessibility)
    qs("div.card-actions span.teams-count").addEventListener(
      "click",
      function () {
        qs("a.full-results").click();
      }
    );
    qs("div.card-header").addEventListener("click", function () {
      qs("div.card-footer a.full-results").click();
    });

    // append tournament card to page
    $("div.results-index-card-grid").append(clone);
  }
  // helper for clearing search bar
  function clearSearch() {
    $("#searchTournaments").val("");
    localStorage.setItem("searchstring", "");
    window.history.pushState("", "", "/results/");
    $("div.search-wrapper").removeClass("searching");
    $("div.search-wrapper div.floating-label").removeClass("has-value");
    $("div.results-index-card-grid").empty();
    doc.slice(0, 36).map(appendTournament);
    $("div.results-index-card-grid").append(
      "<div class='grid-infobox'><button id='all-results'>View all.</button></div>"
    );
    $("#all-results").on("click", function () {
      $(this).parent().remove();
      doc.slice(36).map(appendTournament);
    });
  }

  // Clear search bar with x button
  $("#searchTournamentsClear").click(clearSearch);

  // add functionality to initial button on load
  $("#all-results").on("click", function () {
    $(this).parent().remove();
    doc.slice(36).map(appendTournament);
  });

  // search tournaments and display results
  let searchHistoryCommitted = false;
  function search(full = false) {
    let search_text = $("#searchTournaments").val().toLowerCase().trim();
    if (search_text.length === 0) {
      clearSearch();
    } else {
      $("div.search-wrapper div.floating-label").addClass("has-value");
      $("div.search-wrapper").addClass("searching");

      $("div.search-wrapper").addClass("searching");

      let words = search_text
        .replace(/(div|division) ([abc])/, "$1-$2") // replace division spaces with hyphens
        .replace(/\s([abc])(?:\s|$)/, " div-$1 ") // replace a/b/c on its own with div-x
        .split(/[^\w-]+/);
      $("div.results-index-card-grid").empty();
      let empty = true;
      let truncated = false;
      let count = 0;
      doc.forEach((tournament, i) => {
        if (words.every((word) => tournament.keywords.includes(word))) {
          if (!full && count >= 96) {
            truncated = true;
            return;
          }
          empty = false;
          appendTournament(tournament, i);
          count++;
        }
      });
      if (empty) {
        $("div.results-index-card-grid").append(
          "<div class='grid-infobox'>No results found!</div>"
        );
      }
      if (truncated) {
        $("div.results-index-card-grid").append(
          "<div class='grid-infobox'>Displaying first 96 results. <button id='all-results'>View all.</button></div>"
        );
        $("#all-results").on("click", () => {
          search(true);
        });
      }
    }

    // Save state of search bar between page loads
    localStorage.setItem("searchstring", search_text);
    localStorage.setItem("searchDate", Date.now());

    if (searchHistoryCommitted) {
      searchHistoryCommitted = false;
      window.history.pushState(search_text, "", "?search=" + search_text);
    } else {
      window.history.replaceState(search_text, "", "?search=" + search_text);
    }
  }
  // flag committed on change
  $("div.search-wrapper input").on("change", () => {
    searchHistoryCommitted = true;
  });

  // debounce search input
  let searchTimeout;
  $("div.search-wrapper input").on("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      search();
    }, 150);
  });

  // update search on history change
  window.addEventListener("popstate", function (e) {
    $("#searchTournaments").val(e.state);
    search();
  });

  // Restore search bar status if exists
  if (window.location.pathname.endsWith("/results/")) {
    if (window.location.search.includes("search=")) {
      const params = new URLSearchParams(window.location.search);
      $("#searchTournaments").val(params.get("search"));
      search();
    } else if (
      localStorage.getItem("searchstring") &&
      // Don't restore if it's been more than a day
      Date.now() - parseInt(localStorage.getItem("searchDate")) <
        1000 * 60 * 60 * 24
    ) {
      const searchstring = localStorage.getItem("searchstring");
      $("#searchTournaments").val(searchstring);
      window.history.pushState(searchstring, "", "?search=" + searchstring);
      search();
    }
  }

  // Cause input box to lose focus after hitting enter (esp. for mobile devices
  // where keyboard takes up a lot of the screen)
  $("#searchTournaments").change(function (e) {
    $("#searchTournaments").blur();
  });

  // Prevent see all from appending anchor tag to URL (makes the back button
  // logic more consistent)
  $("a#see-all").on("click", function (e) {
    e.preventDefault();
    $(document).scrollTop($(this.hash).offset().top);
  });

  // Hide the scroll to top button if already near top or at bottom of page
  var hide_scroll_button = function () {
    if (
      $(this).scrollTop() < $(window).height() ||
      $(this).scrollTop() + $(window).height() > $(document).height() - 10
    ) {
      $("a#scroll-back").fadeOut();
    } else {
      $("a#scroll-back").fadeIn();
    }
  };
  // Prevent scroll to top from appending anchor tag to URL (makes the back
  // button logic more consistent)
  $("a#scroll-back").on("click", function (e) {
    e.preventDefault();
    this.blur(); // remove focus from button
    window.scrollTo(0, 0);
  });

  hide_scroll_button(); // call initially
  $(window).scroll(hide_scroll_button);

  // Blur logo when showing tournament summary (in results index)
  $("div.card-body div.summary").on("show.bs.collapse", function () {
    $(this).parent().children("img").addClass("blur");
  });
  $("div.card-body div.summary").on("hide.bs.collapse", function () {
    $(this).parent().children("img").removeClass("blur");
    // Unfocus tournament summary button when summary is hidden
    let button = $(this).parent().parent().find("div.card-actions button");
    button.blur(); // removes the focus, nothing to do with visual blur
  });

  // Make tournament summary toggle when clicking summary button
  $("div.card-actions button").on("click", function () {
    $(this).parent().parent().children("div.card-body").click();
  });

  // Make team badge and card header function as second link to full results
  // (doing this in JS to prevent duplication of link element for accessibility)
  $("div.card-actions span.teams-count").on("click", function () {
    $(this).parent().children("a.full-results")[0].click();
  });
  $("div.card-header").on("click", function () {
    $(this).parent().find("div.card-footer a.full-results")[0].click();
  });

  // Disabled for now (may try to find a way to enable for PWAs only?) because
  // of issues with back button
  // // Make links to full results instantly trigger a splash screen
  // $("a.full-results").on("click", function() {
  //  $(this).parent().parent().children("div.splash-wrapper").addClass("splash");
  // });
});
