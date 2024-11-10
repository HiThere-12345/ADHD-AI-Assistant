console.log('Background script loaded');
chrome.storage.sync.get(['sites'], function (data) {
  sites = data.sites || [];
});
function checkTasksAndRedirect() {
  console.log('Checking tasks...');
  chrome.storage.sync.get(['tasks', 'date','sites'], (data) => {
  let tasksIncomplete = false;
  console.log('Data fetched from storage:', data);
  today = new Date().getDate();
  if (data.tasks && data.date !== today) {
    chrome.storage.sync.set({ tasks: null, sites:null}, () => {
      console.log('Tasks and sites removed for today', data.tasks);
    });
  }

  if (data.tasks) {
    tasksIncomplete = data.tasks.some(task => !task.completed);
    console.log('Tasks incomplete status:', tasksIncomplete);
 }

 if (tasksIncomplete) {
   console.log('Tasks are incomplete, redirecting...');
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
     if (tabs.length > 0) {
       console.log('Redirecting tab:', tabs[0].id);
       chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL('pages/options.html') });
     }
   });
 } else {
   console.log('All tasks are completed.');
 }
});
}
chrome.storage.onChanged.addListener(function (changes, namespace) {
  if (changes.sites && namespace === 'sync') {
    sites = changes.sites.newValue;
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.url.includes('options')) {
      return { cancel: false };
    }
    for (let x = 0; x < sites.length; x++) {
      if (details.url.includes(sites[x].text)) {
        return { cancel: false };
      }
    }
    if (details.type === 'main_frame') {
      checkTasksAndRedirect();
    }
    return { cancel: false };
  },
  { urls: ["<all_urls>"] }
);