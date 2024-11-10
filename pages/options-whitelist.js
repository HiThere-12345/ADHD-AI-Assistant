// JavaScript for handling sites
const siteList = document.getElementById("task-list");
const siteForm = document.getElementById("task-form");
const newsiteInput = document.getElementById("new-task");

siteForm.addEventListener("submit", function (e) {
  e.preventDefault();
  
  const siteText = newsiteInput.value;
  addsite(siteText);
  
  // Clear input
  newsiteInput.value = "";
});

function addsite(siteText, permanentWhitelist = false) {
  const siteItem = document.createElement("li");
  siteItem.className = "task-item";
  
  if (permanentWhitelist) {
    siteItem.classList.add('completed');
  }

  const siteContent = document.createElement("span");
  siteContent.textContent = siteText;
  siteContent.className = "task-content";

  const siteCheckbox = document.createElement("input");
  siteCheckbox.type = "checkbox";
  siteCheckbox.className = "form-check-input";
  if (permanentWhitelist) {
    siteCheckbox.checked = true;
  }
  siteCheckbox.addEventListener("change", function () {
    siteItem.classList.toggle("completed");
    savesites();
    checksites();
  });

  const trashCan = document.createElement("span");
  trashCan.textContent = "🗑️";
  trashCan.className = "trash-can";
  
  trashCan.addEventListener("click", function () {
    const confirmDelete = confirm("Are you sure you want to delete this site?");
    if (confirmDelete) {
      siteItem.remove();
      savesites();
    }
  });

  const twoElements = document.createElement("span");
  twoElements.appendChild(siteCheckbox);
  twoElements.appendChild(siteContent);

  siteItem.appendChild(twoElements);
  siteItem.appendChild(trashCan);
  siteList.appendChild(siteItem);
  savesites();
}

function savesites() {
  const sites = [];
  const siteItems = document.querySelectorAll('.task-item');
  
  siteItems.forEach(item => {
    sites.push({
      text: item.querySelector('.task-content').textContent,
      completed: item.classList.contains('completed')
    });
  });

  // console.log(sites);
  chrome.storage.sync.set({ sites: sites }, function () {
  //   console.log('sites saved');
  //  console.log(sites);
  });
}

function checksites() {
  const siteItems = document.querySelectorAll('.task-item');
  const allCompleted = Array.from(siteItems).every(item => item.classList.contains('completed'));
  if (allCompleted) {
    // console.log("all are checked");
    chrome.storage.sync.get(['date', 'streak'], function (data) {
      const today = new Date().getDate();
      const lastDate = data.date || 0;
      let streak = data.streak || 0;
      console.log(lastDate, today);
      if (lastDate !== today) {
        streak++;
        chrome.storage.sync.set({ streak: streak, date: today }, function () {
          document.getElementById("current-streak").textContent = "Current Streak: " + streak + "🔥";
        });
      }
    });
  }
}
function uncheckBoxes () {
  chrome.storage.sync.get(['sites','date'], function (data) {
    console.log("THISS IS data", data);
    if (data.sites && data.date != new Date().getDate()) {
      data.sites.forEach(site => {
        if (site.completed) site.completed = false;
      });
      chrome.storage.sync.set({ sites: data.sites }, function() {
        console.log("sites are updated");
        loadsites(); // Call loadsites here after setting sites
      });
    } else {
      loadsites(); // If no need to update, still load the sites
    }
  });
}
function loadsites() {
  chrome.storage.sync.get(['sites'], function (data) {
    if (data.sites) {
      data.sites.forEach(site => addsite(site.text, site.completed));
    }
  });
}
document.addEventListener('DOMContentLoaded', function () {
  uncheckBoxes();
});