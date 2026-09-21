/* Chronicle-only behavior: open the selected age and keep the reader focused. */

const ageVolumes = Array.from(document.querySelectorAll(".age-volume"));
const ageLinks = document.querySelectorAll("[data-age-link]");

function openAge(ageId, { scroll = true } = {}) {
  const selectedVolume = document.getElementById(ageId);
  if (!selectedVolume) {
    return;
  }

  ageVolumes.forEach((volume) => {
    volume.open = volume === selectedVolume;
  });

  if (scroll) {
    selectedVolume.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

ageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const ageId = link.dataset.ageLink;
    history.replaceState(null, "", `#${ageId}`);
    openAge(ageId);
  });
});

ageVolumes.forEach((volume) => {
  volume.addEventListener("toggle", () => {
    if (!volume.open) {
      return;
    }

    ageVolumes.forEach((otherVolume) => {
      if (otherVolume !== volume) {
        otherVolume.open = false;
      }
    });
  });
});

const initialAge = window.location.hash.slice(1);
if (initialAge) {
  openAge(initialAge, { scroll: false });
}
