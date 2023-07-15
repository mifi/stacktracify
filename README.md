# stacktracify

**NOTICE:** This is a modified version of the excellent `stacktracify` CLI-tool, created by: [mifi/stacktracify](https://github.com/mifi/stacktracify)

This modified version allows for passing in a path to a folder of source maps (which was previously limited to a single file). 

In addition to this, support for the following parameters have also been added: 

| Parameter name | Abbreviation | Description                                                                                               |
|----------------|--------------|-----------------------------------------------------------------------------------------------------------|
| `--legend`     | `-l`         | Prints a legend, indicating when unable to not find a source map, or resolve line from a found source map |
| `--debug`      | `-d`         | Prints debug information, useful for determining lookup-logic for relative paths etc.                     |

**WARNING:** This version has not been made available to be installed on [npm](https://www.npmjs.com/), and hence must be installed
by cloning this repository, running `yarn install` and linking the index.js file as an executable script (or invoke directly)!

## Original documentation

Have you ever been faced with a stacktrace that looks like this?

```
TypeError h is not a function. (In 'h()', 'h' is undefined) 
    main.jsbundle:954:5353 
    main.jsbundle:112:423 p
    main.jsbundle:112:1740 
    main.jsbundle:112:423 p
    main.jsbundle:112:898 n
    main.jsbundle:112:1273 
    main.jsbundle:50:205 c
    main.jsbundle:50:1623 b
    main.jsbundle:50:488 _
    [native code] value
    [native code] value
```

...perhaps from production from a minified web JS bundle or a React Native error report.

**stacktracify takes a source map and a stack trace from your clipboard (or from a file) and outputs a readable stacktrace with proper line numbers for each line**

Example output:
```
TypeError h is not a function. (In 'h()', 'h' is undefined) 
    at getAuthToken (logic/api.js:67:20)
    at authRequest (logic/api.js:127:8)
    at data (logic/SaveQueue.js:30:20)
    at op (logic/SaveQueue.js:43:29)
    at __callImmediates (node_modules/react-native/Libraries/BatchedBridge/MessageQueue.js:143:11)
```

## Install

```
npm install -g stacktracify
```

## Usage

**Copy a minified stacktrace to your clipboard** - then run:

```
stacktracify /path/to/js.map
```

Can also read stacktrace from file. For more info:
```
stacktracify --help
```

## See also

- https://github.com/gabmontes/source-map-cli (only takes one line at a time)
- https://github.com/janekp/mapstrace (not a CLI, not easy to use for any stack trace)
