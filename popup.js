document.getElementById('startChat').addEventListener('click', showChat);
document.getElementById('send-button').addEventListener('click', () => {converse(document.getElementById('user-input').value, true)});
document.getElementById('fill-button').addEventListener('click', () => {inputFill()});

function converse(userInput, display = false) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    if (url.startsWith('chrome://')) {
      console.error('Cannot interact with chrome:// URLs');
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script injection failed: ' + chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getTextContent' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending failed: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.text) {
          const textContent = response.text;
          document.getElementById('user-input').value = 'Loading';
          document.getElementById('user-input').disabled = true;
          if (display){
            addMessage('User', userInput);
          }
          getChatGPTResponse(userInput, textContent);
          document.getElementById('user-input').value = '';
          document.getElementById('user-input').disabled = false;
        } else {
          console.error('Failed to retrieve text content or response is undefined');
        }
      });
    });
  });
}
function showChat() {
  document.getElementById('chat').removeAttribute("hidden");
  document.getElementById('send-button').removeAttribute("hidden");
  document.getElementById('startChat').setAttribute("hidden", true);
  summary = "Create a simplified summary of the page content. Mention the key points and the main idea of the page with an emoji for each. Finally, tell the user you are open to questions"
  document.getElementById('user-input').value = 'Loading';
  document.getElementById('user-input').disabled = true;
  converse(summary);
  document.getElementById('user-input').value = '';
  document.getElementById('user-input').disabled = false;
}
function marked(text) {
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  text = text.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
  text = text.replace(/\*(.*)\*/gim, '<i>$1</i>');

  // Convert unordered and ordered list items
  text = text.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
  text = text.replace(/^\d+\.\s(.*$)/gim, '<li>$1</li>');

  text = text.replace(/\n/gim, '<br>');

  // Remove extra <ul> and <ol> tags
  text = text.replace(/<\/ul>\n<ul>/gim, '');
  text = text.replace(/<\/ol>\n<ol>/gim, '');

  // Wrap ordered list items in <ol> tags
  text = text.replace(/(<li>.*<\/li>)/gim, '<ol>$1</ol>');

  // Remove extra <ol> tags
  text = text.replace(/<ol><\/ol>/gim, '');

  return text.trim();
}
function addMessage(sender, message) {
  const chatbox = document.getElementById('chatbox');
  const messageElement = document.createElement('div');
  messageElement.innerHTML = marked(message);
  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}
async function getChatGPTResponse(userInput, textContent) {
  let retries = 5;
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  while (retries > 0) {
    try {
      console.log('Sending request to OpenAI:', { userInput, textContent });
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer '
        },
        body: JSON.stringify({
          model: 'chatgpt-4o-latest',
          messages: [
            { role: 'system', content: 'You are an assistant that processes web page content.' },
            { role: 'user', content: `User input: ${userInput}` },
            { role: 'user', content: `Page text content: ${textContent}` }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited. Retrying in ' + (1000 * Math.pow(2, 5 - retries)) + 'ms');
          retries -= 1;
          await delay(1000 * Math.pow(2, 5 - retries));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.choices && data.choices.length > 0) {
        const chatGPTMessage = data.choices[0].message.content.trim();
        addMessage('ChatGPT', chatGPTMessage);
      } else {
        addMessage('ChatGPT', 'Sorry, I did not understand that.');
      }
      break;
    } catch (error) {
      console.error('Error fetching ChatGPT response:', error);
      addMessage('ChatGPT', 'Sorry, something went wrong.');
      break;
    }
  }
}

function inputFill(elementId = "first_name", message = "Your name here") {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    if (url.startsWith('chrome://')) {
      console.error('Cannot interact with chrome:// URLs');
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('Script injection failed: ' + chrome.runtime.lastError.message);
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSiteHTML' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message sending failed: ' + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.html) {
          console.log('HTML Content:', response.html);
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (elementId, message) => {
              console.log('Filling input with ID:', elementId);
              const element = document.getElementById(elementId);
              if (element) {
                console.log(`Filling input with ID ${elementId} with message: ${message}`);
                element.innerHTML = message;
              } else {
                console.error(`Element with ID ${elementId} not found.`);
              }
            },
            args: [elementId, message]
          });
        } else {
          console.error('Failed to retrieve HTML content or response is undefined');
        }
      });
    });
  });
}
