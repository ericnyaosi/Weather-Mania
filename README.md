# Weather.Mania

A responsive weather dashboard prototype for Kenya, with a local-user view and a meteorologist workspace.

## Run it in VS Code

1. Open VS Code.
2. Select **File → Open Folder…**
3. Choose the folder containing `index.html`, `styles.css`, and `app.js`.
4. Install the **Live Server** extension if you do not already have it:
   - Open **Extensions** in VS Code.
   - Search for **Live Server** and install it.
5. In VS Code Explorer, right-click `index.html`.
6. Select **Open with Live Server**.
7. Allow location access if you want a forecast for your current location. Otherwise, select a region on the Forecast page.

Opening `index.html` directly from your files may prevent location, voice, or notification features from working. Use Live Server.

## Features

- Current conditions and a seven-day forecast for selected Kenyan locations
- Browser location access for point forecasts
- Local-user dashboard and meteorologist dashboard
- Moon phase dates and a monthly moon calendar
- Forecast-based rain, heat, and wind screening indicators
- Browser reminders saved on the current device
- Voice input and spoken responses where the browser supports them
- Links to Kenya Meteorological Department seasonal forecasts and NOAA ENSO information

## Data sources and limitations

The forecast comes from Open-Meteo weather model guidance. NASA POWER is requested for recent satellite/reanalysis historical precipitation context; that data is not a forecast. Open-Meteo data requires attribution under CC BY 4.0.

El Niño can affect rainfall patterns in Kenya, but impacts vary by season and region. This prototype does not predict a precise El Niño onset date or provide official disaster warnings. Drought onset and end dates cannot be reliably determined from a seven-day forecast. For seasonal outlooks and safety warnings, consult the Kenya Meteorological Department and county emergency services.

Weather.Mania is a prototype, not an operational forecasting or emergency warning service.

## Reminders and voice

Reminders are saved in this browser and only run while the page is open. They do not send SMS, push notifications, or background alerts.

Voice controls use browser speech recognition and text-to-speech where available. They do not connect directly to Siri, Alexa, or an AI service.

## Files

- `index.html` — page layout and content
- `styles.css` — responsive styling and weather illustrations
- `app.js` — weather data, moon calendar, reminders, and voice controls
- `README.md` — setup and project information

## Data links

- Open-Meteo: https://open-meteo.com/en/docs
- Kenya Meteorological Department seasonal forecast: https://meteo.go.ke/our-products/seasonal-forecast/
- NASA POWER API documentation: https://power.larc.nasa.gov/api/pages/
- NOAA CPC ENSO outlook: https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/
