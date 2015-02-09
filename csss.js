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

var inputFiles,
	merge = false;


var csss = {

	/*
	    handle 'selectors' command
	 */
	selectorsAction: function (files) {

		var cssFiles = files || null;

		if (cssFiles !== null) {

			inputFiles = cssFiles.split(',');

			csss.getCSSFiles(inputFiles)
				.then(function (rawCSS) {
					inputFiles = _.flatten(inputFiles);
					return csss.parseCss(_.flatten(rawCSS));
				}).then(csss.detectDuplicateSelectors);
		}

	},



	/***************
	DETECT DUPLUCATE SELECTORS
	****************/

	/*
	    get css files
	 */
	getCSSFiles: function (inputFiles) {

		var cssPromise = promise.map(inputFiles, function (filename, index) {

			if (filename.substr(0, 4) === 'http') {
				return csss.getCSSFileFromUrl(filename, index);
			} else {
				try {
					if (fs.lstatSync(filename).isFile()) {
						return csss.getCSSFileFromPath(filename, index);
					} else if (fs.lstatSync(filename).isDirectory()) {
						return csss.getCSSFileFromDir(filename, index);
					}
				} catch (e) {
					return '';
				}
			}

		});

		return promise.resolve(cssPromise);

	},

	/*
	    get css files from a URL
	 */
	getCSSFileFromUrl: function (filename, index) {
		var options = {
			uri: filename,
			method: 'GET'
		};

		if (path.extname(filename).substr(0, 4) === '.css') {
			return rp(options).then(function (content) {
				return content;
			});
		}
		return '';
	},

	/*
	    get css files from a local path
	 */
	getCSSFileFromPath: function (filename, index) {
		if (path.extname(filename).substr(0, 4) === '.css') {
			if (fs.existsSync(filename)) {
				return fs.readFileAsync(filename, 'utf-8').then(function (contents) {
					return contents;
				});
			}
		}
		return '';
	},

	/*
	    get css files from a lcoal directory
	 */
	getCSSFileFromDir: function (filename, index) {
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
	},

	/*
	    parse css from files
	 */
	parseCss: function (rawCSS, inputTestFiles) {

		if (inputTestFiles) inputFiles = inputTestFiles;

		if (rawCSS.length > 0) {

			//store first css on object
			var obj = css.parse(rawCSS[0], {});

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

	},

	/*
	    detect duplicate selectors in all given css files
	 */
	detectDuplicateSelectors: function (obj) {

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

			if (program.merge) {
				//csss.printMultipleSelectors(obj, selectorArray, selectorMediaArray);
				csss.mergeCSS(obj, selectorArray, selectorMediaArray).then(csss.saveMergedFile);
			} else {
				csss.printMultipleSelectors(obj, selectorArray, selectorMediaArray);
			}

		}

	},

	/*
	    print all multiple selectors on console with info
	 */
	printMultipleSelectors: function (cssObj, selectors, mediaSelectors) {

		console.log(('CSSS START').rainbow.inverse);
		console.log(('\n\rLooking for muliple selectors in').underline);
		console.log(inputFiles.toString().replace(/,/g, '\n').blue);
		console.log('');

		var rules = cssObj.stylesheet.rules;
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
					csss.printMultipleSelectorsLine(rules[selectors[sel][i]].position);
					counter++;
				}
				csss.printSharingProperties(declarations);
			}
		}

		/* print multiple selectors outside media queries */
		for (var media in mediaSelectors) {
			for (sel in mediaSelectors[media]) {
				if (mediaSelectors[media][sel].length > 1) {
					console.log((('DUPLICATE: ').bold + sel).red + (' @media ' + media).blue);
					declarations = {};
					for (i in mediaSelectors[media][sel]) {
						var pos = mediaSelectors[media][sel][i];
						rules[pos.media].rules[pos.rule].declarations.forEach(function (prop) {
							if (declarations[prop.property] == null) {
								declarations[prop.property] = 0;
							}
							declarations[prop.property] ++;
						});
						csss.printMultipleSelectorsLine(rules[pos.media].rules[pos.rule].position);
						counter++;
					}
					csss.printSharingProperties(declarations);
				}
			}
		}

		console.log(('\n\rDuplicate selectors: ' + counter + '\n\r').yellow);
		console.log(('CSSS END').rainbow.inverse);

	},

	/*
	    print amount of shared properties
	 */
	printSharingProperties: function (declarations) {
		var p = _.without(declarations, 0, 1).length,
			txt;
		if (p === 1) {
			txt = 'property';
		} else {
			txt = 'properties';
		}
		console.log(('    sharing ' + p + ' ' + txt + '\n').green);
	},

	/*
	    print the single line containing filename and line for a selector
	 */
	printMultipleSelectorsLine: function (info) {
		if (inputFiles.length > 1) {
			console.log('    ' + info.source + ' > line ' + info.start.line);
		} else {
			console.log('    line ' + info.start.line);
		}
	},



	/*******
	    MERGE DUPLICATE SELECTORS
	********/
	mergeCSS: function (cssObj, selectors, mediaSelectors) {

		var cssPromise = promise.map(inputFiles, function (filename, index) {

			var rules = cssObj.stylesheet.rules;

			/* merge multiple selectors outside media queries */
			_.each(selectors, function (selector) {
				if (selector.length > 1) {
					var last, rl, lDec = [];
					_.each(selector, function (sel, i) {

						if (i === 0) {
							last = selector[selector.length - 1];
							rl = rules[last];
							_.each(rl.declarations, function (d) {
								lDec.push(d.property);
							});
						}

						if (i !== selector.length - 1) {

							//console.log(rules[last]);
							//console.log(rules[sel]);
							var rs = rules[sel];

							//exact the same selector | .text = .text
							if (rs.selectors.length === 1 && rl.selectors.length === 1 && rs.selectors[0] === rl.selectors[0]) {

								var sDec = [];
								_.each(rs.declarations, function (d) {
									sDec.push(d.property);
								});

								//exact the same properties
								if (_.isEqual(sDec, lDec)) {
									rules.splice(sel, 1);
								}

							}

							/*
							_.each(rules[sel].declarations, function (dec) {
								_.each(rules[last].declarations, function (fDec) {


									//console.log(fDec);
									//console.log(dec);


									return;



									if (fDec.property === dec.property) {
										fDec.value = dec.value;
										if (rules[sel].selectors.length > 1) {
											//console.log(sel);
											//rules[sel].selectors = _.without(rules[sel].selectors, sel);
										} else {

										}
										//console.log(rules[first].selectors);
										//console.log(rules[sel].selectors);
									}
								});
							});*/

						}

					});
				}
			});

			return cssObj;

		});

		return promise.resolve(cssPromise);

	},

	saveMergedFile: function (cssObj) {

		var newFile = program.merge;
		var cssString = css.stringify(cssObj[0]);

		fs.writeFile(newFile, cssString, function (error) {
			if (error) {
				console.log(error);
			} else {
				console.log('saved!');
			}
		});
	}

}

/* get command inputs */
program.version(pkg.version);

program
	.option('-m, --merge <newFileName>', 'merge all duplicate selectors into new file');

program
	.usage('[options]')
	.option('-f, --files <file,...>', 'specify css files to process', csss.selectorsAction);

program.parse(process.argv);



module.exports = csss;