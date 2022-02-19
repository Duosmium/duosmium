module.exports = {
  eleventyComputed: {
    csvEvents: (data) =>
      Object.values(data.interpreters)
        .flatMap((i) => i.events.map((e) => e.name))
        .filter((e, i, s) => s.indexOf(e) === i)
        .sort()
        .join("\n"),
  },
};
