# Duosmium Website

A JavaScript (11ty) rewrite of the [Duosmium website](https://www.github.com/Duosmium/duosmium), previously written in Ruby/Middleman.

Visit: [https://next.duosmium.org/](https://next.duosmium.org/)

## Duosmium Results

An [archive](https://next.duosmium.org/results/) of any tournament results
that have been output as or converted into the
[SciolyFF](https://github.com/duosmium/sciolyff-js) (Science Olympiad File Format).

### How to view locally

Minimal instructions for Unix-based systems (MacOS, Linux, etc.) that will likely need to be modified depending on your
development setup:

```sh
git clone https://www.github.com/Duosmium/duosmium-js.git
npm install
npm run build
```

Windows doesn't use Unix shells/commands, so we have a separate `build` function for it:

```cmd
git clone https://www.github.com/Duosmium/duosmium-js.git
npm install
npm run build-windows
```

### Developing

To run the site locally, you'll need the [Netlify CLI](https://docs.netlify.com/cli/get-started/) in order to have the On-Demand Builders (which are just Netlify functions) to run properly. The site itself requires installing NodeJS and NPM.

After installing the Netlify CLI, you'll need to run a full build to generate the CSS and JS files, since we can't watch with webpack.

```
npm run build # for Unix-based
npm run build-windows # for Windows
```

If you want to just build assets, you can use:

```
npm run build:webpack # for Unix-based
npm run build-windows:webpack # for Windows
```

To start the development server, run:

```
netlify dev # not currently functional on Windows
```

### Contributing

Contributions of code and tournament results are welcome.

To add new tournament results, make a [Pull
Request](https://help.github.com/en/articles/creating-a-pull-request) that adds
a YAML file in format of [SciolyFF](https://www.github.com/duosmium/sciolyff) in the
[data directory](/data).

A Google Sheets [input template](https://www.duosmium.org/input-template)
can be used to generate a CSV file that then can be converted into a SciolyFF
file using [this site](https://convert.duosmium.org). The files
already in the data directory should serve as an example of expected output.
Additionally, the `sciolyff` command line utility should be used to verify the
data files.

After the pull request is merged, the website will automatically generate an
HTML results page that can be viewed by clicking on the appropriate link in the
[site index](https://next.duosmium.org/results/).
