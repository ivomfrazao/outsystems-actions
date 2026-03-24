// Popup script for OutSystems Deployment Notifier

document.addEventListener('DOMContentLoaded', () => {
	// Clear badge on popup open
	chrome.runtime.sendMessage({ type: 'clearBadge' });

	// Load history
	chrome.runtime.sendMessage({ type: 'getHistory' }, (response) => {
		if (response.type === 'historyResponse') {
			displayHistory(response.payload.history);
		}
	});

	// Load preferences
	chrome.runtime.sendMessage({ type: 'getPreferences' }, (response) => {
		if (response.type === 'preferencesResponse') {
			setPreferences(response.payload);
		}
	});
});

function displayHistory(history) {
	const historyDiv = document.getElementById('history');
	historyDiv.innerHTML = '';
	if (history.length === 0) {
		historyDiv.innerHTML = '<p>No recent deployments.</p>';
		return;
	}
	history.forEach(item => {
		const div = document.createElement('div');
		div.className = 'history-item';
		div.innerHTML = `
      <strong>${item.name || 'Unknown'}</strong> (${item.environment || 'Unknown'})<br>
      ${item.status} at ${new Date(item.timestamp).toLocaleString()}<br>
      <a href="${item.url}" target="_blank">View</a>
    `;
		historyDiv.appendChild(div);
	});
}

function setPreferences(prefs) {
	document.getElementById('notifySuccess').checked = prefs.notifySuccess;
	document.getElementById('notifyWarning').checked = prefs.notifyWarning;
	document.getElementById('notifyError').checked = prefs.notifyError;
	document.getElementById('notifyIntervention').checked = prefs.notifyIntervention;

	// Add change listeners
	['notifySuccess', 'notifyWarning', 'notifyError', 'notifyIntervention'].forEach(id => {
		document.getElementById(id).addEventListener('change', updatePreferences);
	});
}

function updatePreferences() {
	const prefs = {
		notifySuccess: document.getElementById('notifySuccess').checked,
		notifyWarning: document.getElementById('notifyWarning').checked,
		notifyError: document.getElementById('notifyError').checked,
		notifyIntervention: document.getElementById('notifyIntervention').checked
	};
	chrome.runtime.sendMessage({ type: 'updatePreferences', payload: prefs });
}