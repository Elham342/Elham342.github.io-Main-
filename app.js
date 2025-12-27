
/* ================= CONFIG ================= */
const API_KEY = "0acd955dc0dabb61854c8805a6faa1d2";
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

/* ================= ELEMENTS ================= */
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const toggle = document.getElementById("unitToggle");

const tempEl = document.getElementById("temp");
const descEl = document.getElementById("desc");
const cityEl = document.getElementById("city");
const iconEl = document.getElementById("weatherIcon");
const detailsEl = document.getElementById("details");
const errorEl = document.getElementById("error");
const y = document.getElementById("year");
if (y) y.textContent = new Date().getFullYear();
const addFavoriteBtn = document.getElementById("addFavoriteBtn");
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

addFavoriteBtn.addEventListener("click", () => {
  const city = cityEl.textContent;
  if (city && !favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert(`${city} added to favorites!`);
  } else if (favorites.includes(city)) {
    alert(`${city} is already in favorites!`);
  }
});


const suggestionsEl = document.getElementById("suggestions");

let currentTempC = null;
let debounceTimer;

/* ================= EVENTS ================= */
searchBtn.addEventListener("click", searchWeather);


toggle.addEventListener("change", () => {
  if (currentTempC === null) return;

  if (toggle.checked) {
    const f = currentTempC * 9 / 5 + 32;
    tempEl.textContent = `${Math.round(f)} °F`;
  } else {
    tempEl.textContent = `${Math.round(currentTempC)} °C`;
  }
});

/* ================= AUTOCOMPLETE ================= */
let geoController = null;
let debounceTimeout = null;
let highlightedIndex = -1;
let currentSuggestions = []; // store fetched suggestions

function clearSuggestions() {
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.remove("visible");
  highlightedIndex = -1;
  currentSuggestions = [];
}

function renderSuggestions(list) {
  suggestionsEl.innerHTML = "";
  if (!list.length) {
    clearSuggestions();
    return;
  }
  list.forEach((item, idx) => {
    // item: { name, state, country, lat, lon }
    const li = document.createElement("li");
    li.className = "suggestion-item";
    li.tabIndex = 0;
    li.dataset.idx = idx;
    li.dataset.lat = item.lat;
    li.dataset.lon = item.lon;
    // display like: "London, England, GB" or "Springfield, IL, US"
    li.textContent = `${item.name}${item.state ? ", " + item.state : ""}, ${item.country}`;
    li.addEventListener("click", () => {
      selectSuggestion(idx);
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter") selectSuggestion(idx);
    });
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.add("visible");
}

// fetch suggestions using OpenWeatherMap geocoding API
async function fetchSuggestions(query) {
  if (geoController) geoController.abort();
  geoController = new AbortController();

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
  try {
    const res = await fetch(url, { signal: geoController.signal });
    if (!res.ok) {
      clearSuggestions();
      return;
    }
    const data = await res.json();
    // map it to a friendly shape
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

// call when user selects a suggestion
function selectSuggestion(index) {
  const s = currentSuggestions[index];
  if (!s) return;
  const displayName = `${s.name}${s.state ? ", " + s.state : ""}, ${s.country}`;
  cityInput.value = displayName;
  clearSuggestions();
  // use coordinates for accurate weather fetch
  getWeatherByCoords(s.lat, s.lon);
}

// input handling with debounce
cityInput.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  clearTimeout(debounceTimeout);
  if (!q) {
    clearSuggestions();
    return;
  }
  debounceTimeout = setTimeout(() => {
    fetchSuggestions(q);
  }, 300); // 300ms debounce
});

// keyboard navigation (arrow keys, enter, escape)
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsEl.querySelectorAll(".suggestion-item");
  if (!items.length) return;

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

// Optionally: when focus leaves the input, hide suggestions after a small delay
cityInput.addEventListener("blur", () => {
  setTimeout(() => {
    // allow click on a suggestion first (so selectSuggestion works)
    clearSuggestions();
  }, 200);
});

/* ================= WEATHER ================= */
async function searchWeather() {
  const city = cityInput.value.trim();
  if (!city) return;

  try {
    const res = await fetch(
      `${WEATHER_URL}?q=${city}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) throw new Error();

    const data = await res.json();
    updateUI(data);
  } catch {
    tempEl.textContent = "--";
    descEl.textContent = "City not found";
    cityEl.textContent = "—";
  }
}
async function getWeatherByCoords(lat, lon) {
  try {
    const res = await fetch(
      `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error();
    const data = await res.json();
    updateUI(data);
  } catch {
    tempEl.textContent = "--";
    descEl.textContent = "Location not found";
    cityEl.textContent = "—";
  }
}


function updateUI(data) {
  currentTempC = data.main.temp;

  tempEl.textContent = `${Math.round(currentTempC)} °C`;
  descEl.textContent = capitalize(data.weather[0].description);
  cityEl.textContent = `${data.name}, ${data.sys.country}`;
  iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
}

/* ================= HELPERS ================= */
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
