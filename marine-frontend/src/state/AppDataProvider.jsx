import { useCallback, useEffect, useReducer } from "react";

import {
  getAuthorityAlerts,
  evaluateMarineAlerts,
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
  askChat,
  answerWelfareQuestion,
} from "../services";

import { AppDataContext } from "./AppDataContext";
import { useLanguage } from "./useLanguage";

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
              message:
                alert.message ||
                "Marine alert detected.",
              location:
                alert.location ||
                `${marine.userPosition[0]}, ${marine.userPosition[1]}`,
              timestamp:
                alert.updatedAt ||
                alert.createdAt ||
                "Live feed",
              recommendedAction:
                alert.recommendedAction ||
                alert.action ||
                "Review the latest marine conditions.",
              mapPath: "/map?focus=hazard",
              sources:
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


      useEffect(() => {
    let cancelled = false;

    async function loadLiveMarineData() {
      try {
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

        if (!cancelled) {
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

        if (!cancelled) {
          dispatch({
            type: "live-data-error",
            error: error.message,
          });
        }
      }
    }

    loadLiveMarineData();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const askQuestion =
    (question) =>
      dispatch({
        type: "append-chat",

        message: askChat(question, {
          risk: state.risk,

          marineData:
            state.marine,

          dataSourceHealth:
            state.dataSources,

          previousMessages:
            state.chat,

          language,
        }),
      });

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