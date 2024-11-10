const taskList = document.getElementById("task-list");
const taskForm = document.getElementById("task-form");
const newTaskInput = document.getElementById("new-task");
const AIPlannerInput = document.getElementById("ai-input");
const AIPlannerForm = document.getElementById("generate-tasks");

taskForm.addEventListener("submit", function (e) {
  e.preventDefault();
  
  const taskText = newTaskInput.value;
  addTask(taskText);

  newTaskInput.value = "";
});

function handleGeneratedTasks(response) {
  const tasks = response.split('\n').map(task => task.trim()).filter(task => task.length > 0);

  tasks.forEach(task => addTask(task));
}
function handleGeneratedWebsites(response) {
  const sitesList = response.split('\n').map(task => task.trim()).filter(task => task.length > 0);
  const sites = [];
  sitesList.forEach(item => {
    console.log(item);
    sites.push({
      text: item,
      completed: false
    });
  });
  chrome.storage.sync.set({ sites: sites }, function () {
  });
}

AIPlannerForm.addEventListener("click", async function (e) {
  e.preventDefault();

  const taskText = AIPlannerInput.value.trim();
  if (taskText) {
    let response = await getChatGPTResponse(`Here are my goals for today:\n${taskText}\n\nPlease break these goals into specific tasks.`);
    if (response !== "error") {
      handleGeneratedTasks(response);
    }
    response = await getChatGPTResponseWebsites(`Here are my goals for today:\n${taskText}\n\nPlease provide applicable sites or keywords to whitelist.`);
    if (response !== "error") {
      handleGeneratedWebsites(response);
    }
  }

  AIPlannerInput.value = "";
});


function addTask(taskText, completed = false) {
  const taskItem = document.createElement("li");
  taskItem.className = "task-item";
  
  if (completed) {
    taskItem.classList.add('completed');
  }

  const taskCheckbox = document.createElement("input");
  taskCheckbox.type = "checkbox";
  taskCheckbox.className = "form-check-input";
  if (completed) {
    taskCheckbox.checked = true;
  }
  taskCheckbox.addEventListener("change", function () {
    taskItem.classList.toggle("completed");
    saveTasks();
    checkTasks();
  });

  const taskContent = document.createElement("span");
  taskContent.textContent = taskText;
  taskContent.className = "task-content";

  const trashCan = document.createElement("span");
  trashCan.textContent = "🗑️";
  trashCan.className = "trash-can";
  
  trashCan.addEventListener("click", function () {
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (confirmDelete) {
      taskItem.remove();
      saveTasks();
    }
  });

  const twoElements = document.createElement("span");
  twoElements.appendChild(taskCheckbox);
  twoElements.appendChild(taskContent);

  taskItem.appendChild(twoElements);
  taskItem.appendChild(trashCan);
  taskList.appendChild(taskItem);
  saveTasks();
}

function saveTasks() {
  const tasks = [];
  const taskItems = document.querySelectorAll('.task-item');
  
  taskItems.forEach(item => {
    tasks.push({
      text: item.querySelector('.task-content').textContent,
      completed: item.classList.contains('completed')
    });
  });

  chrome.storage.sync.set({ tasks: tasks }, function () {});
}

function checkTasks() {
  const taskItems = document.querySelectorAll('.task-item');
  const allCompleted = Array.from(taskItems).every(item => item.classList.contains('completed'));
  if (allCompleted) {
    chrome.storage.sync.get(['date', 'streak'], function (data) {
      const today = new Date().getDate();
      const lastDate = data.date || 0;
      let streak = data.streak || 0;
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
  chrome.storage.sync.get(['tasks','date'], function (data) {
    if (data.tasks && data.date != new Date().getDate()) {
      data.tasks.forEach(task => {
        if (task.completed) task.completed = false;
      });
      chrome.storage.sync.set({ tasks: data.tasks }, function() {
        loadTasks();
      });
    } else {
      loadTasks(); 
    }
  });
}

function loadTasks() {
  chrome.storage.sync.get(['tasks', 'streak', 'date'], function (data) {
    if (data.tasks) {
      data.tasks.forEach(task => addTask(task.text, task.completed));
    }
    let number = 0;
    if (data.streak) {
      number = data.streak + "🔥";
    }
    document.getElementById("current-streak").textContent = "Current Streak: " + number;
  });
}

document.addEventListener('DOMContentLoaded', function () {
  uncheckBoxes();
});

async function getChatGPTResponse(userInput) {
    try {
      console.log('Sending request to OpenAI:', { userInput});
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '

        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          messages: [
            { role: 'system', content: 'You are an AI planner. Please generate a list of daily tasks based on the goals I provide. Each task should be clear, actionable, and separated by a line break. Do not include any headers, numbers, or extra text. Just return the tasks. Please break these goals into smaller, specific tasks and return them as plain text, with each task on a new line. Use less than 10 lines'},
            { role: 'user', content: `User input: ${userInput}`},
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited. Retrying in ' + (1000 * Math.pow(2, 5 - retries)) + 'ms');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.choices && data.choices.length > 0) {
        const chatGPTMessage = data.choices[0].message.content.trim();
        return chatGPTMessage;
      } else {
        console.log("SOMETHING DID NOT WORK")
        return "error";
      }
    } catch (error) {
      console.error('Error fetching ChatGPT response:', error);
      return "error";
    }
  }

  async function getChatGPTResponseWebsites(userInput) {
    try {
      console.log('Sending request to OpenAI:', { userInput});
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '

        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          messages: [
            { role: 'system', content: 'You are an AI planner. Please generate a list of sites or keywords that should be whitelisted based on the goals I provide. Each site simply be the websites name such as "google" without the quotations. Do not include any headers, numbers, or extra text. Just return the sites. Please return them as plain text, with each white on a new line. Use less than 10 lines'},
            { role: 'user', content: `User input: ${userInput}`},
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited. Retrying in ' + (1000 * Math.pow(2, 5 - retries)) + 'ms');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.choices && data.choices.length > 0) {
        const chatGPTMessage = data.choices[0].message.content.trim();
        return chatGPTMessage;
      } else {
        console.log("SOMETHING DID NOT WORK")
        return "error";
      }
    } catch (error) {
      console.error('Error fetching ChatGPT response:', error);
      return "error";
    }
  }