# stacktracify

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