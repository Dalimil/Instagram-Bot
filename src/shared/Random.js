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

    waitingMs(ms) {
        return new Promise(resolve => setTimeout(resolve, Random.getPause(ms)));
    },

    incrementNumber(value, minIncrement, maxIncrement) {
        return value + Random.integerInRangeInclusive(minIncrement, maxIncrement);
    },
    
    coinToss(percentNeededForSuccess = 50) {
        // If the coin toss generates number less than the percentage, it's a success
        return Math.random() < (percentNeededForSuccess / 100.0);
    },

    getScrollIntoViewParams() {
        const verticalOptions = ['center', 'center', 'center', 'start', 'start', 'end', 'nearest'];
        const verticalOption = Random.pickArrayElement(verticalOptions);
        return { behavior: 'smooth', block: verticalOption };
    }
};

module.exports = Random;