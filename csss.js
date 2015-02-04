#!/usr/bin/env node

var path = require('path'),
	promise = require('bluebird'),
	fs = promise.promisifyAll(require('fs')),
	css = require('css'),
	program = require('commander'),
	colors = require('colors'),
	rp = require('request-promise'),
	_ = require('underscore'),
	pkg = require(path.join(__dirname, 'package.json'));

var inputFiles;

/* get command inputs */
program.version(pkg.version);

program
	.command('selectors [options]')
	.description('detect all duplicate selectors of given array with files')
	.option('-f, --files <files>', 'specify css files to process')
	.action(selectorsAction);

program.parse(process.argv);


/*
    handle 'selectors' command
 */
function selectorsAction(files, options) {

	var cssFiles = options.files || null;

	if (cssFiles !== null) {

		inputFiles = cssFiles.split(',');

		getCSSFiles(inputFiles)
			.then(function (rawCSS) {
				inputFiles = _.flatten(inputFiles);
				return parseCss(_.flatten(rawCSS));
			}).then(detectDuplicateSelectors);
	}

}



/***************
DETECT DUPLUCATE SELECTORS
****************/

/*
    get css files
 */
function getCSSFiles(inputFiles) {

	var cssPromise = promise.map(inputFiles, function (filename, index) {

		if (filename.substr(0, 4) === 'http') {
			return getCSSFileFromUrl(filename, index);
		} else {
			try {
				if (fs.lstatSync(filename).isFile()) {
					return getCSSFileFromPath(filename, index);
				} else if (fs.lstatSync(filename).isDirectory()) {
					return getCSSFileFromDir(filename, index);
				}
			} catch (e) {
				inputFiles[index] += ' (invalid css file)';
				return '';
			}
		}

	});

	return promise.resolve(cssPromise);

}


function getCSSFileFromUrl(filename, index) {
	var options = {
		uri: filename,
		method: 'GET'
	};

	if (path.extname(filename).substr(0, 4) === '.css') {
		return rp(options).then(function (content) {
			return content;
		});
	} else {
		inputFiles[index] += ' (invalid css file)';
	}
	return '';
}

function getCSSFileFromPath(filename, index) {
	if (path.extname(filename).substr(0, 4) === '.css') {
		if (fs.existsSync(filename)) {
			return fs.readFileAsync(filename, 'utf-8').then(function (contents) {
				return contents;
			});
		}
	} else {
		inputFiles[index] += ' (invalid css file)';
	}
	return '';
}

function getCSSFileFromDir(filename, index) {
	var dirFiles = fs.readdirSync(filename);

	for (var i in dirFiles) {
		if (filename.charAt(filename.length - 1) === '/') {
			dirFiles[i] = filename + dirFiles[i];
		} else {
			dirFiles[i] = filename + '/' + dirFiles[i];
		}
	}

	inputFiles[index] = dirFiles;

	return getCSSFiles(dirFiles);
}

/*
    parse css from files
 */
function parseCss(rawCSS) {

	if (rawCSS.length > 0) {

		//store first css on object
		var obj = css.parse(rawCSS[0], {
			source: inputFiles[0]
		});

		//parse the remaining css files and merge the rules to the existing obj
		for (var i = 1; i < rawCSS.length; i++) {
			var o = css.parse(rawCSS[i], {
				source: inputFiles[i]
			});
			for (var j = 0; j < o.stylesheet.rules.length; j++) {
				obj.stylesheet.rules[obj.stylesheet.rules.length] = o.stylesheet.rules[j];
			}
		}

		return obj;
	}

	console.log('Error: nothing to parse :(');
	return null;

}

/*
    detect duplicate selectors in all given css files
 */
function detectDuplicateSelectors(obj) {

	if (obj !== null) {

		var rules = obj.stylesheet.rules;
		var selectorArray = {};
		var selectorMediaArray = {};

		rules.forEach(function (rule, i) {

			if (rule.type === 'rule') {
				rule.selectors.forEach(function (selector) {
					if (selectorArray[selector] == null) {
						selectorArray[selector] = [];
					}
					selectorArray[selector].push(i);
				});

			} else if (rule.type === 'media') {

				rule.rules.forEach(function (r, j) {
					if (r.type === 'rule') {
						r.selectors.forEach(function (selector) {
							if (selectorMediaArray[rule.media] == null) {
								selectorMediaArray[rule.media] = [];
							}
							if (selectorMediaArray[rule.media][selector] == null) {
								selectorMediaArray[rule.media][selector] = [];
							}
							selectorMediaArray[rule.media][selector].push({
								media: i,
								rule: j
							});
						});
					}
				});

			}

		});

		printMultipleSelectors(obj, selectorArray, selectorMediaArray);

	}

}

/*
    print all multiple selectors on console with info
 */
function printMultipleSelectors(css, selectors, mediaSelectors) {

	console.log(('CSSS START').rainbow.inverse);
	console.log(('\n\rLooking for muliple selectors in').underline);
	console.log(inputFiles.toString().replace(/,/g, '\n').blue);
	console.log('');

	var rules = css.stylesheet.rules;
	var counter = 0;

	/* print multiple selectors outside media queries */
	for (var sel in selectors) {
		if (selectors[sel].length > 1) {
			console.log((('DUPLICATE: ').bold + sel).red);
			var declarations = {};
			for (var i in selectors[sel]) {

				rules[selectors[sel][i]].declarations.forEach(function (prop) {
					if (declarations[prop.property] == null) {
						declarations[prop.property] = 0;
					}
					declarations[prop.property] ++;
				});
				printMultipleSelectorsLine(rules[selectors[sel][i]].position);
				counter++;
			}
			printSharingProperties(declarations);
		}
	}

	/* print multiple selectors outside media queries */
	for (var media in mediaSelectors) {
		for (var sel in mediaSelectors[media]) {
			if (mediaSelectors[media][sel].length > 1) {
				console.log((('DUPLICATE: ').bold + sel).red + (' @media ' + media).blue);
				var declarations = {};
				for (var i in mediaSelectors[media][sel]) {
					var pos = mediaSelectors[media][sel][i];
					rules[pos.media].rules[pos.rule].declarations.forEach(function (prop) {
						if (declarations[prop.property] == null) {
							declarations[prop.property] = 0;
						}
						declarations[prop.property] ++;
					});
					printMultipleSelectorsLine(rules[pos.media].rules[pos.rule].position);
					counter++;
				}
				printSharingProperties(declarations);
			}
		}
	}

	console.log(('\n\rDuplicate selectors: ' + counter + '\n\r').yellow);
	console.log(('CSSS END').rainbow.inverse);

}

function printSharingProperties(declarations) {
	var p = _.without(declarations, 0, 1).length,
		txt;
	if (p === 1) {
		txt = 'property';
	} else {
		txt = 'properties';
	}
	console.log(('    sharing ' + p + ' ' + txt + '\n').green);
}

/*
    print the single line containing filename and line for a selector
 */
function printMultipleSelectorsLine(info) {
	if (inputFiles.length > 1) {
		console.log('    ' + info.source + ' > line ' + info.start.line);
	} else {
		console.log('    line ' + info.start.line);
	}
}