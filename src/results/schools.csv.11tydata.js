module.exports = {
  eleventyComputed: {
    csvSchools: (data) =>
      Object.values(data.interpreters)
        .flatMap((i) => i.teams.map((t) => [t.school, t.city ?? "", t.state]))
        .filter(
          (t, i, s) =>
            s.findIndex(
              (e) => e[0] === t[0] && e[1] === t[1] && e[2] === t[2]
            ) === i
        )
        .sort(
          (a, b) =>
            a[0].localeCompare(b[0]) ||
            a[1].localeCompare(b[1]) ||
            a[2].localeCompare(b[2])
        )
        .map(([school, city, state]) => `${school},${city},${state}`)
        .join("\n"),
  },
};
