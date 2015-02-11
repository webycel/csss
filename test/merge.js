'use strict';

var fs = require('fs'),
	path = require('path'),
	promise = require('bluebird'),
	assert = require('assert'),
	css = require('css'),
	csss = require('./../csss.js'),
	testFiles = ['./test/css/test-merge.css'],
	mergedCSS, testCSS;


describe('Merge CSS', function () {

	beforeEach(function () {
		//get CSS from test input file
		return csss.getCSSFiles(testFiles).then(function (rawCSS) {
			//parse it
			var parsedCSS = csss.parseCss(rawCSS, testFiles);
			//search for duplicates
			csss.detectDuplicateSelectors(parsedCSS).then(function (r) {
				//merge selectors
				csss.mergeCSS(r[0][0], r[0][1], r[0][2]).then(function (m) {
					mergedCSS = css.stringify(m[0]);
				});
			});
		});
	});

	beforeEach(function () {
		//get CSS from result file for comparing
		return csss.getCSSFiles(['./test/merge-results.css']).then(function (rawCSS) {
			testCSS = css.stringify(csss.parseCss(rawCSS, testFiles));
		});
	});

	it('it should merge all duplicate css selectors without breaking existing css rules', function () {
		assert.equal(true, mergedCSS === testCSS);
	});

});