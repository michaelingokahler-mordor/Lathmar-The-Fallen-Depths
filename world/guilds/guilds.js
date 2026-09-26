/* Guilds-only behavior: open one record and preserve direct links. */

const guildRecords = Array.from(document.querySelectorAll(".guild-record"));
const guildLinks = Array.from(document.querySelectorAll("[data-guild-link]"));
let ignoreFirstOpenToggle = true;

function setActiveGuildLink(guildId) {
  guildLinks.forEach((link) => {
    const isActive = link.dataset.guildLink === guildId;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function openGuild(guildId, { scroll = true, updateHash = true } = {}) {
  const selectedRecord = document.getElementById(guildId);
  if (!selectedRecord || !selectedRecord.classList.contains("guild-record")) {
    return false;
  }

  guildRecords.forEach((record) => {
    record.open = record === selectedRecord;
  });
  setActiveGuildLink(guildId);

  if (updateHash && window.location.hash !== `#${guildId}`) {
    history.replaceState(null, "", `#${guildId}`);
  }

  if (scroll) {
    selectedRecord.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return true;
}

guildLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openGuild(link.dataset.guildLink);
  });
});

guildRecords.forEach((record) => {
  record.addEventListener("toggle", () => {
    if (!record.open) {
      return;
    }

    guildRecords.forEach((otherRecord) => {
      if (otherRecord !== record) {
        otherRecord.open = false;
      }
    });
    setActiveGuildLink(record.id);
    if (ignoreFirstOpenToggle) {
      ignoreFirstOpenToggle = false;
      return;
    }
    if (window.location.hash !== `#${record.id}`) {
      history.replaceState(null, "", `#${record.id}`);
    }
  });
});

window.addEventListener("hashchange", () => {
  const guildId = window.location.hash.slice(1);
  if (guildId) {
    openGuild(guildId, { scroll: false, updateHash: false });
  }
});

const initialGuild = window.location.hash.slice(1);
if (!initialGuild || !openGuild(initialGuild, { scroll: false, updateHash: false })) {
  openGuild("adventurer", { scroll: false, updateHash: false });
}
