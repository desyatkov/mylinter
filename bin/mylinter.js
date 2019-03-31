#!/usr/bin/env node
const chalk = require('chalk');
const log = console.log;
const path = require('path');
const fs = require('fs')
const postcss = require('postcss')
const postScss = require('postcss-scss');
const autoPrefixer = require('autoprefixer');
const YAML = require('yaml');
const _ = require('lodash');
const postcssGetVars = require('../getRules.js');
let variablesScss = [];
let didPrefix = null;
const allDecl = postcssGetVars((obj) => variablesScss = obj.slice(0));

const checkStatus = () => {
    _.pullAt(process.argv, [0, 1]);
    
    const pathLink = process.argv.map( inx => path.dirname(inx) )
    const uniqueLink = [...new Set(pathLink)];
    
    uniqueLink.forEach( link =>{
        const relPath = path.relative(__dirname, link);

        fs.readFile(path.resolve(link,'style.scss'), (err, css) => {
            postcss([allDecl, autoPrefixer])
            .process(css, { syntax: postScss, from: undefined })
            .then(() => {
                const file = fs.readFileSync(path.resolve(link,'settings.yml'), 'utf8')
                const variablesYmlCST = YAML.parseCST(file);
                const doc = new YAML.Document()
                doc.parse(variablesYmlCST[0])

                // YAML PARSING ERROR
                if(doc.errors.length > 0){
                    log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold('YAML error').padEnd(77, '.')}${doc.errors[0].message}`, `template ${relPath}`)
                    if(doc.errors[0].source.resolved.value) log(`${chalk.red('⤻')} ${chalk.blue('^^^^^^^^^^').padEnd(38, '.')}${doc.errors[0].source.resolved.value}`, `template ${relPath}`)
                    process.exitCode = 2;
                    return
                } 

                const variablesYml = YAML.parse(file);

                const variablesYmlKeys = Object.keys(variablesYml);
                // MISSING ONE OF MANDATORY PROPERTIES

                if(!variablesYmlKeys.includes('default_css_attributes') || !variablesYmlKeys.includes('css_form')) {
                    log(`${chalk.red('✖')} ${!variablesYml.default_css_attributes?'default_css_attributes':'css_form'} missing in YAML`, `template ${path.relative(__dirname, relPath)}`)
                    process.exitCode = 2; 
                    return
                }
                
                const variablesYmlNames = Object.keys(variablesYml.default_css_attributes);
                const variablesXor = _.xor(variablesScss, variablesYmlNames);
                
        

                _.mixin({
                    toPairsDeep: obj => _.flatMap(
                        _.toPairs(obj), ([k, v]) =>
                            _.isObjectLike(v) ? _.toPairsDeep(v) : [[k, v]])
                });

                const resultVariablesYmlForm = _(variablesYml.css_form)
                            .toPairsDeep()
                            .filter(([k, v]) => k === 'key')
                            .map(1)
                            .value()

                
                // DIFF BETWEEN variables YML and CSS_FORM YML
                const resultVariables = _.xor(resultVariablesYmlForm, variablesYmlNames);
                // log(variablesYmlNames)
                if(resultVariables.length > 0) {
                    const detectFile = (item) => {
                        const res = variablesYmlNames.includes(item) ? ['default_css_attributes', 'css_form'] : ['css_form', 'default_css_attributes'];
                        return res;
                    }
                    resultVariables.forEach(item=>{
                        log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold(item)} ${'variable exist'.padStart(20, '.') } in ${detectFile(item)[0]}  and missing in ${detectFile(item)[1]}`, `${chalk.blue(relPath)}`)
                    })
                    
                }

                // DIFF BETWEEN SASS AND YAML VARIABLES
                if(variablesXor.length > 0){
                    const detectFile = (item, array) => {
                        const res = variablesYml.default_css_attributes[item] !== undefined ? ['YML', 'SCSS'] : ['SCSS', 'YML'];
                        return res;
                    }
                    variablesXor.forEach(item=>{
                        var countDot = 40  - item.length;
                        log(`${chalk.red('✖')} ${chalk.bgHex('#ffa500').keyword('black').bold("$"+item)} ${'variable exist'.padStart(countDot, '.') } in ${detectFile(item)[0]} file and missing in ${detectFile(item)[1]}`, `${chalk.blue(relPath)}`)
                    })

                    process.exitCode = 2; 
                    return
                }

                if (!didPrefix) {
                    log(`${path.resolve(link, 'style.scss')} gets autoprefix`);
                    fs.writeFileSync(path.resolve(link, 'style.scss'), res.css, 'utf8');                                          
                    process.exitCode = 0;
                    return
                }    

                process.exitCode = 0;
                return
            })
        })
    })
}

checkStatus();