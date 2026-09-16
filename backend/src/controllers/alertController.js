const {
    getAlertData
} = require("../services/alertService");
const {
    setAlertState,
    getAlertState
} = require("../services/alertStateStore");

const getAlerts = async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const data = await getAlertData(lat, lon);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Alert Controller Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch alert data"
        });
    }
};

function patchAlert(req, res, patch) {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({
            success: false,
            message: "Alert id is required"
        });
    }

    const state = setAlertState(id, patch);
    return res.status(200).json({
        success: true,
        data: {
            id,
            ...state
        }
    });
}

const acknowledgeAlert = (req, res) => {
    return patchAlert(req, res, { acknowledged: true, read: true, status: "acknowledged" });
};

const markAlertRead = (req, res) => {
    return patchAlert(req, res, { read: true });
};

const dismissAlert = (req, res) => {
    return patchAlert(req, res, { status: "dismissed", read: true });
};

const getAlertAckState = (req, res) => {
    const state = getAlertState(req.params.id);
    return res.status(200).json({
        success: true,
        data: state
    });
};

module.exports = {
    getAlerts,
    acknowledgeAlert,
    markAlertRead,
    dismissAlert,
    getAlertAckState
};
