'use strict';

var assert = require('assert'),
	css = require('css'),
	csss = require('./../csss.js'),
	testFiles = ['./test/css/test-selectors.css'],
	results,
	resultsShouldBe;


describe('Print duplicate CSS selectors', function () {

	beforeEach(function () {
		//get CSS from test input file
		return csss.getCSSFiles(testFiles).then(function (rawCSS) {
			//parse it
			var parsedCSS = csss.parseCss(rawCSS, testFiles);
			//search for duplicates
			return csss.detectDuplicateSelectors(parsedCSS).then(function (r) {
				//get printed duplicate selectors
				return csss.printMultipleSelectors(r[0][0], r[0][1], r[0][2]).then(function (p) {
					results = p[0];
				});
			});
		});
	});

	beforeEach(function () {
		resultsShouldBe = 'undefined\u001b[7m\u001b[31mC\u001b[39m\u001b[33mS\u001b[39m\u001b[32mS\u001b[39m\u001b[34mS\u001b[39m \u001b[31mS\u001b[39m\u001b[33mT\u001b[39m\u001b[32mA\u001b[39m\u001b[34mR\u001b[39m\u001b[35mT\u001b[39m\u001b[31m\n\u001b[39m\u001b[33m\r\u001b[39m\u001b[32m\n\u001b[39m\u001b[34m\r\u001b[39m\u001b[27m\u001b[4mLooking for muliple selectors in\n\r\u001b[24m\u001b[34m./test/css/test-selectors.css\u001b[39m\n\r\n\r\u001b[31m\u001b[1mDUPLICATE: \u001b[22m.r1_text\u001b[39m\n\r    line 2\n\r    line 7\n\r    line 15\n\r    line 20\n\r\u001b[32m    sharing 3 properties\n\u001b[39m\n\r\u001b[31m\u001b[1mDUPLICATE: \u001b[22m.r1_title\u001b[39m\n\r    line 12\n\r    line 25\n\r\u001b[32m    sharing 1 property\n\u001b[39m\n\r\u001b[31m\u001b[1mDUPLICATE: \u001b[22m.r2_title\u001b[39m\n\r    line 31\n\r    line 39\n\r    line 43\n\r\u001b[32m    sharing 2 properties\n\u001b[39m\n\r\u001b[31m\u001b[1mDUPLICATE: \u001b[22m.m_text\u001b[39m\u001b[34m @media screen\u001b[39m\n\r    line 51\n\r    line 55\n\r\u001b[32m    sharing 2 properties\n\u001b[39m\n\r\u001b[31m\u001b[1mDUPLICATE: \u001b[22m.m_text\u001b[39m\u001b[34m @media print\u001b[39m\n\r    line 61\n\r    line 65\n\r\u001b[32m    sharing 2 properties\n\u001b[39m\n\r\u001b[33mDuplicate selectors: 58\n\r\n\r\u001b[39m\u001b[7m\u001b[31mC\u001b[39m\u001b[33mS\u001b[39m\u001b[32mS\u001b[39m\u001b[34mS\u001b[39m \u001b[31mE\u001b[39m\u001b[33mN\u001b[39m\u001b[32mD\u001b[39m\u001b[27m';
	});

	it('it should print a list with all duplicate selectors with additional information', function () {
		//assert.equal(true, results === resultsShouldBe);
	});

});