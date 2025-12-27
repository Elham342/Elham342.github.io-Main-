// forecast.js — drop-in replacement
const API_KEY = "0acd955dc0dabb61854c8805a6faa1d2";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/forecast"; // 5-day forecast
const GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct";

const cityInput = document.getElementById("forecastCityInput");
const searchBtn = document.getElementById("forecastSearchBtn");
const container = document.getElementById("forecastContainer");
const errorEl = document.getElementById("forecastError");
const suggestionsEl = document.getElementById("suggestions");
const toggle = document.getElementById("unitToggle");

let geoController = null;
let debounceTimeout = null;
let highlightedIndex = -1;
let currentSuggestions = []; // { name, state, country, lat, lon }
let forecastData = null; // store API response
let isFahrenheit = false;

/* ================= AUTOCOMPLETE ================= */
function clearSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.remove("visible");
  highlightedIndex = -1;
  currentSuggestions = [];
}

function renderSuggestions(list) {
  if (!suggestionsEl) return;
  suggestionsEl.innerHTML = "";
  if (!list.length) {
    clearSuggestions();
    return;
  }
  list.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.tabIndex = 0;
    li.dataset.idx = idx;
    li.dataset.lat = item.lat;
    li.dataset.lon = item.lon;
    li.textContent = `${item.name}${item.state ? ", " + item.state : ""}, ${item.country}`;
    li.addEventListener("click", () => selectSuggestion(idx));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter") selectSuggestion(idx);
    });
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.add("visible");
}

async function fetchSuggestions(query) {
  if (!query) {
    clearSuggestions();
    return;
  }
  if (geoController) geoController.abort();
  geoController = new AbortController();

  const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
  try {
    const res = await fetch(url, { signal: geoController.signal });
    if (!res.ok) {
      clearSuggestions();
      return;
    }
    const data = await res.json();
    currentSuggestions = data.map(d => ({
      name: d.name,
      state: d.state,
      country: d.country,
      lat: d.lat,
      lon: d.lon
    }));
    renderSuggestions(currentSuggestions);
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Geocode error:", err);
      clearSuggestions();
    }
  }
}

function selectSuggestion(index) {
  const s = currentSuggestions[index];
  if (!s) return;
  const displayName = `${s.name}${s.state ? ", " + s.state : ""}, ${s.country}`;
  cityInput.value = displayName;
  clearSuggestions();
  getForecastByCoords(s.lat, s.lon);
}

// input handling: debounce
cityInput.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(debounceTimeout);
  if (!q) {
    clearSuggestions();
    return;
  }
  debounceTimeout = setTimeout(() => fetchSuggestions(q), 300);
});

// keyboard nav & selection
cityInput.addEventListener("keydown", (e) => {
  if (!suggestionsEl) return;
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  if (!items.length) {
    if (e.key === "Enter") {
      getForecast(cityInput.value.trim());
    }
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
    updateHighlight(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex = Math.max(highlightedIndex - 1, 0);
    updateHighlight(items);
  } else if (e.key === "Enter") {
    if (highlightedIndex >= 0 && highlightedIndex < items.length) {
      e.preventDefault();
      selectSuggestion(highlightedIndex);
    } else {
      getForecast(cityInput.value.trim());
    }
  } else if (e.key === "Escape") {
    clearSuggestions();
  }
});

function updateHighlight(items) {
  items.forEach((el, i) => {
    if (i === highlightedIndex) {
      el.classList.add("highlight");
      el.scrollIntoView({ block: "nearest" });
    } else {
      el.classList.remove("highlight");
    }
  });
}

// close suggestions if clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest("#autocomplete-wrapper")) {
    clearSuggestions();
  }
});

// small delay on blur so clicks on suggestions register
cityInput.addEventListener("blur", () => {
  setTimeout(() => clearSuggestions(), 200);
});

/* ================= FORECAST ================= */
async function getForecast(city) {
  if (!city) {
    showError("Enter a city name.");
    return;
  }

  // clear suggestions when user manually searches
  clearSuggestions();

  const url = `${WEATHER_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;

  try {
    container.innerHTML = "Loading...";
    errorEl.textContent = "";

    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found");

    forecastData = await res.json();
    renderForecast();
  } catch (err) {
    container.innerHTML = "";
    showError(err.message || "Error fetching forecast");
  }
}

async function getForecastByCoords(lat, lon) {
  if (lat == null || lon == null) {
    showError("Coordinates missing");
    return;
  }

  const url = `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;

  try {
    container.innerHTML = "Loading...";
    errorEl.textContent = "";

    const res = await fetch(url);
    if (!res.ok) throw new Error("Location not found");

    forecastData = await res.json();
    renderForecast();
  } catch (err) {
    container.innerHTML = "";
    showError(err.message || "Error fetching forecast");
  }
}

function renderForecast() {
  container.innerHTML = "";

  if (!forecastData || !forecastData.list) {
    container.innerHTML = "<p>No forecast available</p>";
    return;
  }

  // header with city name
  const cityName = forecastData.city && (forecastData.city.name + (forecastData.city.country ? ", " + forecastData.city.country : ""));
  const header = document.createElement("div");
  header.className = "forecast-header";
  header.innerHTML = `<h2>${cityName || ""}</h2>`;
  container.appendChild(header);

  // pick midday items for each day (12:00:00)
  const forecasts = forecastData.list.filter(item => item.dt_txt && item.dt_txt.includes("12:00:00"));

  if (!forecasts.length) {
    container.innerHTML += "<p>No forecast available</p>";
    return;
  }

  forecasts.forEach(item => {
    const date = new Date(item.dt_txt);
    const day = date.toLocaleDateString(undefined, { weekday: "long" });

    const tempC = item.main.temp; // API returns metric temps because we requested units=metric
    const displayTemp = isFahrenheit ? Math.round((tempC * 9) / 5 + 32) : Math.round(tempC);
    const unit = isFahrenheit ? "°F" : "°C";
    const desc = item.weather[0].description;
    const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <h3>${day}</h3>
      <img src="${icon}" alt="${desc}">
      <p>${displayTemp}${unit} - ${desc}</p>
    `;
    container.appendChild(card);
  });
}

function showError(msg) {
  errorEl.textContent = msg;
}

/* ================= EVENTS ================= */
searchBtn.addEventListener("click", () => getForecast(cityInput.value.trim()));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) {
    getForecast(cityInput.value.trim());
  }
});

// unit toggle - re-render forecast using stored forecastData
if (toggle) {
  toggle.addEventListener("change", () => {
    isFahrenheit = toggle.checked;
    // re-render only if we have data
    if (forecastData) renderForecast();
  });
}

// default city on load
getForecast("Dubai");
