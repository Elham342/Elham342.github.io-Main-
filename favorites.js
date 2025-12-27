const API_KEY = "0acd955dc0dabb61854c8805a6faa1d2";
const container = document.getElementById("favoritesContainer");

let favorites = JSON.parse(localStorage.getItem("favorites")) || ["Dubai", "London"];

function getTempClass(temp) {
  if (temp >= 30) return "hot";
  if (temp >= 20) return "warm";
  if (temp >= 10) return "mild";
  return "cold";
}

async function displayFavorites() {
  container.innerHTML = "";
  for (let city of favorites) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      const temp = Math.round(data.main.temp);
      const desc = data.weather[0].description;
      const icon = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

      const card = document.createElement("div");
      card.className = "forecast-card " + getTempClass(temp);
      card.innerHTML = `
        <h3>${city}</h3>
        <img src="${icon}" alt="${desc}">
        <p>${temp}°C - ${desc}</p>
        <button class="removeBtn">Remove</button>
      `;
      container.appendChild(card);

      card.querySelector(".removeBtn").addEventListener("click", () => {
        favorites = favorites.filter(f => f !== city);
        localStorage.setItem("favorites", JSON.stringify(favorites));
        displayFavorites();
      });
    } catch (err) {
      console.log(err);
    }
  }
}

displayFavorites();
