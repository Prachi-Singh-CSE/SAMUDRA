const {
    getOceanData
} = require("../services/oceanService");

const {
    calculateOceanConfidence
} = require("../utils/confidence");

const {
    checkDataHealth
} = require("../utils/dataHealth");


const getOceanSituation = async (lat, lon) => {

    const oceanData =
        await getOceanData(lat, lon);


    // =========================
    // OCEAN VALUES
    // =========================

    const sst =
        oceanData.ocean.seaSurfaceTemperature;

    const chlorophyll =
        oceanData.ocean.chlorophyll;


    // =========================
    // OCEAN STATUS
    // =========================

    let oceanStatus = "NORMAL";


    if (
        sst !== null &&
        sst !== undefined
    ) {

        if (sst >= 31) {

            oceanStatus = "LOW";

        } else if (sst >= 26 && sst < 31) {

            oceanStatus = "FAVORABLE";

        } else if (sst < 20) {

            oceanStatus = "LOW";
        }
    }


    // =========================
    // CONFIDENCE
    // =========================

    const confidence =
        calculateOceanConfidence({
            dataStatus:
                oceanData.dataStatus,

            hasSST:
                sst !== null &&
                sst !== undefined,

            hasChlorophyll:
                chlorophyll !== null &&
                chlorophyll !== undefined
        });


    // =========================
    // DATA HEALTH
    // =========================

    const dataHealth =
        checkDataHealth(
            oceanData.updatedAt
        );


    // =========================
    // FISHING POTENTIAL
    // =========================

    let fishingPotential = "MODERATE";


    if (oceanStatus === "FAVORABLE") {

        fishingPotential = "GOOD";

    } else if (oceanStatus === "LOW") {

        fishingPotential = "LOW";
    }


    // =========================
    // FINAL RESPONSE
    // =========================

    return {

        ...oceanData,

        analysis: {

            status:
                oceanStatus,

            fishingPotential:
                fishingPotential,

            confidence:
                confidence,

            dataHealth:
                dataHealth
        }
    };
};


module.exports = {
    getOceanSituation
};