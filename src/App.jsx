import React, { useState, useEffect } from 'react';

function App() {
  const [time, setTime] = useState(25 * 60);
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');

  // Effect to get timer status from background script and listen for changes
  useEffect(() => {
    // Function to handle changes from chrome.storage
    const handleStorageChange = (changes, area) => {
      if (area === 'local' && changes.timer) {
        setTime(changes.timer.newValue);
      }
    };
    
    // Initial load of the timer value
    if (chrome.storage) {
        chrome.storage.local.get(['timer'], (res) => {
          if (res.timer !== undefined) {
            setTime(res.timer);
          }
        });
    }

    // Add listener for storage changes
    if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    // Cleanup listener on component unmount
    return () => {
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        }
    };
  }, []);

  // Effect to get tasks from storage
  useEffect(() => {
    if (chrome.storage) {
      chrome.storage.local.get({ tasks: [] }, (res) => {
        setTasks(res.tasks);
      });
    }
  }, []);

  // Helper to send commands to the background script
  const sendCommand = (command) => {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ command });
    }
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // --- To-Do List Handlers ---
  const handleAddTask = () => {
    if (taskInput.trim()) {
      const newTasks = [...tasks, { text: taskInput, completed: false }];
      setTasks(newTasks);
      chrome.storage.local.set({ tasks: newTasks });
      setTaskInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const handleToggleTask = (index) => {
    const newTasks = [...tasks];
    newTasks[index].completed = !newTasks[index].completed;
    setTasks(newTasks);
    chrome.storage.local.set({ tasks: newTasks });
  };

  const handleDeleteTask = (index) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    chrome.storage.local.set({ tasks: newTasks });
  };

  return (
    <div className="container">
      <div className="timer-section">
        <div className="time-adjust-controls">
          <button onClick={() => sendCommand('decreaseTime')} className="time-adjust-btn">-</button>
          <div id="timer-display">{formatTime(time)}</div>
          <button onClick={() => sendCommand('increaseTime')} className="time-adjust-btn">+</button>
        </div>
        <div className="timer-controls">
          <button onClick={() => sendCommand('start')}>Start</button>
          <button onClick={() => sendCommand('pause')}>Pause</button>
          <button onClick={() => sendCommand('reset')}>Reset</button>
        </div>
      </div>

      <div className="todo-section">
        <h2>To-Do List</h2>
        <div className="todo-input-container">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a new task..."
          />
          <button onClick={handleAddTask}>+</button>
        </div>
        <ul id="todo-list">
          {tasks.map((task, index) => (
            <li key={index} className={task.completed ? 'completed' : ''}>
              <span onClick={() => handleToggleTask(index)}>{task.text}</span>
              <button onClick={() => handleDeleteTask(index)} className="delete-btn">×</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
