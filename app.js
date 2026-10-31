const PLACES = {
  Nairobi: [-1.2864, 36.8172],
  Mombasa: [-4.0435, 39.6682],
  Kisumu: [-0.0917, 34.768],
  Nakuru: [-0.3031, 36.08],
  Eldoret: [0.5143, 35.2698],
  Garissa: [-0.4532, 39.646],
  Marsabit: [2.3284, 37.9899],
  Kakamega: [0.2827, 34.7519],
  Kitui: [-1.3667, 38.0106],
  Lodwar: [3.1191, 35.5964]
};

const WMO = {
  0: ["Clear sky", "☀"],
  1: ["Mainly clear", "🌤"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"],
  45: ["Fog", "〰"],
  48: ["Rime fog", "〰"],
  51: ["Light drizzle", "🌦"],
  53: ["Drizzle", "🌦"],
  55: ["Heavy drizzle", "🌧"],
  61: ["Light rain", "🌦"],
  63: ["Rain", "🌧"],
  65: ["Heavy rain", "🌧"],
  71: ["Light snow", "❄"],
  80: ["Rain showers", "🌦"],
  81: ["Rain showers", "🌧"],
  82: ["Heavy showers", "🌧"],
  95: ["Thunderstorm", "⛈"],
  96: ["Thunderstorm & hail", "⛈"],
  99: ["Severe thunderstorm", "⛈"]
};

const MOON_MARKERS = [
  { name: "New Moon", emoji: "●", color: "new-dot" },
  { name: "First Quarter", emoji: "◐", color: "quarter-dot" },
  { name: "Full Moon", emoji: "○", color: "full-dot" },
  { name: "Last Quarter", emoji: "◑", color: "quarter-dot" }
];

let state = {
  place: "Nairobi",
  lat: PLACES.Nairobi[0],
  lon: PLACES.Nairobi[1],
  weather: null,
  role: "local",
  month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  reminders: JSON.parse(localStorage.getItem("wm-reminders") || "[]"),
  lastFired: {}
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3000);
}

function dateLabel(date, options = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-KE", options).format(date);
}

function weatherDescription(code) {
  return WMO[code]?.[0] || "Variable conditions";
}

function weatherIcon(code) {
  return WMO[code]?.[1] || "🌤";
}

async function loadWeather() {
  const { lat, lon } = state;
  $("#updated-label").textContent = "Updating live model guidance…";

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m" +
      "&hourly=precipitation_probability,precipitation,wind_speed_10m,temperature_2m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max" +
      "&timezone=auto&forecast_days=7";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather service unavailable");

    state.weather = await response.json();
    renderWeather();

    const time = new Intl.DateTimeFormat("en-KE", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    $("#updated-label").textContent = `Updated ${time}`;
    loadSatelliteContext();
  } catch (error) {
    $("#updated-label").textContent = "Could not refresh weather";
    $("#hero-detail").textContent =
      "Check your connection and try again. Showing the last available weather if present.";
    $("#forecast-strip").innerHTML =
      '<div class="loading-card">Weather data could not be loaded. Check your connection and refresh.</div>';
    console.warn(error);
  }
}

// NASA POWER is historical satellite/reanalysis context, not a forecast.
async function loadSatelliteContext() {
  const end = new Date(Date.now() - 86400000);
  const start = new Date(end.getTime() - 6 * 86400000);

  const formatDate = (date) =>
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;

  const url =
    "https://power.larc.nasa.gov/api/temporal/daily/point" +
    `?parameters=PRECTOTCORR&community=AG&longitude=${state.lon}` +
    `&latitude=${state.lat}&start=${formatDate(start)}&end=${formatDate(end)}&format=JSON`;

  try {
    const response = await fetch(url);
    if (!response.ok) return;

    const data = await response.json();
    state.satellite = data.properties?.parameter?.PRECTOTCORR;

    if (state.satellite) {
      $("#pro-rain").title =
        "Recent NASA POWER corrected precipitation context (daily satellite/reanalysis estimate)";
    }
  } catch (error) {
    console.info("NASA POWER context unavailable", error);
  }
}

