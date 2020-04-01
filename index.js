#!/usr/bin/env node
'use strict';
const meow = require('meow');
const stackTraceParser = require('stacktrace-parser');
const fs = require('fs-extra');
const clipboardy = require('clipboardy');
const { SourceMapConsumer } = require('source-map');

const cli = meow(`
	Usage
	  $ stacktracify <map-path>

	Options
    --file, -f  (default is read from clipboard)
	  --stoponfirst -s (stop processing stack on first error)

	Examples
	  $ stacktracify /path/to/js.map --file /path/to/my-stacktrace.txt
	  $ stacktracify /path/to/js.map --file /path/to/my-stacktrace.txt --stoponfirst
`, {
  flags: {
    file: {
      type: 'string',
      alias: 'f',
    },
    stoponfirst: {
      type: 'boolean',
      alias: 's',
    },
  }
});


const file = cli.flags.file;
const stoponfirst = cli.flags.stoponfirst;

(async () => {
  try {
    const mapPath = cli.input[0];
    if (!mapPath) cli.showHelp();
    const mapContent = JSON.parse(await fs.readFile(mapPath, 'utf-8'));
    const smc = await new SourceMapConsumer(mapContent);

    let str;
    if (file !== undefined) {
      str = await fs.readFile(file, 'utf-8');
    } else {
      str = await clipboardy.read();
    }
    const stack = stackTraceParser.parse(str);
    if (stack.length === 0) throw new Error('No stack found');

    const header = str.split('\n').find(line => line.trim().length > 0);

    if (header) console.log(header);

    var errString = '';
    stack.forEach(({ lineNumber, column }) => {
      try {
        const pos = smc.originalPositionFor({ line: lineNumber, column });
        if (pos && pos.line != null) {
          console.log(`    at ${pos.name || ''} (${pos.source}:${pos.line}:${pos.column})`);
        }
      } catch (err) {
        if (stoponfirst) {
          throw (err);
        }
        errString += err.stack;
      }
    });

    if (errString.length > 0) {
      console.error(errString);
    }
  } catch (err) {
    console.error(err);
  }
})();
