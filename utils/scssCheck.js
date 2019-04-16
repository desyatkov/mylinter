const nodeSass = require('node-sass');
const chalk = require('chalk');
const log = console.log;

let known_global_scss_vars = '$element-selector: !default; $wrapper-selector: !default;';

module.exports = (scssStr, variablesFromYml, cb) => {
    if (variablesFromYml) {
        for (let i = 0, length1 = variablesFromYml.length; i < length1; i++) { // making sure to include variables from yml
            known_global_scss_vars += (` $${variablesFromYml[i]}: !default;`);
        }
    }
    nodeSass.render({
        data: known_global_scss_vars + scssStr,
    }, function(err, result) {
        if (err) {            
            log(`${chalk.red('✖')} ${chalk.bgHex('#fc0006').keyword('black').bold('scss parse error:')} ${err}`);
            cb(false);
        } else {
            log(`${chalk('👌')} scss looking fine can write autoprefixes`);            
            cb(true);
        }
    });
}