function renderWeather() {
  const weather = state.weather;
  if (!weather) return;

  const current = weather.current;
  const daily = weather.daily;
  const condition = weatherDescription(current.weather_code);

  $("#place-crumb").textContent = state.place;
  $("#hero-place").textContent = `${state.place.toUpperCase()}, KENYA`;

  $("#hero-summary").textContent =
    condition === "Clear sky"
      ? "Clear skies over your area."
      : condition.includes("rain") || condition.includes("Rain")
        ? `${condition} expected nearby.`
        : `A ${condition.toLowerCase()} day, with conditions to watch.`;

  $("#hero-detail").textContent =
    `High of ${Math.round(daily.temperature_2m_max[0])}° and ` +
    `${Math.round(daily.precipitation_probability_max[0] || 0)}% chance of rain today.`;

  $("#current-temp").textContent = Math.round(current.temperature_2m);
  $("#condition-label").textContent = condition;
  $("#feels-like").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("#humidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  $("#wind-speed").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  $("#art-condition").textContent = condition.toUpperCase();

  $("#forecast-place").textContent = state.place;
  $("#forecast-current").textContent = `${Math.round(current.temperature_2m)}°C`;
  $("#forecast-description").textContent = `${condition} · ${state.place}`;
  $("#summary-rain").textContent =
    `${Math.round(daily.precipitation_probability_max[0] || 0)}%`;
  $("#summary-humidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  $("#summary-wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;

  $("#pro-place").textContent = state.place;
  $("#pro-rain").textContent =
    `${(daily.precipitation_sum?.slice(0, 1)[0] || 0).toFixed(1)} mm`;

  $("#forecast-strip").innerHTML = daily.time
    .map((date, index) => {
      const dayName =
        index === 0
          ? "Today"
          : dateLabel(new Date(`${date}T12:00:00`), { weekday: "short" });

      return `
        <div class="day-card">
          <div class="day-name">${dayName}</div>
          <div class="day-icon">${weatherIcon(daily.weather_code[index])}</div>
          <div class="day-temps">
            ${Math.round(daily.temperature_2m_max[index])}°
            <span>${Math.round(daily.temperature_2m_min[index])}°</span>
          </div>
          <div class="day-rain">💧 ${Math.round(daily.precipitation_probability_max[index] || 0)}%</div>
        </div>
      `;
    })
    .join("");

  $("#forecast-table").innerHTML =
    '<div class="forecast-row header"><span>DAY</span><span>SKY</span><span>CONDITIONS</span><span>HIGH / LOW</span><span>RAIN</span></div>' +
    daily.time
      .map((date, index) => {
        const dayDate = new Date(`${date}T12:00:00`);
        const dayName =
          index === 0 ? "Today" : dateLabel(dayDate, { weekday: "long" });

        return `
          <div class="forecast-row">
            <span class="date-cell">
              <b>${dayName}</b>
              <small>${dateLabel(dayDate, { month: "short", day: "numeric" })}</small>
            </span>
            <span class="weather-cell">${weatherIcon(daily.weather_code[index])}</span>
            <span>${weatherDescription(daily.weather_code[index])}</span>
            <span>
              <b>${Math.round(daily.temperature_2m_max[index])}°</b> /
              ${Math.round(daily.temperature_2m_min[index])}°
            </span>
            <span class="rain-cell">${Math.round(daily.precipitation_probability_max[index] || 0)}%</span>
          </div>
        `;
      })
      .join("");

  renderRisks();
  renderCountyList();
}

function renderRisks() {
  const weather = state.weather;
  if (!weather) return;

  const daily = weather.daily;
  const rainProbabilities = daily.precipitation_probability_max.slice(0, 5);
  const rainfall = daily.precipitation_sum.slice(0, 5);
  const temperatures = daily.temperature_2m_max.slice(0, 5);
  const winds = daily.wind_speed_10m_max.slice(0, 5);

  const peakRainChance = Math.max(...rainProbabilities);
  const rainDay = rainProbabilities.indexOf(peakRainChance);
  const hottestTemperature = Math.max(...temperatures);
  const hotDay = temperatures.indexOf(hottestTemperature);
  const strongestWind = Math.max(...winds);
  const windDay = winds.indexOf(strongestWind);
  const dryDays = daily.precipitation_sum.slice(0, 7).filter((value) => value < 1).length;

  const cards = [];

  if (peakRainChance >= 60 || rainfall.some((value) => value >= 25)) {
    cards.push({
      title: "Heavy rainfall watch",
      icon: "☂",
      level: peakRainChance >= 80 ? "Elevated" : "Watch",
      watch: peakRainChance >= 60,
      detail:
        `Peak daily rain probability ${peakRainChance}% in the next 5 days. ` +
        "This is forecast guidance, not a flood forecast.",
      window: dayWindow(daily.time[rainDay], peakRainChance)
    });
  }

  if (hottestTemperature >= 35) {
    cards.push({
      title: "High temperature watch",
      icon: "☀",
      level: hottestTemperature >= 38 ? "Elevated" : "Watch",
      watch: true,
      detail:
        `Forecast maximum reaches ${Math.round(hottestTemperature)}°C within 5 days. ` +
        "Consider shade and water if exposed to heat.",
      window: dayWindow(daily.time[hotDay], hottestTemperature)
    });
  }

  if (strongestWind >= 35) {
    cards.push({
      title: "Strong wind watch",
      icon: "〰",
      level: strongestWind >= 50 ? "Elevated" : "Watch",
      watch: true,
      detail:
        `Maximum forecast wind is ${Math.round(strongestWind)} km/h within 5 days. ` +
        "Secure loose objects if conditions approach.",
      window: dayWindow(daily.time[windDay], strongestWind)
    });
  }

  cards.push({
    title: "Drought monitoring",
    icon: "⌁",
    level: "Seasonal",
    watch: false,
    detail:
      `${dryDays} of the next 7 forecast days show under 1 mm precipitation. ` +
      "This short-range signal cannot determine drought onset or end dates. Use KMD monthly and seasonal outlooks.",
    window: "No credible drought start/stop date available from a 7-day forecast."
  });

  if (!cards.length) {
    cards.push({
      title: "No elevated short-range signals",
      icon: "✓",
      level: "Low",
      watch: false,
      detail:
        "No heavy rainfall, high temperature or strong wind thresholds are crossed in the next 5 days.",
      window: "Forecast window: next 5 days"
    });
  }

  $("#risk-preview").innerHTML = cards
    .slice(0, 2)
    .map(
      (card) => `
        <div class="risk-row">
          <div class="risk-symbol ${card.title.includes("wind") ? "blue" : ""}">${card.icon}</div>
          <div class="risk-text">
            <b>${card.title}</b>
            <small>${card.level === "Low" ? "No threshold crossed" : card.window}</small>
          </div>
          <span class="risk-level">${card.level}</span>
        </div>
      `
    )
    .join("");

  $("#risk-cards").innerHTML = cards
    .map(
      (card) => `
        <article class="risk-card">
          <div class="risk-card-top">
            <div class="risk-card-icon">${card.icon}</div>
            <div>
              <h3>${card.title}</h3>
              <small>Location: ${state.place}, Kenya</small>
            </div>
            <span class="risk-level-badge ${card.watch ? "watch" : ""}">${card.level}</span>
          </div>
          <p>${card.detail}</p>
          <div class="risk-timeline"><b>Estimated signal window:</b> ${card.window}</div>
        </article>
      `
    )
    .join("");

  $("#pro-signals").textContent = cards.filter((card) => card.watch).length;
}

function dayWindow(dateString, value) {
  if (!dateString) return "Next 5 days";

  const date = new Date(`${dateString}T12:00:00`);
  return `${dateLabel(date, { weekday: "short", month: "short", day: "numeric" })} · ${value}%`;
}

function renderCountyList() {
  if (!state.weather) return;

  const names = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Garissa"];
  const daily = state.weather.daily;

  $("#county-list").innerHTML = names
    .map((name, index) => `
      <div class="county-row">
        <b>${name}</b>
        <span class="county-weather">${index === 0 ? weatherIcon(daily.weather_code[0]) : "↗"}</span>
        <span>${index === 0 ? `${Math.round(daily.temperature_2m_max[0])}°` : "Open"}</span>
        <span>${index === 0 ? `${Math.round(daily.precipitation_probability_max[0])}% rain` : "View county"}</span>
      </div>
    `)
    .join("");
}

function setPlace(place, coordinates) {
  state.place = place;
  state.lat = coordinates[0];
  state.lon = coordinates[1];

  $("#region-select").value = PLACES[place] ? place : "Nairobi";
  $("#place-crumb").textContent = place;
  $("#forecast-place").textContent = place;
  $("#modal-place").textContent = place;
  $("#pro-place").textContent = place;

  loadWeather();
}

function moonAge(date) {
  const synodicMonth = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  return ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
}

function moonInfo(date) {
  const age = moonAge(date);
  const fraction = age / 29.530588853;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;

  let phase;
  if (age < 1.85 || age > 27.68) phase = "New Moon";
  else if (age < 5.53) phase = "Waxing Crescent";
  else if (age < 9.22) phase = "First Quarter";
  else if (age < 12.91) phase = "Waxing Gibbous";
  else if (age < 16.61) phase = "Full Moon";
  else if (age < 20.3) phase = "Waning Gibbous";
  else if (age < 23.99) phase = "Last Quarter";
  else phase = "Waning Crescent";

  return { age, fraction, illumination, phase };
}

function nextPhase(targetPhase, from = new Date()) {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);

  for (let index = 0; index < 32; index++, date.setDate(date.getDate() + 1)) {
    if (moonInfo(date).phase === targetPhase) return new Date(date);
  }

  return new Date(from);
}

function renderMoon() {
  const today = new Date();
  const info = moonInfo(today);
  const nextFullMoon = nextPhase("Full Moon");

  $("#moon-phase").textContent = info.phase;
  $("#moon-date").textContent =
    `Next full moon · ${dateLabel(nextFullMoon, { month: "short", day: "numeric" })}`;
  $("#moon-illum").textContent = `${Math.round(info.illumination * 100)}% illuminated`;
  $("#moon-track-fill").style.width = `${Math.max(2, info.fraction * 100)}%`;

  $("#calendar-phase").textContent = info.phase;
  $("#calendar-phase-detail").textContent =
    `${Math.round(info.illumination * 100)}% illuminated · ` +
    dateLabel(today, { weekday: "long", month: "long", day: "numeric" });

  $("#big-moon").textContent =
    info.phase === "Full Moon"
      ? "●"
      : info.phase.includes("Quarter")
        ? "◐"
        : info.phase === "New Moon"
          ? "○"
          : "☾";

  const phases = ["New Moon", "First Quarter", "Full Moon", "Last Quarter"]
    .map((phase) => ({ phase, date: nextPhase(phase) }))
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);

  $("#next-phases").innerHTML = phases
    .map(
      (item) =>
        `<span>${item.phase} · ${dateLabel(item.date, { month: "short", day: "numeric" })}</span>`
    )
    .join("");

  renderCalendar();
}

