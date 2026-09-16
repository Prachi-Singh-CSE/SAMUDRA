const calculateRMSE = (actual, predicted) => {
    if (
        !Array.isArray(actual) ||
        !Array.isArray(predicted) ||
        actual.length !== predicted.length ||
        actual.length === 0
    ) {
        return null;
    }

    const squaredErrors = actual.map((value, index) => {
        return Math.pow(value - predicted[index], 2);
    });

    const meanSquaredError =
        squaredErrors.reduce(
            (sum, value) => sum + value,
            0
        ) / squaredErrors.length;

    return Number(
        Math.sqrt(meanSquaredError).toFixed(3)
    );
};


const calculateMAE = (actual, predicted) => {
    if (
        !Array.isArray(actual) ||
        !Array.isArray(predicted) ||
        actual.length !== predicted.length ||
        actual.length === 0
    ) {
        return null;
    }

    const absoluteErrors = actual.map((value, index) => {
        return Math.abs(value - predicted[index]);
    });

    const meanAbsoluteError =
        absoluteErrors.reduce(
            (sum, value) => sum + value,
            0
        ) / absoluteErrors.length;

    return Number(
        meanAbsoluteError.toFixed(3)
    );
};


const calculateBias = (actual, predicted) => {
    if (
        !Array.isArray(actual) ||
        !Array.isArray(predicted) ||
        actual.length !== predicted.length ||
        actual.length === 0
    ) {
        return null;
    }

    const errors = actual.map((value, index) => {
        return predicted[index] - value;
    });

    const bias =
        errors.reduce(
            (sum, value) => sum + value,
            0
        ) / errors.length;

    return Number(bias.toFixed(3));
};


const calculateCorrelation = (actual, predicted) => {
    if (
        !Array.isArray(actual) ||
        !Array.isArray(predicted) ||
        actual.length !== predicted.length ||
        actual.length < 2
    ) {
        return null;
    }

    const actualMean =
        actual.reduce(
            (sum, value) => sum + value,
            0
        ) / actual.length;

    const predictedMean =
        predicted.reduce(
            (sum, value) => sum + value,
            0
        ) / predicted.length;

    let numerator = 0;
    let actualVariance = 0;
    let predictedVariance = 0;

    for (let i = 0; i < actual.length; i++) {
        const actualDifference =
            actual[i] - actualMean;

        const predictedDifference =
            predicted[i] - predictedMean;

        numerator +=
            actualDifference *
            predictedDifference;

        actualVariance +=
            Math.pow(actualDifference, 2);

        predictedVariance +=
            Math.pow(predictedDifference, 2);
    }

    if (
        actualVariance === 0 ||
        predictedVariance === 0
    ) {
        return null;
    }

    const correlation =
        numerator /
        Math.sqrt(
            actualVariance *
            predictedVariance
        );

    return Number(
        correlation.toFixed(3)
    );
};


const calculateValidationMetrics = (
    actual,
    predicted
) => {
    return {
        RMSE: calculateRMSE(
            actual,
            predicted
        ),
        MAE: calculateMAE(
            actual,
            predicted
        ),
        Bias: calculateBias(
            actual,
            predicted
        ),
        correlation: calculateCorrelation(
            actual,
            predicted
        )
    };
};


module.exports = {
    calculateRMSE,
    calculateMAE,
    calculateBias,
    calculateCorrelation,
    calculateValidationMetrics
};