const slugify = require("@sindresorhus/slugify");
const eventTags = require("../../data/event-tags.json");

const tagSlug = (tag) => slugify(tag);

module.exports = () => {
  const categories = eventTags.categories.map((label) => ({
    label,
    slug: tagSlug(label),
  }));

  const eventSlugsByEventSlug = Object.fromEntries(
    Object.entries(eventTags.events).map(([eventName, tags]) => [
      slugify(eventName),
      tags.map(tagSlug).join(" "),
    ]),
  );

  return {
    categories,
    events: eventTags.events,
    eventSlugsByEventSlug,
  };
};