function renderCalendar() {
  const month = state.month;
  $("#calendar-month").textContent = new Intl.DateTimeFormat("en-KE", {
    month: "long",
    year: "numeric"
  }).format(month);

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - firstDay.getDay());

  let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<div class="cal-head">${day}</div>`)
    .join("");

  const today = new Date();

  for (let index = 0; index < 42; index++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const phase = moonInfo(date).phase;
    const marker = MOON_MARKERS.find((item) => item.name === phase);

    html += `
      <div class="cal-day
        ${date.getMonth() !== month.getMonth() ? "dim" : ""}
        ${date.toDateString() === today.toDateString() ? "today" : ""}">
        ${date.getDate()}
        ${marker ? `<span class="phase-mark">${marker.emoji} ${marker.name}</span>` : ""}
      </div>
    `;
  }

  $("#calendar-grid").innerHTML = html;
}

function saveReminders() {
  localStorage.setItem("wm-reminders", JSON.stringify(state.reminders));
  $("#alert-count").textContent = state.reminders.length;
  renderReminders();
}

function patternLabel(type) {
  return {
    rain: "Rain or thunderstorms",
    wind: "Strong winds",
    heat: "High temperatures",
    daily: "Daily forecast summary"
  }[type] || type;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderReminders() {
  const list = $("#reminder-list");

  if (!state.reminders.length) {
    list.innerHTML =
      '<div class="empty-state">No reminders yet. Create one to keep an eye on local weather patterns.</div>';
    return;
  }

  list.innerHTML = state.reminders
    .map((reminder, index) => `
      <div class="reminder-item">
        <div class="reminder-art">◷</div>
        <div>
          <b>${escapeHtml(reminder.name)}</b>
          <p>
            ${patternLabel(reminder.type)} · ${reminder.time} · ${state.place} ·
            ${reminder.notify ? "Browser notification on" : "On-screen only"}
          </p>
        </div>
        <button class="delete-reminder" data-delete="${index}">Remove</button>
      </div>
    `)
    .join("");

  $$("[data-delete]").forEach((button) => {
    button.onclick = () => {
      state.reminders.splice(Number(button.dataset.delete), 1);
      saveReminders();
      toast("Reminder removed");
    };
  });
}

function checkReminders() {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const key = `${now.toDateString()}-${time}`;

  for (const reminder of state.reminders) {
    if (reminder.time !== time || state.lastFired[reminder.id] === key) continue;

    state.lastFired[reminder.id] = key;

    const message =
      reminder.type === "daily"
        ? `Today's forecast for ${state.place}: ${$("#condition-label").textContent}, high ${$("#current-temp").textContent} degrees.`
        : `Weather watch for ${state.place}: check the forecast for ${patternLabel(reminder.type).toLowerCase()}.`;

    toast(message);

    if (
      reminder.notify &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification(`Weather.Mania · ${reminder.name}`, {
        body: message,
        tag: reminder.id
      });
    }
  }
}

