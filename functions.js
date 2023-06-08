
truncate = function (str, maxlength) {
        return (str.length > maxlength) ?
          str.slice(0, maxlength - 1) + '…' : str;
      }

 antiTruncate = function () {
  const description = document.getElementById('trailDescription');
  const seeMoreBtn = document.getElementById('seeMoreBtn');

  description.classList.remove('truncate');
  seeMoreBtn.style.display = 'hidden';
}

let trailTags = [
  "Dogs on leash",
  "Backpacking",
  "Camping",
  "Hiking",
  "Forest",
  "River",
  "Views",
  "Waterfall",
  "Wildflowers",
  "Wildlife",
  "Rocky",
  "Mountain",
  "Beach",
  "Scenic",
  "Picnic areas",
  "Swimming",
  "Biking",
  "Birdwatching",
  "Steep",
  "Historical sites",
  "Accessible"
];