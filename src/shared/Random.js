/**
 * Utility class for random operation
 */

const Random = {
    /* [a, b) so inclusive a, exclusive b */
    integerInRange(a, b) {
        return a + Math.floor(Math.random() * (b-a))
    },

    /* [a, b] */
    integerInRangeInclusive(a, b) {
        return Random.integerInRange(a, b + 1);
    },

    pickArrayElement(list) {
        return list[Random.integerInRange(0, list.length)];
    },

    getPause(ms) {
        return (ms * 0.7) + (0.3 * ms * Math.random() * 2);
    },

    incrementNumber(value, minIncrement, maxIncrement) {
        return value + Random.integerInRangeInclusive(minIncrement, maxIncrement);
    }
};

module.exports = Random;