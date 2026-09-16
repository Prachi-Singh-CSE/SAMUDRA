const states = new Map();

function keyFor(id) {
    return String(id);
}

function getAlertState(id) {
    return states.get(keyFor(id)) || null;
}

function setAlertState(id, patch) {
    const current = getAlertState(id) || {
        read: false,
        acknowledged: false,
        status: "active"
    };

    const next = {
        ...current,
        ...patch
    };

    if (next.acknowledged) {
        next.read = true;
        next.status = next.status === "dismissed" ? "dismissed" : "acknowledged";
    }

    states.set(keyFor(id), next);
    return next;
}

function applyStoredState(alert) {
    const stored = getAlertState(alert.id);
    if (!stored) {
        return alert;
    }

    return {
        ...alert,
        read: stored.read,
        acknowledged: stored.acknowledged,
        status: stored.status || alert.status
    };
}

module.exports = {
    getAlertState,
    setAlertState,
    applyStoredState
};
