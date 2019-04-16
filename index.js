const chalk = require('chalk');
const log = console.log;
const path = require('path');
const fs = require('fs')
const postcss = require('postcss')
const postScss = require('postcss-scss');
const nodeSass = require('node-sass');
const autoPrefixer = require('autoprefixer');
const YAML = require('yaml');
const _ = require('lodash');
const postcssGetVars = require('./utils/getRules');
let variablesScss = [];
let goodToGo = false;
const allDecl = postcssGetVars((obj) => variablesScss = obj.slice(0));

module.exports = () => {
    const args = process.argv.slice(2)
    const pathLink = args.map(inx => path.dirname(inx))
    const uniqueLink = [...new Set(pathLink)];

    uniqueLink.forEach(link => {
        const relPath = path.relative(__dirname, link);

        fs.readFile(path.resolve(link, 'style.scss'), (err, css) => {

            postcss([allDecl, autoPrefixer])
                .process(css, { syntax: postScss, from: undefined })
                .then((res) => {                    
                    const ymlFile = fs.readFileSync(path.resolve(link, 'settings.yml'), 'utf8')
                    const variablesYmlCST = YAML.parseCST(ymlFile);
                    const doc = new YAML.Document();
                    const variablesYml = YAML.parse(ymlFile);
                    const variablesYmlKeys = Object.keys(variablesYml);
                    doc.parse(variablesYmlCST[0]);
                    console.log(res);
                    // YAML PARSING ERROR                    
                    if (doc.errors.length > 0) {
                        log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold('YAML error').padEnd(77, '.')}${doc.errors[0].message}`, `template ${relPath}`)
                        if (doc.errors[0].source.resolved.value) log(`${chalk.red('⤻')} ${chalk.blue('^^^^^^^^^^').padEnd(38, '.')}${doc.errors[0].source.resolved.value}`, `template ${relPath}`)
                    }

                    // MISSING ONE OF THE MANDATORY PROPERTIES
                    if (!variablesYmlKeys.includes('default_css_attributes') || !variablesYmlKeys.includes('css_form')) {
                        log(`${chalk.red('✖')} ${!variablesYml.default_css_attributes?'default_css_attributes':'css_form'} missing in YAML`, `template ${path.relative(__dirname, relPath)}`)
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
                        }
                    } // if we don't have any yml configuration, no need to compare it to scss


                    // Undefined SCSS variables if we don't have anything in yml, let's check only scss
                    let known_global_scss_vars = '$element-selector: !default; $wrapper-selector: !default;'
                    nodeSass.render({
                        data: known_global_scss_vars + res.css,
                    }, function(err, result) {
                        if (err) {
                            log('troubles in scss');
                        } else {
                            log('scss is fine by our standards lets prefix');                           
                        }
                    });

                    if (goodToGo) {
                        log(`${path.resolve(link, 'style.scss')} gets autoprefix`);
                        fs.writeFileSync(path.resolve(link, 'style.scss'), res.css, 'utf8');
                    }
                })
                .catch((err) => {
                    log(`${chalk.red('😨')} ${chalk.bgHex('#fc0006').keyword('black').bold('uncaughtException:')} ${err}`);
                })
        })
    })
}