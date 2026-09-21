/* Peoples-only behavior: open one record and preserve direct links. */

const peopleRecords = Array.from(document.querySelectorAll(".people-record"));
const peopleLinks = Array.from(document.querySelectorAll("[data-people-link]"));

function setActivePeopleLink(peopleId) {
  peopleLinks.forEach((link) => {
    const isActive = link.dataset.peopleLink === peopleId;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function openPeople(peopleId, { scroll = true, updateHash = true } = {}) {
  const selectedRecord = document.getElementById(peopleId);
  if (!selectedRecord || !selectedRecord.classList.contains("people-record")) {
    return false;
  }

  peopleRecords.forEach((record) => {
    record.open = record === selectedRecord;
  });
  setActivePeopleLink(peopleId);

  if (updateHash && window.location.hash !== `#${peopleId}`) {
    history.replaceState(null, "", `#${peopleId}`);
  }

  if (scroll) {
    selectedRecord.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return true;
}

peopleLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openPeople(link.dataset.peopleLink);
  });
});

peopleRecords.forEach((record) => {
  record.addEventListener("toggle", () => {
    if (!record.open) {
      return;
    }

    peopleRecords.forEach((otherRecord) => {
      if (otherRecord !== record) {
        otherRecord.open = false;
      }
    });
    setActivePeopleLink(record.id);
    if (window.location.hash !== `#${record.id}`) {
      history.replaceState(null, "", `#${record.id}`);
    }
  });
});

window.addEventListener("hashchange", () => {
  const peopleId = window.location.hash.slice(1);
  if (peopleId) {
    openPeople(peopleId, { scroll: false, updateHash: false });
  }
});

const initialPeople = window.location.hash.slice(1);
if (!initialPeople || !openPeople(initialPeople, { scroll: false, updateHash: false })) {
  openPeople("human", { scroll: false, updateHash: false });
}
