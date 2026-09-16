from fastapi import FastAPI

app = FastAPI(
    title="Marine Intelligence Python Services",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "success": True,
        "service": "Marine Intelligence Python Services",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "status": "healthy"
    }


@app.post("/ocean/process")
def process_ocean(data: dict):
    sst = data.get("seaSurfaceTemperature")
    wave_height = data.get("waveHeight")
    chlorophyll = data.get("chlorophyll")

    score = 50

    if isinstance(sst, (int, float)):
        if 26 <= sst < 31:
            score += 20
        elif sst >= 31:
            score -= 10

    if isinstance(wave_height, (int, float)):
        if wave_height < 2:
            score += 10
        elif wave_height > 3:
            score -= 20

    if isinstance(chlorophyll, (int, float)):
        if chlorophyll >= 1:
            score += 15
        elif chlorophyll >= 0.5:
            score += 8
        elif chlorophyll < 0.2:
            score -= 10

    score = max(0, min(100, score))

    if score >= 80:
        condition = "GOOD"
    elif score >= 50:
        condition = "MODERATE"
    else:
        condition = "POOR"

    return {
        "success": True,
        "module": "ocean",
        "condition": condition,
        "score": score,
        "inputs": {
            "seaSurfaceTemperature": sst,
            "waveHeight": wave_height,
            "chlorophyll": chlorophyll
        }
    }

@app.post("/weather/process")
def process_weather(data: dict):
    temperature = data.get("temperature")
    wind_speed = data.get("windSpeed")
    wave_height = data.get("waveHeight")

    score = 100

    if isinstance(wind_speed, (int, float)):
        if wind_speed > 30:
            score -= 30
        elif wind_speed > 20:
            score -= 15

    if isinstance(wave_height, (int, float)):
        if wave_height > 3:
            score -= 30
        elif wave_height > 2:
            score -= 15

    score = max(0, min(100, score))

    if score >= 70:
        safety = "SAFE"
    elif score >= 40:
        safety = "CAUTION"
    else:
        safety = "DANGER"

    return {
        "success": True,
        "module": "weather",
        "safety": safety,
        "score": score,
        "inputs": {
            "temperature": temperature,
            "windSpeed": wind_speed,
            "waveHeight": wave_height
        }
    }