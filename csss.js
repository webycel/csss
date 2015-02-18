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
	merge = false,
	duplicateSelectors = 0,
	mergedSelectors = 0,
	consoleOutput;


var csss = {

	/*
	    handle 'selectors' command
	 */
	selectorsAction: function (files) {

		var cssFiles = files || null;

		if (cssFiles !== null) {

			inputFiles = cssFiles.split(',');
			duplicateSelectors = 0;
			consoleOutput = '';

			csss.getCSSFiles(inputFiles)
				.then(function (rawCSS) {
					inputFiles = _.flatten(inputFiles);
					return csss.parseCss(_.flatten(rawCSS));
				}).then(csss.detectDuplicateSelectors).then(function (response) {
					if (program.merge) {
						//csss.printMultipleSelectors(response[0][0], response[0][1], response[0][2]);
						csss.mergeCSS(response[0][0], response[0][1], response[0][2]).then(csss.saveMergedFile);
					} else {
						csss.printMultipleSelectors(response[0][0], response[0][1], response[0][2]).then(function (results) {
							console.log(results[0]);
						});
					}
				});
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

		return csss.getCSSFiles(dirFiles);
	},

	/*
	    parse css from files
	 */
	parseCss: function (rawCSS, inputTestFiles) {

		if (inputTestFiles) inputFiles = inputTestFiles;

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

	},

	/*
	    detect duplicate selectors in all given css files
	 */
	detectDuplicateSelectors: function (obj) {

		var cssPromise = promise.map(inputFiles, function (filename, index) {

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

				return [obj, selectorArray, selectorMediaArray];
			}

			return null;

		});

		return promise.resolve(cssPromise);

	},

	/*
	    print all multiple selectors on console with info
	 */
	printMultipleSelectors: function (cssObj, selectors, mediaSelectors) {

		var printPromise = promise.map([1], function (map) {

			csss.printHead();

			var rules = cssObj.stylesheet.rules,
				declarations = {},
				i, d, j, sel, media, pos;

			/* print multiple selectors outside media queries */
			for (sel in selectors) {
				if (selectors[sel].length > 1) {
					consoleOutput += ((('DUPLICATE: ').bold + sel).red) + '\n\r';
					declarations = {};
					for (i in selectors[sel]) {
						d = rules[selectors[sel][i]].declarations;

						for (j in d) {
							if (declarations[d[j].property] == null) {
								declarations[d[j].property] = 0;
							}
							declarations[d[j].property] ++;
						}

						csss.printMultipleSelectorsLine(rules[selectors[sel][i]].position);
						duplicateSelectors++;
					}
					csss.printSharingProperties(declarations);
				}
			}

			/* print multiple selectors outside media queries */
			for (media in mediaSelectors) {
				for (sel in mediaSelectors[media]) {
					if (mediaSelectors[media][sel].length > 1) {
						consoleOutput += ((('DUPLICATE: ').bold + sel).red + (' @media ' + media).blue) + '\n\r';
						declarations = {};
						for (i in mediaSelectors[media][sel]) {
							pos = mediaSelectors[media][sel][i];
							d = rules[pos.media].rules[pos.rule].declarations;

							for (j in d) {
								if (declarations[d[j].property] == null) {
									declarations[d[j].property] = 0;
								}
								declarations[d[j].property] ++;
							}

							csss.printMultipleSelectorsLine(rules[pos.media].rules[pos.rule].position);
							duplicateSelectors++;
						}
						csss.printSharingProperties(declarations);
					}
				}
			}

			consoleOutput += (('Duplicate selectors: ' + duplicateSelectors + '\n\r\n\r').yellow);
			csss.printFooter();

			return consoleOutput;

		});

		return promise.resolve(printPromise);

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
		consoleOutput += (('    sharing ' + p + ' ' + txt + '\n').green) + '\n\r';
	},

	/*
	    print the single line containing filename and line for a selector
	 */
	printMultipleSelectorsLine: function (info) {
		if (inputFiles.length > 1) {
			consoleOutput += ('    ' + info.source + ' > line ' + info.start.line) + '\n\r';
		} else {
			consoleOutput += ('    line ' + info.start.line) + '\n\r';
		}
	},

	printHead: function () {
		consoleOutput += (('CSSS START\n\r\n\r').rainbow.inverse);
		consoleOutput += (('Looking for muliple selectors in\n\r').underline);
		consoleOutput += (inputFiles.toString().replace(/,/g, '\n').blue) + '\n\r\n\r';
	},

	printFooter: function () {
		consoleOutput += (('CSSS END').rainbow.inverse);
	},



	/*******
	    MERGE DUPLICATE SELECTORS
	********/
	mergeCSS: function (cssObj, selectors, mediaSelectors) {

		var cssPromise = promise.map(inputFiles, function (filename, index) {

			var rules = cssObj.stylesheet.rules;
			var mergedCSSObj = JSON.parse(JSON.stringify(cssObj)); //ewww! ugly copy
			var mergedCSSObjRules = mergedCSSObj.stylesheet.rules;
			var removePos = [];
			mergedSelectors = 0;

			/* merge multiple selectors outside media queries */
			for (var selector in selectors) {
				if (selectors[selector].length > 1) {

					var last, rl, lDec = [],
						lDecImp = [];
					selectors[selector] = _.uniq(selectors[selector]);

					for (var i = 0; i < selectors[selector].length; i++) {
						var sel = selectors[selector][i];

						if (i === 0) {
							last = selectors[selector][selectors[selector].length - 1];
							rl = rules[last];
							_.each(rl.declarations, function (d) {
								lDec.push(d.property);
							});
							_.each(mergedCSSObjRules[last].declarations, function (d) {
								lDecImp.push(d.property);
							});
						}

						if (i !== selectors[selector].length - 1) {

							var rs = rules[sel],
								sDec = [],
								important = [],
								ldi, l, d = mergedCSSObjRules[sel].declarations,
								j = d.length - 1;

							_.each(rs.declarations, function (d) {
								sDec.push(d.property);
							});

							if (rs.selectors.length === 1 && rl.selectors.length === 1 && selector === rl.selectors[0]) {
								/* exact the same selector
									.text = .text */

								if (_.isEqual(_.sortBy(sDec), _.sortBy(lDec))) {
									/* exact the same properties */

									//check for !important
									important = csss.getImportants(j, d);

									//keep !important and remove remaining duplicate properties
									if (important.length > 0) {
										mergedCSSObjRules[sel].declarations = _.intersection(d, important);

										for (l = important.length - 1; l >= 0; l--) {
											if (lDec.indexOf(important[l].property) >= 0) {
												if (mergedCSSObjRules[last].declarations[l].value.indexOf('!important') >= 0) {
													mergedCSSObjRules[sel].declarations.splice(l, 1);
												} else {
													mergedCSSObjRules[last].declarations.splice(l, 1);
												}
											}
										}

										mergedSelectors++;
									} else {
										removePos.push(sel);
										mergedSelectors++;
									}

								} else {

									var uniq = _.difference(sDec, lDec);
									//check for !important
									for (; j >= 0; j--) {
										if (d[j].value.indexOf('!important') >= 0) {
											important.push(d[j]);
										} else if (!_.contains(uniq, d[j].property)) {
											d.splice(j, 1);
										}
									}

									//keep !important and remove the duplicates in the last selector
									if (important.length > 0) {

										for (l = important.length - 1; l >= 0; l--) {
											if (lDec.indexOf(important[l].property) >= 0) {
												mergedCSSObjRules[last].declarations.splice(l, 1);
											}
										}

										mergedSelectors++;
									}

								}

							} else if (rs.selectors.length > 1 || rl.selectors.length > 1) {
								/* set of selectors 
									.text, .title | .text */

								if (_.isEqual(_.sortBy(sDec), _.sortBy(lDec))) {
									//exact the same properties

									if (_.difference(rs.selectors, rl.selectors).length === 0) {
										/* same set of selectors
											.text, .title | .text, .title */

										//check for !important
										important = csss.getImportants(j, d);

										//keep !important and remove remaining duplicate properties
										if (important.length > 0) {
											mergedCSSObjRules[sel].declarations = _.intersection(d, important);

											for (l = important.length - 1; l >= 0; l--) {
												ldi = lDecImp.indexOf(important[l].property);
												if (ldi >= 0) {
													mergedCSSObjRules[last].declarations.splice(ldi, 1);
													lDecImp.splice(ldi, 1);
												}
											}

											mergedSelectors++;
										} else {
											removePos.push(sel);
											mergedSelectors++;
										}

									} else {
										/* different set of selectors
											.text, .title, .article | .text, .title */

										important = csss.getImportants(j, d);

										if (important.length === 0) {
											//no !important in properties
											mergedCSSObjRules[sel].selectors = _.difference(mergedCSSObjRules[sel].selectors, mergedCSSObjRules[last].selectors);
											mergedSelectors++;
										} else {
											//has !important

											if (mergedCSSObjRules[last].selectors.length === 1) {

												for (l = important.length - 1; l >= 0; l--) {
													ldi = lDecImp.indexOf(important[l].property);
													if (ldi >= 0) {
														mergedCSSObjRules[last].declarations.splice(ldi, 1);
														lDecImp.splice(ldi, 1);
													}
												}
											}

											mergedSelectors++;
										}
									}
								}

							}

						} else {
							if (mergedSelectors > 0) {
								mergedSelectors++;
							}
						}

					}

					duplicateSelectors += selectors[selector].length;

				}
			}

			if (removePos.length > 0) {
				//order by index desc
				removePos = _.sortBy(_.uniq(removePos), function (num) {
					return num * -1;
				});

				//remove merged selectors from CSS object
				_.each(removePos, function (v) {
					mergedCSSObj.stylesheet.rules.splice(v, 1);
				});
			}

			return csss.cleanUpMergedCSS(mergedCSSObj);

		});

		return promise.resolve(cssPromise);

	},

	cleanUpMergedCSS: function (obj) {
		var mr = obj.stylesheet.rules;
		for (var c = mr.length - 1; c >= 0; c--) {
			if (mr[c].type === 'rule') {
				if (mr[c].selectors.length === 0 || mr[c].declarations.length === 0) {
					mr.splice(c, 1);
				}
			}
		}
		return obj;
	},

	getImportants: function (j, d) {
		var i = [];
		for (; j >= 0; j--) {
			if (d[j].value.indexOf('!important') >= 0) {
				i.push(d[j]);
			}
		}
		return i;
	},

	saveMergedFile: function (cssObj) {
		var newFile = program.merge;
		var cssString = css.stringify(cssObj[0]);

		fs.writeFile(newFile, cssString, function (error) {
			if (error) {
				console.log(error);
			} else {
				console.log(csss.printMergeSuccess(newFile));
			}
		});
	},

	printMergeSuccess: function (file) {
		csss.printHead();

		consoleOutput += (('Duplicate selectors: ' + duplicateSelectors + '\n\r').yellow);
		consoleOutput += (('Merged selectors: ' + mergedSelectors + '\n\r').blue);
		consoleOutput += (('Merged CSS was saved in: ' + file + '\n\r\n\r'));

		csss.printFooter();

		return consoleOutput;
	}

};

/* get command inputs */
program.version(pkg.version);

program
	.option('-m, --merge <newFileName>', 'merge all duplicate selectors into new file (still WIP!)');

program
	.usage('[options]')
	.option('-f, --files <file,...>', 'specify css files to process', csss.selectorsAction);

program.parse(process.argv);



module.exports = csss;