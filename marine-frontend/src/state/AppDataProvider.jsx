import { useCallback, useEffect, useReducer } from "react";

import {
  getAuthorityAlerts,
  fetchLiveAlerts,
  evaluateMarineAlerts,
  updateAlertState,
  backendUnavailableAlert,
  getDataSourceHealth,
  setDemoSourceStatus,
  getInitialChat,
  getMarineSnapshot,
  getLiveMarineSnapshot,
  getRiskAssessment,
  getRouteOptions,
  getSOSDetails,
  getWelfareSchemes,
  createSOSEvent,
  acknowledgeSOSEvent,
  evaluateIMBLSafety,
  IMBL_DWELL_THRESHOLD_SECONDS,
  sendAgenticChat,
  answerWelfareQuestion,
} from "../services";

import { AppDataContext } from "./AppDataContext";
import { useLanguage } from "./useLanguage";

// Live alerts (once IMD/INCOIS keys are configured) carry `location` as
// a { latitude, longitude } object per the backend's documented shape,
// not a string — render either shape safely instead of crashing React.
function formatAlertLocation(location, fallbackPosition) {
  if (typeof location === "string" && location.trim()) {
    return location;
  }

  if (
    location &&
    typeof location === "object" &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`;
  }

  if (Array.isArray(fallbackPosition) && fallbackPosition.length === 2) {
    return `${fallbackPosition[0]}, ${fallbackPosition[1]}`;
  }

  return "Unknown location";
}

// Refresh the live marine snapshot on an interval so newly-issued
// alerts surface even when the user's position hasn't changed.
const LIVE_DATA_POLL_MS = 5 * 60 * 1000;

function createInitialState() {
  const marine = getMarineSnapshot();
  const dataSources = getDataSourceHealth();
  const risk = getRiskAssessment(marine, dataSources);

  const imbl = evaluateIMBLSafety({
    routeId: "safer",
    marineData: marine,
  });

  const alerts = evaluateMarineAlerts(
    marine,
    dataSources,
    imbl
  );

  return {
    marine,

    risk,

    routes: getRouteOptions(),

    selectedRouteId: "safer",

    routeChangeReason: null,

    imbl,

    imblDismissed: false,

    imblDwell: {
      active: false,
      enteredAt: null,
      elapsedSeconds: 0,
      escalated: false,
    },

    location: {
      position: marine.userPosition,
      status: "fallback",
      source: "demo",
    },

    alerts,

    alertsMeta: null,

    authorityAlerts: getAuthorityAlerts(),

    chat: getInitialChat({
      risk,
      marineData: marine,
      dataSourceHealth: dataSources,
    }),

    sos: getSOSDetails(),

    welfare: getWelfareSchemes(),

    welfareChat: [
      {
        id: "welfare-seed",

        answer:
          "Based on your profile — registered trawler owner in Maharashtra with 5 crew — you most likely qualify for three schemes. PMMSY covers equipment and safety upgrades, the state diesel subsidy covers fuel, and the fisheries Kisan Credit Card covers working capital.",

        sources: ["GPS"],

        confidence: {
          level: "Moderate",
          score: 86,
        },
      },
    ],

    dataSources,

    lastDemoSOS: null,

    sosEvents: [],

    imblEscalations: [],

    loading: false,

    error: null,
  };
}

function appDataReducer(state, action) {
  switch (action.type) {


        case "live-data-loaded": {
      const {
        marine,
        weather,
        ocean,
        pfz,
        chlorophyll,
        sss,
        subsurface,
        backendAlerts,
        dataSources,
      } = action.payload;

      const risk = getRiskAssessment(
        marine,
        dataSources
      );

      const imbl = evaluateIMBLSafety({
        routeId: state.selectedRouteId || "safer",
        marineData: marine,
      });

      const alerts =
        backendAlerts?.alerts?.length
          ? backendAlerts.alerts.map((alert, index) => ({
              id:
                alert.id ||
                `live-alert-${index}`,
              type:
                alert.type ||
                "MARINE_ALERT",
              severity:
                alert.severity === "EXTREME"
                  ? "CRITICAL"
                  : alert.severity === "HIGH"
                    ? "WARNING"
                    : alert.severity === "MODERATE"
                      ? "CAUTION"
                      : "INFO",
              title:
                alert.title ||
                alert.name ||
                "Marine Alert",
              // Backend's documented alert shape uses `description`,
              // not `message` — keep `message` as a fallback in case
              // an upstream source ever sends that name instead.
              message:
                alert.description ||
                alert.message ||
                "Marine alert detected.",
              location: formatAlertLocation(
                alert.location,
                marine.userPosition
              ),
              // Backend's documented alert shape uses `issuedAt`.
              timestamp:
                alert.issuedAt ||
                alert.updatedAt ||
                alert.createdAt ||
                "Live feed",
              recommendedAction:
                alert.recommendedAction ||
                alert.action ||
                "Review the latest marine conditions.",
              mapPath: "/map?focus=hazard",
              // Backend's documented alert shape uses a single
              // `source` string (e.g. "IMD"), not a `sources` array.
              sources:
                (alert.source && [alert.source]) ||
                alert.sources || ["IMD / INCOIS"],
              status: "active",
              read: false,
              acknowledged: false,
            }))
          : evaluateMarineAlerts(
              marine,
              dataSources,
              imbl
            );

      return {
        ...state,

        marine,

        weather,

        ocean,

        pfz,

        chlorophyll,

        sss,

        subsurface,

        risk,

        imbl,

        alerts,

        // Surfaces alertService.js's own view of data quality
        // (e.g. "partial" while IMD/INCOIS API keys aren't configured
        // and both sources report "unavailable") separately from the
        // per-alert list, so the UI can show it without guessing.
        alertsMeta: {
          dataStatus: backendAlerts?.dataStatus ?? null,
          safety: backendAlerts?.safety ?? null,
          alertCount: backendAlerts?.alertCount ?? alerts.length,
        },

        dataSources,

        location: {
          position: marine.userPosition,
          status: "live",
          source: "backend",
        },

        loading: false,

        error: null,
      };
    }


    case "live-data-loading":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "live-data-error":
      return {
        ...state,
        loading: false,
        error: action.error,
    };



    case "acknowledge-alert":
      return {
        ...state,

        alerts: state.alerts.map((alert) =>
          alert.id === action.alertId
            ? {
                ...alert,
                status: "acknowledged",
                acknowledged: true,
                read: true,
              }
            : alert
        ),

        authorityAlerts: state.authorityAlerts.map((alert) =>
          alert.id === action.alertId
            ? {
                ...alert,
                status: "Acknowledged",
              }
            : alert
        ),
      };

    case "record-demo-sos": {
      const event = createSOSEvent(action.details);

      return {
        ...state,

        lastDemoSOS: event,

        sosEvents: [
          ...state.sosEvents,
          event,
        ],
      };
    }

    case "append-chat":
      return {
        ...state,

        chat: [
          ...state.chat,
          action.message,
        ],
      };

    case "read-alert":
      return {
        ...state,

        alerts: state.alerts.map((alert) =>
          alert.id === action.alertId
            ? {
                ...alert,
                read: true,
              }
            : alert
        ),
      };

    case "dismiss-alert":
      return {
        ...state,

        alerts: state.alerts.map((alert) =>
          alert.id === action.alertId
            ? {
                ...alert,
                status: "dismissed",
                read: true,
              }
            : alert
        ),
      };

    case "set-source-status": {
      setDemoSourceStatus(
        action.sourceId,
        action.status
      );

      const dataSources =
        getDataSourceHealth();

      const risk = getRiskAssessment(
        state.marine,
        dataSources
      );

      const alerts = evaluateMarineAlerts(
        state.marine,
        dataSources,
        state.imbl
      );

      return {
        ...state,
        dataSources,
        risk,
        alerts,
      };
    }

    case "select-route": {
      const imbl = evaluateIMBLSafety({
        routeId: action.routeId,
        marineData: state.marine,
      });

      const wasApproaching =
        state.imbl.approaching;

      const nowApproaching =
        imbl.approaching;

      let imblDwell =
        state.imblDwell;

      if (
        nowApproaching &&
        !wasApproaching
      ) {
        imblDwell = {
          active: true,
          enteredAt: Date.now(),
          elapsedSeconds: 0,
          escalated: false,
        };
      } else if (!nowApproaching) {
        imblDwell = {
          active: false,
          enteredAt: null,
          elapsedSeconds: 0,
          escalated: false,
        };
      }

      return {
        ...state,

        selectedRouteId:
          action.routeId,

        routeChangeReason:
          action.reason || null,

        imbl,

        alerts: evaluateMarineAlerts(
          state.marine,
          state.dataSources,
          imbl
        ),

        imblDismissed: false,

        imblDwell,
      };
    }

    case "imbl-dwell-tick": {
      if (
        !state.imblDwell.active ||
        state.imblDwell.escalated
      ) {
        return state;
      }

      const elapsedSeconds = Math.floor(
        (Date.now() -
          state.imblDwell.enteredAt) /
          1000
      );

      if (
        elapsedSeconds <
        IMBL_DWELL_THRESHOLD_SECONDS
      ) {
        return {
          ...state,

          imblDwell: {
            ...state.imblDwell,

            elapsedSeconds,
          },
        };
      }

      const escalation = {
        id: `IMBL-DEMO-${Date.now()}`,

        type: "IMBL",

        title:
          "IMBL Escalation — sustained boundary incursion",

        location:
          state.imbl.location.join(", "),

        time: "Just now",

        severity:
          state.imbl.status,

        status: "ACTIVE",

        distanceKm:
          state.imbl.distanceKm,

        dwellSeconds:
          elapsedSeconds,

        recommendedAction:
          state.imbl.recommendedAction,
      };

      return {
        ...state,

        imblDwell: {
          ...state.imblDwell,

          elapsedSeconds,

          escalated: true,
        },

        imblEscalations: [
          ...state.imblEscalations.filter(
            (item) =>
              item.status !== "ACTIVE"
          ),

          escalation,
        ],
      };
    }

    case "dismiss-imbl":
      return {
        ...state,

        imblDismissed: true,
      };

    case "acknowledge-authority":
      return {
        ...state,

        sosEvents: state.sosEvents.map(
          (event) =>
            event.id === action.id
              ? acknowledgeSOSEvent(event)
              : event
        ),

        imblEscalations:
          state.imblEscalations.map(
            (event) =>
              event.id === action.id
                ? {
                    ...event,
                    status: "ACKNOWLEDGED",
                  }
                : event
          ),

        authorityAlerts:
          state.authorityAlerts.map(
            (event) =>
              event.id === action.id
                ? {
                    ...event,
                    status: "Acknowledged",
                  }
                : event
          ),
      };

    case "update-location":
      return {
        ...state,

        location:
          action.location,
      };

    case "replay-hazard-push":
      return {
        ...state,

        alerts: state.alerts.map(
          (alert) =>
            alert.status === "dismissed"
              ? alert
              : {
                  ...alert,
                  read: false,
                  status: "active",
                }
        ),
      };

    case "answer-welfare":
      return {
        ...state,

        welfareResponse:
          answerWelfareQuestion(
            action.question
          ),
      };

    case "append-welfare-chat": {
      const response =
        answerWelfareQuestion(
          action.question
        ) || {};

      const turn = {
        id: `welfare-${Date.now()}`,

        question:
          action.question,

        answer:
          response.answer || "",

        sources:
          response.sources || ["GPS"],

        confidence:
          response.confidence || {
            level: "Moderate",
            score: 86,
          },
      };

      return {
        ...state,

        welfareResponse:
          response,

        welfareChat: [
          ...state.welfareChat,
          turn,
        ],
      };
    }

    default:
      return state;
  }
}

export function AppDataProvider({
  children,
}) {
  const { language } =
    useLanguage();

  const [state, dispatch] =
    useReducer(
      appDataReducer,
      undefined,
      createInitialState
    );


  const refreshLiveData = useCallback(
    async (signal) => {
      try {
        dispatch({ type: "live-data-loading" });

        const position =
          state.location?.position ||
          [15.1, 73.8];

        const lat = position[0];
        const lon = position[1];

        console.log(
          "🌊 Loading live marine data:",
          lat,
          lon
        );

        const liveData =
          await getLiveMarineSnapshot(
            lat,
            lon
          );

        if (!signal?.cancelled) {
          dispatch({
            type: "live-data-loaded",
            payload: liveData,
          });

          console.log(
            "✅ Live marine data loaded",
            liveData
          );
        }
      } catch (error) {
        console.error(
          "❌ Live marine data loading failed:",
          error
        );

        if (!signal?.cancelled) {
          dispatch({
            type: "live-data-error",
            error: error.message,
          });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.location.position]
  );

  // Re-fetch whenever the resolved position changes (e.g. a GPS fix
  // arrives after the initial fallback-coordinate load).
  useEffect(() => {
    const signal = { cancelled: false };

    refreshLiveData(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [refreshLiveData]);

  // Also poll on a timer so newly-issued alerts (and refreshed
  // weather/ocean/pfz/etc conditions) surface even while the user
  // stays at the same position — a plain fetch-once effect would
  // otherwise never notice anything new until the position changes.
  useEffect(() => {
    const signal = { cancelled: false };

    const interval = setInterval(() => {
      refreshLiveData(signal);
    }, LIVE_DATA_POLL_MS);

    return () => {
      signal.cancelled = true;
      clearInterval(interval);
    };
  }, [refreshLiveData]);

  const acknowledgeAlert =
    (alertId) =>
      dispatch({
        type: "acknowledge-alert",
        alertId,
      });

  const markAlertRead =
    (alertId) =>
      dispatch({
        type: "read-alert",
        alertId,
      });

  const dismissAlert =
    (alertId) =>
      dispatch({
        type: "dismiss-alert",
        alertId,
      });

  const recordDemoSOS =
    (details) =>
      dispatch({
        type: "record-demo-sos",
        details,
      });

  // Sends the question to agentic-core's real /chat pipeline (planner ->
  // orchestrator -> agents -> explanation agent). Falls back to the canned
  // demo template internally if the backend is unreachable, so this always
  // resolves with a message to append rather than throwing.
  const askQuestion = async (question) => {
    const location = Array.isArray(state.location?.position)
      ? { lat: state.location.position[0], lon: state.location.position[1] }
      : undefined;

    const message = await sendAgenticChat({
      question,
      language,
      location,
      demoContext: {
        risk: state.risk,
        marineData: state.marine,
        dataSourceHealth: state.dataSources,
        previousMessages: state.chat,
        language,
      },
    });

    dispatch({
      type: "append-chat",
      message,
    });

    return message;
  };

  const selectRoute =
    (routeId, reason) =>
      dispatch({
        type: "select-route",
        routeId,
        reason,
      });

  const dismissIMBL =
    () =>
      dispatch({
        type: "dismiss-imbl",
      });

  const acknowledgeAuthority =
    (id) =>
      dispatch({
        type: "acknowledge-authority",
        id,
      });

  const setSourceStatus =
    useCallback(
      (sourceId, status) =>
        dispatch({
          type: "set-source-status",
          sourceId,
          status,
        }),
      []
    );

  const updateLocation =
    useCallback(
      (location) =>
        dispatch({
          type: "update-location",
          location,
        }),
      []
    );

  const replayHazardPush =
    useCallback(
      () =>
        dispatch({
          type: "replay-hazard-push",
        }),
      []
    );

  const askWelfare =
    (question) =>
      dispatch({
        type: "append-welfare-chat",
        question,
      });

  useEffect(() => {
    if (
      !state.imblDwell.active ||
      state.imblDwell.escalated
    ) {
      return undefined;
    }

    const interval =
      setInterval(() => {
        dispatch({
          type: "imbl-dwell-tick",
        });
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [
    state.imblDwell.active,
    state.imblDwell.escalated,
    state.imblDwell.enteredAt,
  ]);

  const positionKey = Array.isArray(state.location?.position)
    ? state.location.position.join(",")
    : "";

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      const [lat, lon] = positionKey.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      try {
        const data = await fetchLiveAlerts(lat, lon);
        if (!cancelled && data.alerts && data.alerts.length > 0) {
          dispatch({ type: "set-live-alerts", alerts: data.alerts });
          return;
        }
      } catch {
        // Fall back to evaluated demo alerts localized for current language
      }

      if (!cancelled) {
        const demoAlerts = evaluateMarineAlerts(state.marine, state.dataSources, state.imbl, language);
        dispatch({
          type: "set-live-alerts",
          alerts: demoAlerts,
          liveFailed: true,
        });
      }
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [positionKey, language, state.marine, state.dataSources, state.imbl]);

  return (
    <AppDataContext.Provider
      value={{
        state,

        acknowledgeAlert,

        markAlertRead,

        dismissAlert,

        recordDemoSOS,

        askQuestion,

        selectRoute,

        updateLocation,

        dismissIMBL,

        acknowledgeAuthority,

        setSourceStatus,

        askWelfare,

        replayHazardPush,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}