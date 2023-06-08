const search = document.querySelector(".search-box button");
const weatherBox = document.querySelector(".weather-box");
const weatherDetails = document.querySelector(".weather-details");
const mainContainer = document.querySelector(".container");
const error404 = document.querySelector(".not-found");

search.addEventListener("click", () => {
    const apiKey = "d2535847a9b6f259c3b725b23fc68beb";
    const cityName = document.querySelector(".search-box input").value;
    if (cityName ==='') return;

    fetch(`http://api.openweathermap.org/data/2.5/forecast?units=imperial&appid=${apiKey}&q=${cityName}`)
    .then(response => response.json())
    .then(json => {

        if(json.cod ==='404'){
            mainContainer.style.height = "400px";
            weatherBox.style.display = "none";
            weatherDetails.style.display = "none";
            error404.style.display = "block";
            error404.classList.add("fadeIn");
            return;
        }

        error404.style.display = "none";
        error404.classList.remove("fadeIn");

        const image = document.getElementById("weather-image");
        const temperature = document.querySelector(".temperature");
        const description = document.querySelector(".description");
        const humidity = document.querySelector(".humidity span");
        const wind = document.querySelector(".wind span");

        switch(json.list[0].weather[0].main){
            case 'Clear':
                image.src = 'images/clear.png';
                break;
            case 'Rain':
                image.src = 'images/rain.png';
                break;
            case 'Snow':
                image.src = 'images/snow.png';
                break;
            case 'Clouds':
                image.src = 'images/cloud.png';
                break;
            case 'Mist':
                image.src = 'images/mist.png';
                break;
            default: 
                image.src = '';
                break;
        }

        temperature.innerHTML = `${parseInt(json.list[0].main.temp)}°F`;
        description.innerHTML = `${json.list[0].weather[0].description}`;
        wind.innerHTML = `${parseInt(json.list[0].wind.speed)}mph`;
        humidity.innerHTML = `${parseInt(json.list[0].main.humidity)}%`;

        weatherBox.style.display = "";
        weatherDetails.style.display = "";
        weatherBox.classList.add("fadeIn");
        weatherDetails.classList.add("fadeIn");
        mainContainer.style.height = "590px";
    })
    .catch(error => {
        console.error('Error:', error);
    });
});
