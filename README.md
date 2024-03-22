# Duosmium Website

[![Netlify Status](https://api.netlify.com/api/v1/badges/e5240f06-f560-42cf-9484-ed20ba5c7e87/deploy-status)](https://app.netlify.com/sites/wonderful-noether-46a690/deploys)

A JavaScript (11ty) rewrite of the [former Duosmium website](https://www.github.com/Duosmium/duosmium-ruby), previously written in Ruby/Middleman.

Visit: [https://www.duosmium.org/](https://www.duosmium.org/)

## Duosmium Results

An [archive](https://www.duosmium.org/results/) of any tournament results
that have been output as or converted into the
[SciolyFF](https://github.com/duosmium/sciolyff-js) (Science Olympiad File Format).

### How to view locally

Minimal instructions for Unix-based systems (MacOS, Linux, etc.) that will likely need to be modified depending on your
development setup:

```sh
git clone https://www.github.com/Duosmium/duosmium.git
npm install
npm run build
```

Windows doesn't use Unix shells/commands, so we have a separate `build` function for it:

```cmd
git clone https://www.github.com/Duosmium/duosmium.git
npm install
npm run build-windows
```

### Developing

To run the site locally, you'll need the [Netlify CLI](https://docs.netlify.com/cli/get-started/) in order to have the On-Demand Builders (which are just Netlify functions) to run properly. The site itself requires installing NodeJS and NPM.

To build the site for production, use:

```
npm run build # for Unix-based
npm run build-windows # for Windows
```

If you want to just build assets, you can use:

```
npm run build:webpack # for Unix-based
npm run build-windows:webpack # for Windows
```

The Eleventy dev server doesn't work well with the SciolyFF Previewer, but can be helpful for the results site. To run the Eleventy dev server, use:

```
npm run dev
```

If you have the Netlify CLI installed, you can run everything (including the previewer) locally. You may need to wait for assets to build before the site is ready. Make sure you're accessing the Netlify proxy server (usually port 8888) instead of the Eleventy dev server (usually port 8080).

```
npm run netlify
```

### Contributing

Contributions of code and tournament results are welcome.

To add new tournament results, make a [Pull
Request](https://help.github.com/en/articles/creating-a-pull-request) that adds
a YAML file in format of [SciolyFF](https://www.github.com/duosmium/sciolyff-js) in the
[data directory](/data). You can also join the [Discord Server](https://discord.gg/D6H5KNScHB), to contribute.

A Google Sheets [input template](https://www.duosmium.org/input-template)
can be used to generate a CSV file that then can be converted into a SciolyFF
file using [this site](https://preview.duosmium.org). The files
already in the data directory should serve as an example of expected output.
Additionally, the `sciolyff` command line utility should be used to verify the
data files.

After the pull request is merged, the website will automatically generate an
HTML results page that can be viewed by clicking on the appropriate link in the
[site index](https://www.duosmium.org/results/).
