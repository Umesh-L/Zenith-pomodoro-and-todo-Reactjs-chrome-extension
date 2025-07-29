const DEFAULT_WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

// Initialize state from storage or set defaults on install or startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timer: DEFAULT_WORK_MINUTES * 60,
    isRunning: false,
    isWorkSession: true,
    workMinutes: DEFAULT_WORK_MINUTES,
  });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['timer', 'isRunning', 'isWorkSession', 'workMinutes'], (res) => {
        const workMinutes = res.workMinutes || DEFAULT_WORK_MINUTES;
        chrome.storage.local.set({
            timer: res.timer || workMinutes * 60,
            isRunning: res.isRunning || false,
            isWorkSession: typeof res.isWorkSession !== 'undefined' ? res.isWorkSession : true,
            workMinutes: workMinutes,
        });
    });
});

// Listen for commands from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.command) {
        case 'start':
            startTimer();
            break;
        case 'pause':
            pauseTimer();
            break;
        case 'reset':
            resetTimer();
            break;
        case 'increaseTime':
            adjustTime(1); // Increase by 1 minute
            break;
        case 'decreaseTime':
            adjustTime(-1); // Decrease by 1 minute
            break;
    }
});

// Alarm listener to decrement the timer
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoroTimer') {
        chrome.storage.local.get(['timer', 'isWorkSession', 'workMinutes'], (res) => {
            if (res.timer > 0) {
                chrome.storage.local.set({ timer: res.timer - 1 });
            } else {
                // Timer finished, switch session type
                const newIsWorkSession = !res.isWorkSession;
                const newTimer = (newIsWorkSession ? res.workMinutes : BREAK_MINUTES) * 60;
                chrome.storage.local.set({
                    timer: newTimer,
                    isRunning: false,
                    isWorkSession: newIsWorkSession
                }, () => {
                    chrome.alarms.clear('pomodoroTimer');
                    showNotification(newIsWorkSession, res.workMinutes);
                });
            }
        });
    }
});

function startTimer() {
    chrome.storage.local.set({ isRunning: true });
    chrome.alarms.create('pomodoroTimer', { periodInMinutes: 1 / 60 });
}

function pauseTimer() {
    chrome.storage.local.set({ isRunning: false });
    chrome.alarms.clear('pomodoroTimer');
}

function resetTimer() {
    chrome.storage.local.get(['workMinutes'], (res) => {
        chrome.storage.local.set({
            timer: (res.workMinutes || DEFAULT_WORK_MINUTES) * 60,
            isRunning: false,
            isWorkSession: true // Always reset to a work session
        });
        chrome.alarms.clear('pomodoroTimer');
    });
}

function adjustTime(minutes) {
    chrome.storage.local.get(['isRunning', 'workMinutes'], (res) => {
        // Only allow time adjustment when the timer is not running.
        if (!res.isRunning) {
            let newWorkMinutes = (res.workMinutes || DEFAULT_WORK_MINUTES) + minutes;
            if (newWorkMinutes < 5) newWorkMinutes = 5; // Minimum 5 minutes
            if (newWorkMinutes > 60) newWorkMinutes = 60; // Maximum 60 minutes
            
            chrome.storage.local.set({
                workMinutes: newWorkMinutes,
                timer: newWorkMinutes * 60,
                isWorkSession: true // Assume user wants to see the work time they are editing
            });
        }
    });
}

function showNotification(isWorkSession, workMinutes) {
    const title = isWorkSession ? 'Time for a break!' : 'Time to focus!';
    const message = isWorkSession
        ? `Great work! Your ${BREAK_MINUTES}-minute break starts now.`
        : `Break's over! Your ${workMinutes}-minute focus session starts now.`;

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
    });
}
