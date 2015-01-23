#!/usr/bin/env node

var path = require('path'),
    promise = require('bluebird'),
    fs = promise.promisifyAll(require('fs')),
    css = require('css'),
    program = require('commander'),
    colors = require('colors'),
    pkg = require( path.join(__dirname, 'package.json') );

var inputFiles;

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

        inputFiles = cssFiles.split(',');

        //TODO: check file paths

        getCSSFiles(inputFiles).then(function(rawCSS) {
            return parseCss(rawCSS, inputFiles);
        }).then(detectDuplicateSelectors);
    }

}



/*
    get css files
 */
function getCSSFiles() {

    var cssPromise = promise.map(inputFiles, function(filename) {

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
function parseCss(rawCSS) {
    if(rawCSS.length > 0) {
        //store first css on object
        var obj = css.parse(rawCSS[0], { source: inputFiles[0] });

        //parse the remaining css files and merge the rules to the existing obj
        for(var i = 1; i < rawCSS.length; i++) {
            var o = css.parse(rawCSS[i], { source: inputFiles[i] });
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

        /* remove single selectors */
        /*(for(var index in selectorArray) {
            if(selectorArray[index].length > 1) {
                multipleSelectors.push(selectorArray[index]);
            }
        }*/

        printMultipleSelectors(obj, selectorArray);
        
    }

}

/*
    print all multiple selectors on console with info
 */
function printMultipleSelectors(css, selectors) {
    for(var sel in selectors) {
        if(selectors[sel].length > 1) {
            console.log('DUPLICATE: ' + sel.red);
            for(var i in selectors[sel]) {
                var info = css.stylesheet.rules[selectors[sel][i]].position;
                console.log(info.source + ' > line ' + info.start.line);
            }
            console.log('');
        }
    }
}