function openReminder() {
  $("#reminder-modal").classList.add("open");
  $("#reminder-modal").setAttribute("aria-hidden", "false");
  $("#reminder-name").focus();
}

function closeReminder() {
  $("#reminder-modal").classList.remove("open");
  $("#reminder-modal").setAttribute("aria-hidden", "true");
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    toast("Text-to-speech is unavailable in this browser.");
    return;
  }

  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function startVoice() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toast("Voice input is unavailable here. Try Chrome or Edge.");
    speak(
      `Weather Mania. It is ${$("#condition-label").textContent} in ` +
      `${state.place}, ${$("#current-temp").textContent} degrees Celsius.`
    );
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-KE";
  recognition.interimResults = false;

  recognition.onstart = () => toast("Listening… ask about today’s weather.");

  recognition.onresult = (event) => {
    const question = event.results[0][0].transcript.toLowerCase();
    let answer;

    if (question.includes("rain")) {
      answer = `Rain chance in ${state.place} today is ${$("#summary-rain").textContent}.`;
    } else if (question.includes("moon")) {
      answer = `The moon phase is ${$("#moon-phase").textContent}. ${$("#moon-date").textContent}.`;
    } else if (question.includes("wind")) {
      answer = `Wind is ${$("#wind-speed").textContent} in ${state.place}.`;
    } else {
      const high = Math.round(state.weather.daily.temperature_2m_max[0]);
      answer =
        `It is ${$("#condition-label").textContent} in ${state.place}, ` +
        `${$("#current-temp").textContent} degrees Celsius. Today's high is ` +
        `${high} degrees, with a ${$("#summary-rain").textContent} chance of rain.`;
    }

    toast(answer);
    speak(answer);
  };

  recognition.onerror = () =>
    toast("Voice service could not hear you. You can try again.");

  recognition.start();
}

