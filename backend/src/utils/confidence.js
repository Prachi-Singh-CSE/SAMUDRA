const calculateOceanConfidence = ({
    dataStatus,
    hasSST,
    hasChlorophyll
}) => {

    let score = 50;

    if (dataStatus === "live") {
        score += 20;
    }

    if (hasSST) {
        score += 15;
    }

    if (hasChlorophyll) {
        score += 15;
    }

    return Math.min(score, 100);
};


module.exports = {
    calculateOceanConfidence
};