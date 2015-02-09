'use strict';

var fs = require('fs'),
	path = require('path'),
	promise = require('bluebird'),
	assert = require('assert'),
	css = require('css'),
	csss = require('./../csss.js'),
	testFiles = ['./css/test.css'],
	testCSS, resultCSS;


describe('Merge CSS', function () {

	//get CSS from test input file
	beforeEach(function () {
		return csss.getCSSFiles(testFiles).then(function (rawCSS) {
			testCSS = css.stringify(csss.parseCss(rawCSS, testFiles));
		});
	});

	//get CSS from result file
	beforeEach(function () {
		return csss.getCSSFiles(['./test/merge.css']).then(function (rawCSS) {
			resultCSS = css.stringify(csss.parseCss(rawCSS, testFiles));
		});
	});

	it('it should merge all duplicate css selectors without breaking existing css rules', function () {
		assert.equal(true, testCSS === resultCSS);
	});

});