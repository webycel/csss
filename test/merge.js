'use strict';

var fs = require('fs'),
	path = require('path'),
	promise = require('bluebird'),
	assert = require('assert'),
	css = require('css'),
	csss = require('./../csss.js'),
	testFiles = ['./css/test.css'],
	mergedCSS, testCSS;


describe('Merge CSS', function () {

	//get CSS from test input file
	//parse it
	//search for duplicates
	//merge selectors
	beforeEach(function () {
		return csss.getCSSFiles(testFiles).then(function (rawCSS) {
			var parsedCSS = csss.parseCss(rawCSS, testFiles);
			csss.detectDuplicateSelectors(parsedCSS).then(function (r) {
				csss.mergeCSS(r[0][0], r[0][1], r[0][2]).then(function (m) {
					mergedCSS = css.stringify(m[0]);
				});
			});
		});
	});

	//get CSS from result file for comparing
	beforeEach(function () {
		return csss.getCSSFiles(['./test/merge.css']).then(function (rawCSS) {
			testCSS = css.stringify(csss.parseCss(rawCSS, testFiles));
		});
	});

	it('it should merge all duplicate css selectors without breaking existing css rules', function () {
		assert.equal(true, mergedCSS === testCSS);
	});

});