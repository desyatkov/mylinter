const postcss = require('postcss')

module.exports = postcss.plugin('postcss-get-sass-variables', (callback) => {
    let ignoredVars = ['$element-selector'] // list of variables we want to exclude   

    return (css) => {
        let scssCode = css['source']['input']['css'];
        let special = scssCode.match(/@function .*\)|@mixin .*\)/g) || []; // hunting vars to ignore (mixin / functions)
        special = special.map(str => str.match(/\$[A-Za-z-_]*/g) || []);
        special = [].concat(...special);
        ignoredVars = [...special, ...ignoredVars]; // join with the known ignored vars
        console.log(ignoredVars);
        let vars = scssCode.match(/\$[A-Za-z-_]*/g) || []; // getting all variables from file         
        vars = vars
            .filter(x => !ignoredVars.includes(x))
            .concat(ignoredVars.filter(x => !vars.includes(x))); // leaving the ignored vars out

        callback([...new Set(vars)].map(item => item.replace('$', '')));
    };
});