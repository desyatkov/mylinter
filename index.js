const chalk = require('chalk');
const log = console.log;
const path = require('path');
const fs = require('fs')
const postcss = require('postcss')
const postScss = require('postcss-scss');
const autoPrefixer = require('autoprefixer');
const YAML = require('yaml');
const postcssGetVars = require('./utils/getRules');
let variablesScss = [];
const allDecl = postcssGetVars((obj) => variablesScss = obj.slice(0));

function writeAutoprefixToFile(link, data) {
    log(`Prefixing ${chalk('👌')} ${path.resolve(link, 'style.scss')}`);
    fs.writeFileSync(path.resolve(link, 'style.scss'), data, 'utf8');
}

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

                    // main yml and yml scss check
                    let ymlCheckStatus = require('./utils/ymlcheck')({
                        doc: doc,
                        variablesYmlKeys: variablesYmlKeys,
                        variablesYml: variablesYml,
                        variablesScss: variablesScss,
                        relPath: relPath
                    });
                    
                    // if all our yml <--> scss checks are ok we can validate our scss stand alone                    
                    if (ymlCheckStatus['valid'] && ymlCheckStatus['emptyYml']) {
                        require('./utils/scsscheck')(res.css, null, function(response) {                            
                            response ? writeAutoprefixToFile(link,res.css) : null;
                        });
                    } else if (ymlCheckStatus['valid'] && !ymlCheckStatus['emptyYml']) {
                        require('./utils/scsscheck')(res.css, variablesScss, function(response) {
                            response ? writeAutoprefixToFile(link,res.css) : null;
                        });
                    }
                })
                .catch((err) => {
                    log(`${chalk.red('😨')} ${chalk.bgHex('#fc0006').keyword('black').bold('uncaughtException:')} ${err}`);
                })
        })
    })
}