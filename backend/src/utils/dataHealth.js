const checkDataHealth = (updatedAt) => {
    // Timestamp missing
    if (!updatedAt) {
        return {
            status: "UNKNOWN",
            ageMinutes: null,
            message: "Data timestamp unavailable"
        };
    }

    const updatedTime = new Date(updatedAt).getTime();

    // Invalid timestamp
    if (!Number.isFinite(updatedTime)) {
        return {
            status: "UNKNOWN",
            ageMinutes: null,
            message: "Invalid data timestamp"
        };
    }

    const currentTime = Date.now();

    const ageMinutes = Math.max(
        0,
        Math.floor(
            (currentTime - updatedTime) / (1000 * 60)
        )
    );

    let status = "FRESH";
    let message = "Data is up to date";

    if (ageMinutes > 60) {
        status = "STALE";
        message = "Data may be outdated";
    } else if (ageMinutes > 30) {
        status = "AGING";
        message = "Data is getting old";
    }

    return {
        status,
        ageMinutes,
        message
    };
};

module.exports = {
    checkDataHealth
};