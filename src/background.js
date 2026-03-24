// Background service worker for OutSystems Deployment Notifier

let activeDeployments = {}; // {tabId: {currentStatus, lastUpdate}}
let userPreferences = {
	notifySuccess: true,
	notifyWarning: true,
	notifyError: true,
	notifyIntervention: true
};

// Load preferences on start
chrome.storage.local.get(['preferences'], (result) => {
	if (result.preferences) {
		userPreferences = result.preferences;
	}
});

// Load history
let deploymentHistory = [];
chrome.storage.local.get(['history'], (result) => {
	if (result.history) {
		deploymentHistory = result.history;
	}
});

function saveHistory() {
	chrome.storage.local.set({ history: deploymentHistory });
}

function savePreferences() {
	chrome.storage.local.set({ preferences: userPreferences });
}

function addToHistory(deployment) {
	deploymentHistory.unshift(deployment);
	if (deploymentHistory.length > 5) {
		deploymentHistory = deploymentHistory.slice(0, 5);
	}
	saveHistory();
}

function updateBadge(status) {
	let text = null;
	let color = null;
	if (status === 'success') {
		text = '✓';
		color = '#00FF00';
	} else if (status === 'warning') {
		text = '!';
		color = '#FFFF00';
	} else if (status === 'error' || status === 'intervention') {
		text = '!';
		color = '#FF0000';
	}
	chrome.action.setBadgeText({ text: text });
	if (color) {
		chrome.action.setBadgeBackgroundColor({ color: color });
	}
}

function clearBadge() {
	chrome.action.setBadgeText({ text: '' });
}

function playSound(status) {
	if (userPreferences[`notify${status.charAt(0).toUpperCase() + status.slice(1)}`]) {
		const audio = new Audio(chrome.runtime.getURL('sounds/notification.wav'));
		audio.play();
	}
}

function createNotification(deployment) {
	if (!userPreferences[`notify${deployment.status.charAt(0).toUpperCase() + deployment.status.slice(1)}`]) {
		return;
	}
	const options = {
		type: 'basic',
		iconUrl: 'icons/icon48.png',
		title: `Deployment ${deployment.status}`,
		message: `${deployment.name || 'Unknown'} in ${deployment.environment || 'Unknown'} at ${new Date(deployment.timestamp).toLocaleTimeString()}`,
		requireInteraction: false
	};
	chrome.notifications.create(`deployment-${deployment.id}`, options);
}

// Handle deployment update
function handleDeploymentUpdate(message, sender) {
	const tabId = sender.tab.id;
	const payload = message.payload;
	payload.tabId = tabId;
	payload.timestamp = Date.now();
	payload.id = `${payload.timestamp}-${tabId}`;

	const current = activeDeployments[tabId];
	if (!current || current.currentStatus !== payload.status) {
		activeDeployments[tabId] = {
			currentStatus: payload.status,
			lastUpdate: payload.timestamp
		};

		if (payload.status !== 'in_progress' && current && current.currentStatus === 'in_progress') {
			// Transition to final state
			updateBadge(payload.status);
			playSound(payload.status);
			createNotification(payload);
			addToHistory({
				id: payload.id,
				type: payload.deploymentType,
				name: payload.name,
				environment: payload.environment,
				status: payload.status,
				timestamp: payload.timestamp,
				url: payload.url
			});
		}
	}
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'deploymentUpdate') {
		handleDeploymentUpdate(message, sender);
	} else if (message.type === 'getHistory') {
		sendResponse({ type: 'historyResponse', payload: { history: deploymentHistory } });
	} else if (message.type === 'getPreferences') {
		sendResponse({ type: 'preferencesResponse', payload: userPreferences });
	} else if (message.type === 'updatePreferences') {
		userPreferences = message.payload;
		savePreferences();
		sendResponse({ type: 'preferencesUpdated' });
	} else if (message.type === 'clearBadge') {
		clearBadge();
	}
});

// Notification click
chrome.notifications.onClicked.addListener((notificationId) => {
	if (notificationId.startsWith('deployment-')) {
		const id = notificationId.split('-')[1];
		// Find tabId from history or active
		const entry = deploymentHistory.find(h => h.id === id);
		if (entry) {
			chrome.tabs.query({ url: entry.url }, (tabs) => {
				if (tabs.length > 0) {
					chrome.tabs.update(tabs[0].id, { active: true });
				}
			});
		}
		clearBadge();
	}
	chrome.notifications.clear(notificationId);
});