function setRole(role) {
  state.role = role;
  document.body.classList.toggle("pro-mode", role === "pro");

  $("#role-toggle").innerHTML =
    role === "local"
      ? 'Switch to meteorologist view <span>↗</span>'
      : 'Switch to local user view <span>↗</span>';

  showView(role === "pro" ? "met-desk" : "overview");
}

function showView(name) {
  $$(".content").forEach((section) => section.classList.add("view-hidden"));
  $(`#view-${name}`).classList.remove("view-hidden");

  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });

  if (name === "moon") renderMoon();
  if (name === "alerts") renderReminders();
  if (name === "risks") renderRisks();
  if (name === "met-desk") renderCountyList();

  document.querySelector(".sidebar").classList.remove("open");
  window.scrollTo(0, 0);
}

$$(".nav-item").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$$("[data-goto]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.goto));
});

$("#role-toggle").onclick = () =>
  setRole(state.role === "local" ? "pro" : "local");

$("#region-select").onchange = (event) => {
  const place = event.target.value;
  setPlace(place, PLACES[place]);
};

$("#location-btn").onclick = () => {
  if (!navigator.geolocation) {
    toast("Location access is unavailable in this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) =>
      setPlace("My location", [
        position.coords.latitude,
        position.coords.longitude
      ]),
    () => toast("Location permission was not granted. Choose a region instead."),
    { enableHighAccuracy: true, timeout: 12000 }
  );
};

$("#reminder-open").onclick = openReminder;
$("#reminder-open-2").onclick = openReminder;
$("#modal-close").onclick = closeReminder;

$("#reminder-modal").onclick = (event) => {
  if (event.target.id === "reminder-modal") closeReminder();
};

$("#reminder-form").onsubmit = async (event) => {
  event.preventDefault();

  let notify = $("#notify-check").checked;

  if (
    notify &&
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    const permission = await Notification.requestPermission();
    notify = permission === "granted";
  }

  const reminder = {
    id: crypto.randomUUID?.() || String(Date.now()),
    name: $("#reminder-name").value.trim(),
    type: $("#reminder-type").value,
    time: $("#reminder-time").value,
    notify
  };

  state.reminders.push(reminder);
  saveReminders();
  closeReminder();
  event.target.reset();
  $("#reminder-time").value = "07:00";
  toast("Weather reminder saved on this device.");
};

$("#voice-btn").onclick = startVoice;

$("#month-prev").onclick = () => {
  state.month = new Date(
    state.month.getFullYear(),
    state.month.getMonth() - 1,
    1
  );
  renderCalendar();
};

$("#month-next").onclick = () => {
  state.month = new Date(
    state.month.getFullYear(),
    state.month.getMonth() + 1,
    1
  );
  renderCalendar();
};

$("#menu-btn").onclick = () =>
  document.querySelector(".sidebar").classList.toggle("open");

$("#today-label").textContent = new Intl.DateTimeFormat("en-KE", {
  weekday: "long",
  month: "long",
  day: "numeric"
}).format(new Date()).toUpperCase();

$("#modal-place").textContent = state.place;
$("#alert-count").textContent = state.reminders.length;

renderMoon();
renderReminders();
loadWeather();

setInterval(checkReminders, 15000);
setInterval(loadWeather, 30 * 60 * 1000);