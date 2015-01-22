#!/usr/bin/env node

var path = require('path'),
    promise = require('bluebird'),
    fs = promise.promisifyAll(require('fs')),
    css = require('css'),
    program = require('commander'),
    pkg = require( path.join(__dirname, 'package.json') );


/* get command inputs */
program.version(pkg.version);

program
    .command('selectors [options]')
    .description('detect all duplicate selectors of given array with files')
    .option('-f, --files [files]', 'Define all css files')
    .action(selectorsAction);

program.parse(process.argv);


/*
    handle 'selectors' command
 */
function selectorsAction(files, options) {

    var cssFiles = options.files || null;

    if(cssFiles !== null) {

        cssFiles = cssFiles.split(',');

        //TODO: check file paths

        getCSSFiles(cssFiles).then(function(rawCSS) {
            return parseCss(rawCSS, cssFiles);
        }).then(detectDuplicateSelectors);
    }

}



/*
    get css files
 */
function getCSSFiles(files) {

    var cssPromise = promise.map(files, function(filename) {

        if(fs.existsSync(filename)) {
            return fs.readFileAsync(filename, 'utf-8').then(function(contents) {
                return contents;
            });
        }

        throw new Error('CCSS: could not open ' + path.join(process.cwd(), filename));

    });

    return promise.resolve(cssPromise);

}

/*
    parse css from files
 */
function parseCss(rawCSS, files) {
    if(rawCSS.length > 0) {
        //store first css on object
        var obj = css.parse(rawCSS[0], { source: files[0] });

        //parse the remaining css files and merge the rules to the existing obj
        for(var i = 1; i < rawCSS.length; i++) {
            var o = css.parse(rawCSS[i], { source: files[i] });
            for(var j = 0; j < o.stylesheet.rules.length; j++) {
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

    if(obj !== null) {

        var rules = obj.stylesheet.rules;
        var selectorArray = {};
        var multipleSelectors = [];

        rules.forEach(function(rule, i) {
            if(rule.type === 'rule') {
                rule.selectors.forEach(function(selector) {
                    if(selectorArray[selector] == null) {
                        selectorArray[selector] = [];
                    }
                    selectorArray[selector].push(i);
                });
            }
        });

        for(var index in selectorArray) {
            if(selectorArray[index].length > 1) {
                multipleSelectors.push(selectorArray[index]);
            }
        }

        console.log(multipleSelectors);
        
    }

}