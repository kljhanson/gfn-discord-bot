function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseInt(str)) // ...and ensure strings of whitespace fail
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function removeFromArray(array, element) {
    while(array && array.indexOf(element) > -1) {
        array.splice(array.indexOf(element), 1)
    }
    return array
}

function toJson(data) {
    return JSON.stringify(data, (_, v) => typeof v === 'bigint' ? `${v}n` : v)
        .replace(/"(-?\d+)n"/g, (_, a) => a);
}

module.exports = {
    getRandomInt: getRandomInt,
    shuffleArray: shuffleArray,
    removeFromArray: removeFromArray,
    isNumeric: isNumeric,
    toJson: toJson
}