// Content script for OutSystems Deployment Notifier
// Detects deployment statuses on Service Center and LifeTime pages

let currentStatus = null;
let deploymentType = null;
let deploymentName = null;
let environment = null;

function detectDeploymentType() {
	const url = window.location.href;
	if (url.includes('eSpace_Publish.aspx')) {
		deploymentType = 'eSpace';
	} else if (url.includes('Solution_Publish.aspx')) {
		deploymentType = 'Solution';
	} else if (url.includes('LifeTime')) {
		deploymentType = 'LifeTimeDeployment';
	}
}

function extractMetadata() {
	// Extract name and environment from page
	// Assumptions: name from title or specific elements
	const title = document.title;
	deploymentName = title.split(' - ')[0] || null; // Simple extraction

	// Environment: look for common patterns
	const envMatch = title.match(/ - (\w+) - /);
	environment = envMatch ? envMatch[1] : null;
}

function detectStatus() {
	const bodyText = document.body.innerText.toLowerCase();

	if (bodyText.includes('publishing') || bodyText.includes('deploying') || bodyText.includes('running deployment plan')) {
		return 'in_progress';
	} else if (bodyText.includes('published successfully') || bodyText.includes('completed successfully')) {
		return 'success';
	} else if (bodyText.includes('published with warnings') || bodyText.includes('completed with warnings')) {
		return 'warning';
	} else if (bodyText.includes('compilation error') || bodyText.includes('completed with errors') || bodyText.includes('aborted')) {
		return 'error';
	} else if (bodyText.includes('waiting for user input') || bodyText.includes('conflict detected') || bodyText.includes('merge required') || bodyText.includes('approval pending')) {
		return 'intervention';
	}
	return null; // No status detected
}

function checkForUpdates() {
	const status = detectStatus();
	if (status && status !== currentStatus) {
		currentStatus = status;
		extractMetadata();
		chrome.runtime.sendMessage({
			type: 'deploymentUpdate',
			payload: {
				status: status,
				name: deploymentName,
				environment: environment,
				deploymentType: deploymentType,
				url: window.location.href,
				tabId: null // Will be set by background
			}
		});
	}
}

// Initialize
detectDeploymentType();
extractMetadata();

// Poll every 2 seconds
setInterval(checkForUpdates, 2000);