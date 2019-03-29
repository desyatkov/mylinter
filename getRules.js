const postcss = require('postcss')

module.exports = postcss.plugin('postcss-get-vars', (callback) => {
    let el = [];

    return (css) => {
        css.walkDecls(decl => {
            const elements = decl.value.split(/ |,/)
            const filteredElements = elements.filter((el)=>{
                return /^\$.+/.test(el)
            })
            if(filteredElements.length > 0) {
                el = [...el,...filteredElements];
            }
        });
        callback([ ...new Set(el) ].map(item=>item.replace('$','')) );
    };
});
