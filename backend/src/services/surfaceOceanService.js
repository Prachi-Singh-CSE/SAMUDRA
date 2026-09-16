const getSurfaceOceanData = async (lat, lon) => {
    try {
        const latitude = Number(lat);
        const longitude = Number(lon);

        /*
         * OceanEmbed surface inputs
         *
         * Current verified sources:
         * - SST: Open-Meteo Marine
         * - SSS: NOAA SMAP
         * - SSH/SLA: NASA PO.DAAC
         * - Surface currents: NASA OSCAR
         *
         * NASA/NOAA data adapters will be connected
         * through their official data access APIs.
         */

        return {
            location: {
                latitude,
                longitude
            },

            seaSurfaceTemperature: null,

            seaSurfaceSalinity: null,

            seaLevelAnomaly: null,

            currentU: null,

            currentV: null,

            windU: null,

            windV: null,

            sources: {
                SST: "Open-Meteo Marine",
                SSS: "NOAA SMAP",
                SLA: "NASA PO.DAAC NeurOST",
                currents: "NASA OSCAR"
            },

            dataStatus: "pending",

            message:
                "Verified ocean data sources selected; source adapters pending"
        };

    } catch (error) {

        console.error(
            "❌ Surface Ocean Service Error:",
            error.message
        );

        return {
            dataStatus: "error",
            message: error.message
        };
    }
};

module.exports = {
    getSurfaceOceanData
};