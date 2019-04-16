const chalk = require('chalk');
const log = console.log;
const path = require('path');
const _ = require('lodash');

let result = null;

module.exports = ({
    doc = 'expected yml doc',
    variablesYmlKeys = 'expected mandatory yml keys',
    variablesYml = 'expected yml variables',
    variablesScss = 'expected scss variables',
    relPath = 'expected rel path'
} = {}) => {

    // YAML PARSING ERROR
    if (doc.errors.length > 0) {
        log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold('YAML error').padEnd(77, '.')}${doc.errors[0].message}`, `template ${relPath}`)
        if (doc.errors[0].source.resolved.value) log(`${chalk.red('⤻')} ${chalk.blue('^^^^^^^^^^').padEnd(38, '.')}${doc.errors[0].source.resolved.value}`, `template ${relPath}`)
        result = {
            valid: false,
            emptyYml: null
        };
    }
    // YAML MANDATORY KEYS
    if (!variablesYmlKeys.includes('default_css_attributes') || !variablesYmlKeys.includes('css_form')) {
        log(`${chalk.red('✖')} ${!variablesYml.default_css_attributes?'default_css_attributes':'css_form'} missing in YAML`, `template ${path.relative(__dirname, relPath)}`)
        result = {
            valid: false,
            emptyYml: null
        };
    }

    // MAKE SURE YML CONTAINS SCSS VARIABLES
    if (variablesYml.default_css_attributes) {
        const variablesYmlNames = Object.keys(variablesYml.default_css_attributes);
        const variablesXor = _.xor(variablesScss, variablesYmlNames);

        _.mixin({
            toPairsDeep: obj => _.flatMap(
                _.toPairs(obj), ([k, v]) =>
                _.isObjectLike(v) ? _.toPairsDeep(v) : [
                    [k, v]
                ])
        });

        const resultVariablesYmlForm = _(variablesYml.css_form)
            .toPairsDeep()
            .filter(([k, v]) => k === 'key')
            .map(1)
            .value()


        // DIFF BETWEEN YML css_attributes and CSS_FORM YML
        const resultVariables = _.xor(resultVariablesYmlForm, variablesYmlNames);
        if (resultVariables.length > 0) {
            const detectymlFile = (item) => {
                const res = variablesYmlNames.includes(item) ? ['default_css_attributes', 'css_form'] : ['css_form', 'default_css_attributes'];
                return res;
            }
            resultVariables.forEach(item => {
                log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold(item)} ${'variable exist'.padStart(20, '.') } in ${detectymlFile(item)[0]}  and missing in ${detectymlFile(item)[1]}`, `${chalk.blue(relPath)}`)
            })
            result = {
                valid: false,
                emptyYml: null
            };
        }

        // DIFF BETWEEN SASS AND YAML VARIABLES
        if (variablesXor.length > 0) {
            const detectymlFile = (item, array) => {
                const res = variablesYml.default_css_attributes[item] !== undefined ? ['YML', 'SCSS'] : ['SCSS', 'YML'];
                return res;
            }
            variablesXor.forEach(item => {
                var countDot = 40 - item.length;
                log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold("$"+item)} ${'variable exist'.padStart(countDot, '.') } in ${detectymlFile(item)[0]} ymlFile and missing in ${detectymlFile(item)[1]}`, `${chalk.blue(relPath)}`)
            })
            result = {
                valid: false,
                emptyYml: null
            };
        }
    } // if we don't have any yml configuration, no need to compare it to scss
    if (!variablesYml.default_css_attributes && result === null) {
        return result = {
            valid: true,
            emptyYml: true
        };
    } else if (variablesYml.default_css_attributes && result === null) {
        return result = {
            valid: true,
            emptyYml: false
        };
    } else {
    	return result;
    }
}