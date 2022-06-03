import Chartist from "chartist";
import ChartistAxisTitle from "chartist-plugin-axistitle";
import "./eventHisto.scss";

const labels = histogramData.count.map(
  (_, i) => histogramData.start + histogramData.width * i
);

new Chartist.Bar(
  document.querySelector("div.ct-chart"),
  {
    labels,
    series: [histogramData.count],
  },
  {
    plugins: [
      ChartistAxisTitle({
        axisX: {
          axisTitle: "Score",
          offset: {
            x: 0,
            y: 46,
          },
        },
        axisY: {
          axisTitle: "Frequency",
          flipTitle: true,
          offset: {
            x: 0,
            y: -8,
          },
        },
      }),
    ],
  }
).on("draw", function (data) {
  if (data.type === "bar") {
    data.element.attr({
      style: `stroke-width: ${100 / histogramData.count.length}%`,
    });
  }
});
