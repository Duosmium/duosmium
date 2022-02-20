$(document).ready(function () {
  // Change layout and filter results when user starts typing in search bar
  $("div.search-wrapper input").on("input", function () {
    let search_text = $(this).val().toLowerCase().trim();
    if (search_text.length === 0) {
      $("div.search-wrapper").removeClass("searching");
      $("style#search_style").html("");
    } else {
      $("div.search-wrapper").addClass("searching");

      // inspired by
      // http://www.redotheweb.com/2013/05/15/client-side-full-text-search-in-css.html
      // may not scale well?
      var search_html = "";
      // replace "div c" with "div-c", and like, for the data-search attribute
      let words = search_text.replace(/(div|division) ([abc])/, "$1-$2");
      words.split(/\s+/).forEach(function (word) {
        // split on whitespace
        search_html +=
          'div.card:not([data-search*="' +
          word +
          '"])' +
          "{ display: none; }\n";
      });
      // const options = {
      //   keys: ['words']
      // };

      // fuse.js implementation - need to figure out what to do with the html
      // const fuse = new Fuse(JSON.parse(File.read('./results/tournaments.json')), options);
      // const output = fuse.search(search_text);

      $("style#search_style").html(search_html);
    }

    // Save state of search bar between page loads
    localStorage.setItem("searchstring", $(this).val());
    localStorage.setItem("searchstyle", search_html);
  });

  // Clear search bar with x button
  $("#searchTournamentsClear").click(function () {
    $("#searchTournaments").val("");
    $("style#search_style").html("");
    localStorage.setItem("searchstyle", "");
    localStorage.setItem("searchstring", "");
    $("div.search-wrapper").removeClass("searching");
    $("div.search-wrapper div.floating-label").removeClass("has-value");
  });

  // Restore search bar status if exists
  if (localStorage.getItem("searchstring")) {
    $("div.search-wrapper input").val(localStorage.getItem("searchstring"));
    $("style#search_style").html(localStorage.getItem("searchstyle"));
    $("div.search-wrapper div.floating-label").addClass("has-value");
    $("div.search-wrapper").addClass("searching");
  }

  // Cause input box to lose focus after hitting enter (esp. for mobile devices
  // where keyboard takes up a lot of the screen)
  $("input#searchTournaments").change(function (e) {
    $("input#searchTournaments").blur();
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

  // load tournament logos lazily
  // https://developers.google.com/web/fundamentals/performance/lazy-loading-guidance/images-and-video/
  var lazy_images = $("img.lazy");
  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function (
      entries,
      observer
    ) {
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
  }

  // Disabled for now (may try to find a way to enable for PWAs only?) because
  // of issues with back button
  // // Make links to full results instantly trigger a splash screen
  // $("a.full-results").on("click", function() {
  //  $(this).parent().parent().children("div.splash-wrapper").addClass("splash");
  // });
});
